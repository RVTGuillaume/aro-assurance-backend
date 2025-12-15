/**
 * Controller Déclarations Assurés - VERSION POSTGRESQL ✅
 */

import pool from '../config/database.js';
import emailService from '../services/email.service.js';

class AssureDeclarationController {

  /**
   * CRÉER UNE NOUVELLE DÉCLARATION
   */
  static async createDeclaration(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const assure_id = req.user.id;
      const {
        type_sinistre,
        date_sinistre,
        lieu_sinistre,
        description,
        montant_estime,
        personne_soignee_nom,
        etablissement_soins
      } = req.body;

      console.log('\n🆕 CRÉATION NOUVELLE DÉCLARATION');
      console.log('👤 Assuré ID:', assure_id);
      console.log('📋 Type:', type_sinistre);

      // Générer le numéro
      const countResult = await client.query(
        'SELECT COUNT(*) as total FROM aro_assurance_db.declarations'
      );
      const numero = `DEC-${Date.now()}-${parseInt(countResult.rows[0].total) + 1}`;

      // Insérer
      const result = await client.query(
        `INSERT INTO aro_assurance_db.declarations (
          numero_declaration,
          assure_id,
          type_sinistre,
          date_sinistre,
          lieu_sinistre,
          description,
          montant_estime,
          personne_soignee_nom,
          etablissement_soins,
          statut_declaration,
          date_declaration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING id`,
        [
          numero,
          assure_id,
          type_sinistre,
          date_sinistre,
          lieu_sinistre,
          description,
          montant_estime || null,
          personne_soignee_nom || null,
          etablissement_soins || null,
          'en_attente'
        ]
      );

      const declaration_id = result.rows[0].id;

      // Récupérer infos assuré
      const assureResult = await client.query(
        'SELECT nom_complet, email, numero_dossier FROM aro_assurance_db.assures WHERE id = $1',
        [assure_id]
      );

      // Log audit
      await client.query(
        `INSERT INTO aro_assurance_db.audit_logs (
          acteur_type, acteur_id, action, table_affectee, 
          enregistrement_id, resultat, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'assure',
          assure_id,
          'CREATE_DECLARATION',
          'declarations',
          declaration_id,
          'succes',
          req.ip,
          req.get('user-agent')
        ]
      );

      await client.query('COMMIT');

      console.log('✅ Déclaration créée:', numero);

      // EMAIL (optionnel)
      if (assureResult.rows[0].email) {
        try {
          await emailService.envoyerConfirmationDeclaration({
            nom_complet: assureResult.rows[0].nom_complet,
            email: assureResult.rows[0].email,
            numero_declaration: numero,
            type_sinistre,
            date_sinistre
          });
          console.log('✅ Email de confirmation envoyé');
        } catch (emailError) {
          console.error('⚠️ Erreur envoi email:', emailError.message);
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Déclaration créée avec succès',
        data: {
          id: declaration_id,
          numero_declaration: numero
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Erreur création déclaration:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création'
      });
    } finally {
      client.release();
    }
  }

  /**
   * LISTER MES DÉCLARATIONS
   */
  static async getMyDeclarations(req, res) {
    try {
      const assure_id = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const result = await pool.query(
        `SELECT 
          id,
          numero_declaration,
          type_sinistre,
          statut_declaration as statut,
          date_declaration,
          date_sinistre,
          lieu_sinistre,
          description,
          montant_estime,
          date_traitement,
          motif_rejet
        FROM aro_assurance_db.declarations
        WHERE assure_id = $1
        ORDER BY date_declaration DESC
        LIMIT $2 OFFSET $3`,
        [assure_id, limit, offset]
      );

      const countResult = await pool.query(
        'SELECT COUNT(*) as total FROM aro_assurance_db.declarations WHERE assure_id = $1',
        [assure_id]
      );

      return res.status(200).json({
        success: true,
        data: result.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
        }
      });

    } catch (error) {
      console.error('❌ Erreur récupération déclarations:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }

  /**
   * DÉTAILS D'UNE DÉCLARATION
   */
  static async getDeclarationDetails(req, res) {
    try {
      const { id } = req.params;
      const assure_id = req.user.id;

      const declarationResult = await pool.query(
        `SELECT * FROM aro_assurance_db.declarations 
         WHERE id = $1 AND assure_id = $2`,
        [id, assure_id]
      );

      if (declarationResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Déclaration introuvable'
        });
      }

      const fichiersResult = await pool.query(
        'SELECT * FROM aro_assurance_db.pieces_jointes WHERE declaration_id = $1',
        [id]
      );

      const declaration = {
        ...declarationResult.rows[0],
        fichiers: fichiersResult.rows
      };

      return res.status(200).json({
        success: true,
        data: declaration
      });

    } catch (error) {
      console.error('❌ Erreur récupération détails:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }
}

export default AssureDeclarationController;
