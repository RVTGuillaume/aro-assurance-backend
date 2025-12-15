/**
 * Routes Admin Déclarations - VERSION POSTGRESQL CORRIGÉE ✅
 * Récupère TOUTES les statistiques de la base de données
 * ARO Assurance Madagascar
 */
import express from 'express';
import pool from '../config/database.js';
import { authenticate, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

console.log('🔥 [ADMIN] Chargement des routes admin déclarations...');

// ==========================================
// MIDDLEWARE AUTH ADMIN
// ==========================================
router.use(authenticate);
router.use(requireAdmin);

// ==========================================
// GET /api/admin/dashboard/stats
// ✅ STATISTIQUES COMPLÈTES POUR LE DASHBOARD
// ==========================================
router.get('/dashboard/stats', async (req, res) => {
  console.log('📊 [ADMIN] GET /api/admin/dashboard/stats');

  try {
    // ========== 1. TOTAL ASSURÉS ==========
    const totalAssuresResult = await pool.query(`
      SELECT COUNT(*) as total FROM assures
    `);

    // ========== 2. NOUVEAUX ASSURÉS CE MOIS ==========
    const nouveauxAssuresMoisResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM assures
      WHERE EXTRACT(MONTH FROM date_creation) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM date_creation) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);

    // ========== 3. TOTAL DÉCLARATIONS ==========
    const totalDeclarationsResult = await pool.query(`
      SELECT COUNT(*) as total FROM declarations
    `);

    // ========== 4. DÉCLARATIONS AUJOURD'HUI ==========
    const declarationsJourResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM declarations
      WHERE DATE(date_declaration) = CURRENT_DATE
    `);

    // ========== 5. DÉCLARATIONS PAR STATUT (graphique circulaire) ==========
    const declarationsParStatutResult = await pool.query(`
      SELECT 
        statut_declaration as statut,
        COUNT(*) as count
      FROM declarations
      GROUP BY statut_declaration
    `);

    // ========== 6-10. COMPTEURS PAR STATUT INDIVIDUEL ==========
    const declarationsEnAttenteResult = await pool.query(`
      SELECT COUNT(*) as count FROM declarations WHERE statut_declaration = 'en_attente'
    `);
    const declarationsEnTraitementResult = await pool.query(`
      SELECT COUNT(*) as count FROM declarations WHERE statut_declaration = 'en_traitement'
    `);
    const declarationsValideesResult = await pool.query(`
      SELECT COUNT(*) as count FROM declarations WHERE statut_declaration = 'validee'
    `);
    const declarationsRefuseesResult = await pool.query(`
      SELECT COUNT(*) as count FROM declarations WHERE statut_declaration = 'refusee'
    `);
    const declarationsComplementsResult = await pool.query(`
      SELECT COUNT(*) as count FROM declarations WHERE statut_declaration = 'complements_requis'
    `);

    // ========== 11. TAUX DE VALIDATION & REFUS (%) ==========
    const totalDecl = parseInt(totalDeclarationsResult.rows[0].total);
    const validees = parseInt(declarationsValideesResult.rows[0].count);
    const refusees = parseInt(declarationsRefuseesResult.rows[0].count);
    const tauxValidation = totalDecl > 0 ? ((validees / totalDecl) * 100).toFixed(1) : 0;
    const tauxRefus = totalDecl > 0 ? ((refusees / totalDecl) * 100).toFixed(1) : 0;

    // ========== 12. DÉCLARATIONS PAR TYPE (graphique barres) ==========
    const declarationsParTypeResult = await pool.query(`
      SELECT 
        type_sinistre as type,
        COUNT(*) as count
      FROM declarations
      GROUP BY type_sinistre
      ORDER BY count DESC
    `);

    // ========== 13. ÉVOLUTION PAR MOIS (graphique ligne) ==========
    const evolutionParMoisResult = await pool.query(`
      SELECT 
        TO_CHAR(date_declaration, 'YYYY-MM') as mois,
        COUNT(*) as count
      FROM declarations
      WHERE date_declaration >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(date_declaration, 'YYYY-MM')
      ORDER BY mois ASC
    `);

    // ========== 14. ACTIVITÉS RÉCENTES (20 dernières avec HEURE EXACTE) ==========
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
        CONCAT(
          'Déclaration #', d.numero_declaration, 
          ' - ', d.personne_soignee_nom
        ) as titre,
        CONCAT(
          d.type_sinistre,
          ' par ', a.nom_complet
        ) as description
      FROM declarations d
      LEFT JOIN assures a ON d.assure_id = a.id
      ORDER BY d.date_declaration DESC
      LIMIT 20
    `);

    console.log('✅ [ADMIN] Statistiques dashboard récupérées avec succès');

    return res.status(200).json({
      success: true,
      data: {
        // === TOTAUX ===
        total_assures: parseInt(totalAssuresResult.rows[0].total),
        nouveaux_assures_mois: parseInt(nouveauxAssuresMoisResult.rows[0].count),
        total_declarations: totalDecl,
        declarations_jour: parseInt(declarationsJourResult.rows[0].count),

        // === PAR STATUT (compteurs individuels) ===
        declarations_en_attente: parseInt(declarationsEnAttenteResult.rows[0].count),
        declarations_en_traitement: parseInt(declarationsEnTraitementResult.rows[0].count),
        declarations_validees: validees,
        declarations_refusees: refusees,
        declarations_complements_requis: parseInt(declarationsComplementsResult.rows[0].count),

        // === TAUX ===
        taux_validation: parseFloat(tauxValidation),
        taux_refus: parseFloat(tauxRefus),

        // === DONNÉES GRAPHIQUES ===
        declarations_par_statut: declarationsParStatutResult.rows,
        declarations_par_type: declarationsParTypeResult.rows,
        evolution_par_mois: evolutionParMoisResult.rows,

        // === ACTIVITÉS RÉCENTES ===
        activites_recentes: activitesRecentesResult.rows,
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN] Erreur récupération statistiques dashboard:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

// ==========================================
// GET /api/admin/declarations
// Récupérer TOUTES les déclarations (tous assurés)
// ==========================================
router.get('/', async (req, res) => {
  console.log('📋 [ADMIN] GET /api/admin/declarations');
  console.log('👤 Admin user:', req.user?.id);
  
  try {
    const { 
      page = 1, 
      limit = 20, 
      statut, 
      type_sinistre,
      search 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Construction WHERE
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (statut) {
      whereConditions.push(`d.statut_declaration = $${paramIndex++}`);
      queryParams.push(statut);
    }

    if (type_sinistre) {
      whereConditions.push(`d.type_sinistre = $${paramIndex++}`);
      queryParams.push(type_sinistre);
    }

    if (search) {
      whereConditions.push(`(
        d.numero_declaration ILIKE $${paramIndex} OR 
        d.personne_soignee_nom ILIKE $${paramIndex} OR
        a.nom_complet ILIKE $${paramIndex} OR
        a.numero_dossier ILIKE $${paramIndex}
      )`);
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Compter le total
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM declarations d
      LEFT JOIN assures a ON d.assure_id = a.id
      ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);

    // ✅ REQUÊTE FINALE CORRIGÉE avec les VRAIS noms de colonnes
    queryParams.push(parseInt(limit), offset);
    const declarations = await pool.query(`
      SELECT 
        d.id,
        d.numero_declaration,
        d.assure_id,
        d.type_sinistre,
        
        -- ✅ Date conditionnelle selon type de sinistre
        CASE 
          WHEN d.type_sinistre = 'accident' THEN d.accident_date
          WHEN d.type_sinistre = 'maladie' THEN d.maladie_date_debut
          WHEN d.type_sinistre = 'ophtalmologie' THEN d.maladie_date_debut
          WHEN d.type_sinistre = 'hospitalisation' THEN d.hospitalisation_date_debut
          WHEN d.type_sinistre = 'soins_dentaires' THEN d.soins_dentaires_date_debut
          ELSE NULL
        END as date_sinistre,
        
        -- ✅ Lieu conditionnel
        CASE 
          WHEN d.type_sinistre = 'accident' THEN d.accident_lieu
          WHEN d.type_sinistre = 'hospitalisation' THEN d.hospitalisation_etablissement
          ELSE NULL
        END as lieu_sinistre,
        
        -- ✅ Description conditionnelle
        CASE 
          WHEN d.type_sinistre = 'accident' THEN d.accident_circonstances
          WHEN d.type_sinistre = 'maladie' THEN d.maladie_designation
          WHEN d.type_sinistre = 'ophtalmologie' THEN d.maladie_designation
          WHEN d.type_sinistre = 'hospitalisation' THEN d.hospitalisation_description
          ELSE NULL
        END as description_sinistre,
        
        d.personne_soignee_nom,
        d.personne_soignee_profession,
        d.personne_soignee_age,
        d.personne_soignee_parente,
        d.statut_declaration,
        d.date_declaration,
        d.commentaire_admin,
        d.traite_par,
        d.date_traitement,
        a.nom_complet as assure_nom,
        a.numero_dossier,
        a.numero_police,
        a.email as assure_email,
        a.telephone as assure_telephone
      FROM declarations d
      LEFT JOIN assures a ON d.assure_id = a.id
      ${whereClause}
      ORDER BY d.date_declaration DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, queryParams);

    console.log(`✅ [ADMIN] ${declarations.rows.length} déclarations récupérées`);

    return res.status(200).json({
      success: true,
      data: declarations.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN] Erreur récupération déclarations:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des déclarations',
      error: error.message
    });
  }
});

console.log('✅ [ADMIN] Routes admin déclarations chargées');

export default router;
