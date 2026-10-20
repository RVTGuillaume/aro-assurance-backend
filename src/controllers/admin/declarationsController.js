/**
 * Contrôleur ADMIN des déclarations - VERSION POSTGRESQL ✅
 */

import pool from '../../config/database.js';
import { envoyerNotificationStatut } from '../../services/emailService.js';

class AdminDeclarationsController {
  /**
   * Récupérer toutes les déclarations (ADMIN)
   */
  static async getAllDeclarations(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const statut = req.query.statut || null;
      const type_sinistre = req.query.type_sinistre || null;
      const search = req.query.search || null;

      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (statut) {
        whereClause += ` AND d.statut_declaration = $${paramIndex}`;
        params.push(statut);
        paramIndex++;
      }

      if (type_sinistre) {
        whereClause += ` AND d.type_sinistre = $${paramIndex}`;
        params.push(type_sinistre);
        paramIndex++;
      }

      if (search) {
        whereClause += ` AND (d.numero_declaration ILIKE $${paramIndex} OR a.nom_complet ILIKE $${paramIndex + 1})`;
        params.push(`%${search}%`, `%${search}%`);
        paramIndex += 2;
      }

      const query = `
        SELECT 
          d.id,
          d.numero_declaration,
          d.type_sinistre,
          d.statut_declaration as statut,
          d.date_declaration,
          d.date_traitement,
          d.personne_soignee_nom,
          a.nom_complet as assure_nom,
          a.email as assure_email,
          a.numero_dossier,
          a.numero_police
        FROM aro_assurance_db.declarations d
        JOIN aro_assurance_db.assures a ON d.assure_id = a.id
        ${whereClause}
        ORDER BY d.date_declaration DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);
      const result = await pool.query(query, params);

      // Compter le total
      let countQuery = 'SELECT COUNT(*) as total FROM aro_assurance_db.declarations d JOIN aro_assurance_db.assures a ON d.assure_id = a.id ' + whereClause;
      const countParams = params.slice(0, -2);
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return res.status(200).json({
        success: true,
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('❌ Erreur getAllDeclarations:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }

  /**
   * Récupérer les détails d'une déclaration (ADMIN)
   */
  static async getDeclarationDetails(req, res) {
    try {
      const { id } = req.params;

      console.log(`\n🔍 [ADMIN] Récupération détails déclaration ${id}...`);

      // 1. Récupérer la déclaration
      const declarationResult = await pool.query(
        `SELECT 
          d.*,
          d.statut_declaration as statut,
          d.type_sinistre,
          d.accident_circonstances as description,
          d.maladie_designation,
          d.hospitalisation_description,
          d.date_declaration as date_sinistre,
          a.nom_complet as assure_nom,
          a.email as assure_email,
          a.telephone as assure_telephone,
          a.numero_dossier,
          a.numero_police,
          a.type_personne as type_assure
         FROM aro_assurance_db.declarations d
         JOIN aro_assurance_db.assures a ON d.assure_id = a.id
         WHERE d.id = $1`,
        [id]
      );

      if (declarationResult.rowCount === 0) {
        console.log('❌ [ADMIN] Déclaration introuvable');
        return res.status(404).json({
          success: false,
          message: 'Déclaration introuvable'
        });
      }

      const declaration = declarationResult.rows[0];
      console.log('✅ [ADMIN] Déclaration trouvée:', declaration.numero_declaration);

      // 2. Récupérer les fichiers
      const fichiersResult = await pool.query(
        `SELECT 
          id,
          declaration_id,
          nom_original,
          nom_stockage,
          chemin_fichier,
          type_mime as type_fichier,
          taille_octets,
          source_fichier,
          date_upload as created_at
         FROM aro_assurance_db.declaration_fichiers
         WHERE declaration_id = $1
         ORDER BY 
           CASE source_fichier 
             WHEN 'original' THEN 1 
             WHEN 'complement' THEN 2 
             ELSE 3 
           END,
           date_upload ASC`,
        [id]
      );

      const fichiers = fichiersResult.rows;

      console.log(`📁 [ADMIN] ${fichiers.length} fichier(s) trouvé(s)`);
      
      if (fichiers.length > 0) {
        const originaux = fichiers.filter(f => f.source_fichier === 'original');
        const complements = fichiers.filter(f => f.source_fichier === 'complement');
        
        console.log(`   → Originaux: ${originaux.length}`);
        console.log(`   → Compléments: ${complements.length}`);
        
        fichiers.forEach((f, i) => {
          console.log(`   ${i + 1}. ${f.nom_original} (${f.source_fichier})`);
        });
      }

      declaration.fichiers = fichiers;
      declaration.nombre_fichiers = fichiers.length;
      declaration.stats_fichiers = {
        originaux: fichiers.filter(f => f.source_fichier === 'original').length,
        complements: fichiers.filter(f => f.source_fichier === 'complement').length,
        total: fichiers.length
      };

      return res.status(200).json({
        success: true,
        data: declaration
      });

    } catch (error) {
      console.error('❌ [ADMIN] Erreur getDeclarationDetails:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  }

  /**
   * METTRE À JOUR LE STATUT + ENVOYER EMAIL
   */
  static async updateDeclarationStatut(req, res) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { id } = req.params;
      const { statut, commentaire, notify_email } = req.body;
      const admin_id = req.user.id;

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📝 MISE À JOUR STATUT DÉCLARATION');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🆔 ID Déclaration:', id);
      console.log('📊 Nouveau statut:', statut);
      console.log('💬 Commentaire:', commentaire || 'Aucun');
      console.log('📧 Notifier par email:', notify_email ? 'OUI ✅' : 'NON ❌');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Récupérer la déclaration
      const declarationResult = await client.query(
        `SELECT 
          d.*,
          d.statut_declaration as ancien_statut,
          a.nom_complet as assure_nom,
          a.email as assure_email
         FROM aro_assurance_db.declarations d
         JOIN aro_assurance_db.assures a ON d.assure_id = a.id
         WHERE d.id = $1`,
        [id]
      );

      if (declarationResult.rowCount === 0) {
        await client.query('ROLLBACK');
        console.error('❌ Déclaration introuvable');
        return res.status(404).json({
          success: false,
          message: 'Déclaration introuvable'
        });
      }

      const declaration = declarationResult.rows[0];
      console.log('✅ Déclaration trouvée');
      console.log('   → Numéro:', declaration.numero_declaration);
      console.log('   → Assuré:', declaration.assure_nom);
      console.log('   → Email:', declaration.assure_email || '❌ PAS D\'EMAIL');
      console.log('   → Ancien statut:', declaration.ancien_statut);

      // Mettre à jour le statut
      await client.query(
        `UPDATE aro_assurance_db.declarations 
         SET statut_declaration = $1,
             motif_rejet = $2,
             date_traitement = NOW(),
             traite_par = $3
         WHERE id = $4`,
        [statut, commentaire || null, admin_id, id]
      );

      console.log('✅ Statut mis à jour en base de données\n');

      // Envoyer l'email si demandé
      if (notify_email !== false || ['validee', 'refusee', 'complements_requis'].includes(statut)) {
        console.log('📧 ENVOI EMAIL DEMANDÉ...');

        if (!declaration.assure_email) {
          console.warn('⚠️  IMPOSSIBLE : Pas d\'email pour cet assuré');
        } else {
          try {
            // ✅ CORRECTION ICI : On envoie les 5 paramètres séparés
            const emailResult = await envoyerNotificationStatut(
              declaration.assure_email,
              declaration.numero_declaration || `DEC-${id}`,
              declaration.ancien_statut,
              statut,
              commentaire
            );

            if (emailResult.success) {
              console.log('✅ EMAIL ENVOYÉ AVEC SUCCÈS !');
              console.log('   → Message ID:', emailResult.messageId);
            } else {
              console.warn('⚠️  EMAIL NON ENVOYÉ:', emailResult.message || emailResult.error);
            }
          } catch (emailError) {
            console.error('❌ ERREUR ENVOI EMAIL:', emailError.message);
          }
        }
      } else {
        console.log('ℹ️  Email non demandé (notify_email = false)');
      }

      // Log audit
      await client.query(
        `INSERT INTO aro_assurance_db.audit_logs (acteur_type, acteur_id, action, table_affectee, enregistrement_id, resultat, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['admin', admin_id, 'UPDATE_DECLARATION_STATUT', 'declarations', id, 'succes', req.ip, req.get('user-agent')]
      );

      await client.query('COMMIT');

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ MISE À JOUR TERMINÉE AVEC SUCCÈS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return res.status(200).json({
        success: true,
        message: `Déclaration mise à jour${notify_email ? ' et email envoyé' : ''}`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ ERREUR MISE À JOUR DÉCLARATION');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la mise à jour'
      });
    } finally {
      client.release();
    }
  }
}

export default AdminDeclarationsController;