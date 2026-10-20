/**
 * Contrôleur Admin COMPLET - VERSION POSTGRESQL ✅
 * ARO Assurance Madagascar
 */

import pool from '../config/database.js';
import { envoyerNotificationStatut } from '../services/emailService.js';

class AdminController {
  /**
   * Lister toutes les déclarations avec filtres
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

      if (statut && statut !== '') {
        whereClause += ` AND d.statut_declaration = $${paramIndex}`;
        params.push(statut);
        paramIndex++;
      }

      if (type_sinistre && type_sinistre !== '') {
        whereClause += ` AND d.type_sinistre = $${paramIndex}`;
        params.push(type_sinistre);
        paramIndex++;
      }

      if (search && search !== '') {
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
          d.personne_soignee_nom,
          d.personne_soignee_age,
          a.nom_complet as assure_nom,
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

      const countParams = params.slice(0, -2);
      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM aro_assurance_db.declarations d 
         JOIN aro_assurance_db.assures a ON d.assure_id = a.id
         ${whereClause}`,
        countParams
      );

      return res.status(200).json({
        success: true,
        message: `${result.rowCount} déclaration(s)`,
        data: result.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
        }
      });
    } catch (error) {
      console.error('❌ Erreur getAllDeclarations:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des déclarations'
      });
    }
  }

  /**
   * ✅ Détails COMPLETS d'une déclaration AVEC FICHIERS
   */
  static async getDeclarationDetails(req, res) {
    try {
      const { id } = req.params;
      
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('🔍 [ADMIN] RÉCUPÉRATION DÉCLARATION COMPLÈTE + FICHIERS');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`🆔 ID: ${id}\n`);

      // 1. Déclaration complète
      const declarationResult = await pool.query(
        `SELECT d.*, 
                a.nom_complet as assure_nom,
                a.numero_dossier,
                a.numero_police,
                a.email as assure_email,
                a.telephone as assure_telephone,
                a.adresse as assure_adresse,
                a.date_naissance as assure_date_naissance,
                a.type_assure
         FROM aro_assurance_db.declarations d
         JOIN aro_assurance_db.assures a ON d.assure_id = a.id
         WHERE d.id = $1`,
        [id]
      );

      if (declarationResult.rowCount === 0) {
        console.log('❌ Déclaration introuvable\n');
        return res.status(404).json({
          success: false,
          message: 'Déclaration non trouvée'
        });
      }

      const declaration = declarationResult.rows[0];
      console.log(`✅ Déclaration: ${declaration.numero_declaration}`);
      console.log(`   Type: ${declaration.type_sinistre}`);
      console.log(`   Statut: ${declaration.statut_declaration}`);

      // ✅ 2. FICHIERS depuis declaration_fichiers
      console.log('\n📁 Récupération fichiers depuis declaration_fichiers...');
      
      const fichiersResult = await pool.query(
        `SELECT 
          id,
          declaration_id,
          type_sinistre,
          nom_original,
          nom_stockage,
          chemin_fichier,
          type_mime as type_fichier,
          taille_octets,
          source_fichier,
          date_upload as created_at,
          statut as statut_upload
        FROM aro_assurance_db.declaration_fichiers
        WHERE declaration_id = $1
        ORDER BY
          CASE source_fichier
            WHEN 'original' THEN 1
            WHEN 'declaration' THEN 2
            WHEN 'complement' THEN 3
            ELSE 4
          END,
          date_upload ASC`,
        [id]
      );

      const fichiers = fichiersResult.rows;
      console.log(`📊 Résultat: ${fichiers.length} fichier(s)`);

      // Ajouter les URLs
      const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
      const fichiersAvecUrl = fichiers.map(fichier => ({
        ...fichier,
        url_download: `${BASE_URL}/uploads/declarations/${fichier.nom_stockage}`,
        url_preview: `${BASE_URL}/uploads/declarations/${fichier.nom_stockage}`,
        taille_lisible: formatFileSize(fichier.taille_octets)
      }));

      // Statistiques
      if (fichiers.length > 0) {
        const originaux = fichiers.filter(f => 
          f.source_fichier === 'original' || f.source_fichier === 'declaration'
        ).length;
        const complements = fichiers.filter(f => 
          f.source_fichier === 'complement'
        ).length;

        console.log('\n┌──────────────────────────────────────┐');
        console.log(`│ ✅ Originaux    : ${originaux.toString().padEnd(19)}│`);
        console.log(`│ ✅ Compléments  : ${complements.toString().padEnd(19)}│`);
        console.log(`│ 📦 TOTAL        : ${fichiers.length.toString().padEnd(19)}│`);
        console.log('└──────────────────────────────────────┘\n');

        declaration.stats_fichiers = {
          originaux,
          complements,
          total: fichiers.length
        };
      } else {
        console.log('⚠️  AUCUN FICHIER TROUVÉ !');
        declaration.stats_fichiers = {
          originaux: 0,
          complements: 0,
          total: 0
        };
      }

      // ✅ 3. HISTORIQUE (optionnel)
      let historique = [];
      try {
        const historiqueResult = await pool.query(
          `SELECT 
            h.id,
            h.action,
            h.ancien_statut,
            h.nouveau_statut,
            h.commentaire,
            h.date_creation as created_at,
            adm.nom_complet as admin_nom,
            adm.email as admin_email
           FROM aro_assurance_db.historique_declarations h
           LEFT JOIN aro_assurance_db.administrateurs adm ON h.admin_id = adm.id
           WHERE h.declaration_id = $1
           ORDER BY h.date_creation DESC`,
          [id]
        );
        historique = historiqueResult.rows;
        console.log(`📜 Historique: ${historique.length} entrée(s)`);
      } catch (err) {
        console.log('ℹ️  Table historique_declarations absente');
      }

      declaration.fichiers = fichiersAvecUrl;
      declaration.nombre_fichiers = fichiers.length;
      declaration.historique = historique;

      console.log('\n═══════════════════════════════════════════════════════');
      console.log(`✅ RETOUR ${fichiers.length} FICHIERS`);
      console.log('═══════════════════════════════════════════════════════\n');

      return res.status(200).json({
        success: true,
        data: declaration
      });
    } catch (error) {
      console.error('\n❌❌❌ ERREUR getDeclarationDetails ❌❌❌');
      console.error('Message:', error.message);
      console.error('Stack:', error.stack, '\n');
      
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des détails'
      });
    }
  }

  /**
   * Changer statut avec ENREGISTREMENT dans HISTORIQUE
   */
  static async updateDeclarationStatut(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { id } = req.params;
      const admin_id = req.user.id;
      const { statut, commentaire, notify_email } = req.body;

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📝 MISE À JOUR STATUT DÉCLARATION');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🆔 ID Déclaration:', id);
      console.log('📊 Nouveau statut:', statut);
      console.log('💬 Commentaire:', commentaire || 'Aucun');
      console.log('📧 Notifier par email:', notify_email ? 'OUI ✅' : 'NON ❌');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const statutsValides = ['en_attente', 'en_traitement', 'validee', 'refusee', 'complements_requis'];
      
      if (!statutsValides.includes(statut)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Statut invalide'
        });
      }

      // Récupérer la déclaration avec infos assuré
      const declarationResult = await client.query(
        `SELECT 
          d.id,
          d.statut_declaration as ancien_statut,
          d.numero_declaration,
          d.type_sinistre,
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
          message: 'Déclaration non trouvée'
        });
      }

      const declaration = declarationResult.rows[0];
      const ancienStatut = declaration.ancien_statut;

      console.log('✅ Déclaration trouvée');
      console.log('   → Numéro:', declaration.numero_declaration);
      console.log('   → Assuré:', declaration.assure_nom);
      console.log('   → Email:', declaration.assure_email || '❌ PAS D\'EMAIL');
      console.log('   → Ancien statut:', ancienStatut);

      // Mettre à jour la déclaration
      await client.query(
        `UPDATE aro_assurance_db.declarations SET
          statut_declaration = $1,
          commentaire_admin = $2,
          traite_par = $3,
          date_traitement = NOW()
         WHERE id = $4`,
        [statut, commentaire || null, admin_id, id]
      );

      console.log('✅ Statut mis à jour en base de données\n');

      // Enregistrer dans l'historique (si table existe)
      try {
        await client.query(
          `INSERT INTO aro_assurance_db.historique_declarations 
           (declaration_id, admin_id, action, ancien_statut, nouveau_statut, commentaire)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, admin_id, 'modification_statut', ancienStatut, statut, commentaire || null]
        );
        console.log('✅ Historique enregistré');
      } catch (err) {
        console.warn('⚠️  Impossible d\'enregistrer l\'historique (table absente?)');
      }

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
              ancienStatut,
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

      await client.query('COMMIT');

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ MISE À JOUR TERMINÉE AVEC SUCCÈS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return res.status(200).json({
        success: true,
        message: `Déclaration ${statut === 'validee' ? 'validée' : statut === 'refusee' ? 'refusée' : 'mise à jour'} avec succès${notify_email ? ' et email envoyé' : ''}`
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ ERREUR MISE À JOUR DÉCLARATION');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Message:', error.message);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour'
      });
    } finally {
      client.release();
    }
  }

  /**
   * ✅ STATISTIQUES DASHBOARD - VERSION POSTGRESQL
   */
  static async getDashboardStats(req, res) {
    console.log('📊 [ADMIN] GET Dashboard Stats');

    try {
      // ========== 1. STATISTIQUES GÉNÉRALES ==========
      const statsResult = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM aro_assurance_db.assures) as total_assures,
          (SELECT COUNT(*) FROM aro_assurance_db.assures WHERE EXTRACT(MONTH FROM date_creation) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM date_creation) = EXTRACT(YEAR FROM CURRENT_DATE)) as nouveaux_assures_mois,
          (SELECT COUNT(*) FROM aro_assurance_db.declarations) as total_declarations,
          (SELECT COUNT(*) FROM aro_assurance_db.declarations WHERE DATE(date_declaration) = CURRENT_DATE) as declarations_jour,
          (SELECT COUNT(*) FROM aro_assurance_db.declarations WHERE statut_declaration = 'en_attente') as declarations_en_attente,
          (SELECT COUNT(*) FROM aro_assurance_db.declarations WHERE statut_declaration = 'en_traitement') as declarations_en_traitement,
          (SELECT COUNT(*) FROM aro_assurance_db.declarations WHERE statut_declaration = 'validee') as declarations_validees,
          (SELECT COUNT(*) FROM aro_assurance_db.declarations WHERE statut_declaration = 'refusee') as declarations_refusees,
          (SELECT COUNT(*) FROM aro_assurance_db.declarations WHERE statut_declaration = 'complements_requis') as declarations_complements_requis
      `);

      const stats = statsResult.rows[0];

      // ========== 2. TAUX DE VALIDATION & REFUS ==========
      const totalDecl = parseInt(stats.total_declarations) || 0;
      const validees = parseInt(stats.declarations_validees) || 0;
      const refusees = parseInt(stats.declarations_refusees) || 0;
      
      stats.taux_validation = totalDecl > 0 ? parseFloat(((validees / totalDecl) * 100).toFixed(1)) : 0;
      stats.taux_refus = totalDecl > 0 ? parseFloat(((refusees / totalDecl) * 100).toFixed(1)) : 0;

      // ========== 3. DÉCLARATIONS PAR STATUT ==========
      const declarationsParStatutResult = await pool.query(`
        SELECT 
          statut_declaration as statut,
          COUNT(*) as count
        FROM aro_assurance_db.declarations
        GROUP BY statut_declaration
      `);
      stats.declarations_par_statut = declarationsParStatutResult.rows;

      // ========== 4. DÉCLARATIONS PAR TYPE ==========
      const declarationsParTypeResult = await pool.query(`
        SELECT 
          type_sinistre as type,
          COUNT(*) as count
        FROM aro_assurance_db.declarations
        GROUP BY type_sinistre
        ORDER BY count DESC
      `);
      stats.declarations_par_type = declarationsParTypeResult.rows;

      // ========== 5. ÉVOLUTION PAR MOIS ==========
      const evolutionParMoisResult = await pool.query(`
        SELECT 
          TO_CHAR(date_declaration, 'YYYY-MM') as mois,
          COUNT(*) as count
        FROM aro_assurance_db.declarations
        WHERE date_declaration >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY TO_CHAR(date_declaration, 'YYYY-MM')
        ORDER BY mois ASC
      `);
      stats.evolution_par_mois = evolutionParMoisResult.rows;

      // ========== 6. ✅ ACTIVITÉS RÉCENTES ==========
      const activitesRecentesResult = await pool.query(`
        SELECT 
          d.id, 
          d.numero_declaration, 
          d.type_sinistre, 
          d.statut_declaration as statut, 
          d.date_declaration,
          TO_CHAR(d.date_declaration, 'DD/MM/YYYY HH24:MI:SS') as date_exacte,
          d.personne_soignee_nom,
          a.nom_complet as assure_nom,
          CONCAT('Déclaration #', d.numero_declaration, ' - ', d.personne_soignee_nom) as titre,
          CONCAT(d.type_sinistre, ' par ', a.nom_complet) as description
        FROM aro_assurance_db.declarations d
        LEFT JOIN aro_assurance_db.assures a ON d.assure_id = a.id
        ORDER BY d.date_declaration DESC 
        LIMIT 20
      `);
      stats.activites_recentes = activitesRecentesResult.rows;

      console.log('✅ [ADMIN] Statistiques dashboard récupérées');

      return res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ Erreur getDashboardStats:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message
      });
    }
  }

  // Placeholders
  static async createAssure(req, res) { 
    return res.status(501).json({ success: false, message: 'Non implémenté' }); 
  }
  static async getAllAssures(req, res) { 
    return res.status(501).json({ success: false, message: 'Non implémenté' }); 
  }
  static async getAssureById(req, res) { 
    return res.status(501).json({ success: false, message: 'Non implémenté' }); 
  }
  static async updateAssure(req, res) { 
    return res.status(501).json({ success: false, message: 'Non implémenté' }); 
  }
  static async updateStatutContrat(req, res) { 
    return res.status(501).json({ success: false, message: 'Non implémenté' }); 
  }
  static async addAyantDroit(req, res) { 
    return res.status(501).json({ success: false, message: 'Non implémenté' }); 
  }
  static async addCommentaire(req, res) { 
    return res.status(501).json({ success: false, message: 'Non implémenté' }); 
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export default AdminController;