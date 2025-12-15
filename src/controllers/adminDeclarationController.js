/**
 * ═══════════════════════════════════════════════════════════════
 * Contrôleur Admin Déclarations - VERSION POSTGRESQL ✅
 * Gestion des déclarations côté administrateur AVEC FICHIERS
 * ARO Assurance Madagascar
 * ═══════════════════════════════════════════════════════════════
 */

import pool from '../config/database.js';

/**
 * 1. LISTER TOUTES LES DÉCLARATIONS (Admin)
 */
export const getAllDeclarations = async (req, res) => {
  try {
    const { page = 1, limit = 20, statut = '', search = '' } = req.query;
    const offset = (page - 1) * limit;

    console.log('\n┌─────────────────────────────────────────┐');
    console.log('│  📋 [ADMIN] LISTE TOUTES DÉCLARATIONS  │');
    console.log('└─────────────────────────────────────────┘');
    console.log(`Page: ${page} | Limit: ${limit}`);
    if (statut) console.log(`Filtre statut: ${statut}`);
    if (search) console.log(`Recherche: ${search}`);

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (statut) {
      whereClause += ` AND d.statut_declaration = $${paramIndex}`;
      params.push(statut);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (
        d.numero_declaration ILIKE $${paramIndex} OR
        a.nom_complet ILIKE $${paramIndex + 1} OR
        a.numero_dossier ILIKE $${paramIndex + 2}
      )`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
      paramIndex += 3;
    }

    const query = `
      SELECT
        d.*,
        a.nom_complet as assure_nom,
        a.numero_dossier,
        a.numero_compte,
        a.email,
        a.telephone,
        a.agence
      FROM aro_assurance_db.declarations d
      INNER JOIN aro_assurance_db.assures a ON d.assure_id = a.id
      ${whereClause}
      ORDER BY d.date_declaration DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(query, params);

    // Compter total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM aro_assurance_db.declarations d
      INNER JOIN aro_assurance_db.assures a ON d.assure_id = a.id
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    console.log(`✅ ${total} déclaration(s) trouvée(s)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('\n❌ ERREUR getAllDeclarations:', error.message);
    console.error('Stack:', error.stack, '\n');
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des déclarations',
      error: error.message
    });
  }
};

/**
 * 2. RÉCUPÉRER UNE DÉCLARATION AVEC FICHIERS (Admin)
 */
export const getDeclarationByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔍 [ADMIN] RÉCUPÉRATION DÉCLARATION COMPLÈTE + FICHIERS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`🆔 ID: ${id}\n`);

    // ÉTAPE 1 : Récupérer la déclaration
    console.log('📊 [1/3] Récupération déclaration...');
    const declarationResult = await pool.query(
      `SELECT
        d.*,
        d.statut_declaration as statut,
        a.nom_complet as assure_nom,
        a.email as assure_email,
        a.telephone as assure_telephone,
        a.adresse as adresse_assure,
        a.numero_dossier,
        a.numero_police,
        a.numero_compte,
        a.type_personne as type_assure
      FROM aro_assurance_db.declarations d
      INNER JOIN aro_assurance_db.assures a ON d.assure_id = a.id
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
    console.log(`   Assuré: ${declaration.assure_nom}`);
    console.log(`   Type: ${declaration.type_sinistre}`);
    console.log(`   Statut: ${declaration.statut}`);

    // ÉTAPE 2 : Récupérer LES FICHIERS
    console.log('\n📁 [2/3] Récupération fichiers depuis `declaration_fichiers`...');
    
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
        date_upload as date_ajout,
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

    // ÉTAPE 3 : Statistiques
    if (fichiers.length > 0) {
      const stats = {
        originaux: fichiers.filter(f => f.source_fichier === 'original' || f.source_fichier === 'declaration').length,
        complements: fichiers.filter(f => f.source_fichier === 'complement').length,
        total: fichiers.length
      };

      console.log('\n┌──────────────────────────────────────┐');
      console.log(`│ ✅ Originaux    : ${stats.originaux.toString().padEnd(19)}│`);
      console.log(`│ ✅ Compléments  : ${stats.complements.toString().padEnd(19)}│`);
      console.log(`│ 📦 TOTAL        : ${stats.total.toString().padEnd(19)}│`);
      console.log('└──────────────────────────────────────┘\n');

      fichiers.forEach((f, i) => {
        const tailleMo = (f.taille_octets / (1024 * 1024)).toFixed(2);
        console.log(`  ${i + 1}. [${f.source_fichier.padEnd(11)}] ${f.nom_original}`);
        console.log(`     → Taille: ${tailleMo} MB | Type: ${f.type_fichier}`);
      });

      declaration.stats_fichiers = stats;
    } else {
      console.log('⚠️  AUCUN FICHIER TROUVÉ !');
      declaration.stats_fichiers = {
        originaux: 0,
        complements: 0,
        total: 0
      };
    }

    declaration.fichiers = fichiers;
    declaration.nombre_fichiers = fichiers.length;

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ DONNÉES COMPLÈTES PRÊTES');
    console.log(`📦 Total fichiers retournés: ${fichiers.length}`);
    console.log('═══════════════════════════════════════════════════════\n');

    return res.json({
      success: true,
      data: declaration
    });

  } catch (error) {
    console.error('\n❌❌❌ ERREUR getDeclarationByIdAdmin ❌❌❌');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la déclaration',
      error: error.message
    });
  }
};

/**
 * 3. METTRE À JOUR LE STATUT
 */
export const updateStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut_declaration, commentaire_admin } = req.body;

    console.log('\n┌──────────────────────────────────────┐');
    console.log('│  📝 [ADMIN] MODIFICATION STATUT     │');
    console.log('└──────────────────────────────────────┘');
    console.log(`ID: ${id}`);
    console.log(`Nouveau statut: ${statut_declaration}`);

    const checkResult = await pool.query(
      'SELECT id, numero_declaration, statut_declaration FROM aro_assurance_db.declarations WHERE id = $1',
      [id]
    );

    if (checkResult.rowCount === 0) {
      console.log('❌ Déclaration introuvable\n');
      return res.status(404).json({
        success: false,
        message: 'Déclaration non trouvée'
      });
    }

    console.log(`Ancien statut: ${checkResult.rows[0].statut_declaration}`);

    const statutsValides = [
      'en_attente',
      'en_traitement',
      'validee',
      'refusee',
      'complement_requis',
      'complements_requis'
    ];

    if (!statutsValides.includes(statut_declaration)) {
      console.log(`❌ Statut invalide: ${statut_declaration}\n`);
      return res.status(400).json({
        success: false,
        message: 'Statut invalide',
        statutsValides
      });
    }

    await pool.query(
      `UPDATE aro_assurance_db.declarations 
       SET 
         statut_declaration = $1,
         commentaire_admin = $2,
         date_traitement = NOW()
       WHERE id = $3`,
      [statut_declaration, commentaire_admin || null, id]
    );

    console.log('✅ Statut modifié avec succès');
    if (commentaire_admin) {
      console.log(`💬 Commentaire: ${commentaire_admin.substring(0, 50)}...`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return res.json({
      success: true,
      message: 'Statut modifié avec succès'
    });

  } catch (error) {
    console.error('\n❌ ERREUR updateStatut:', error.message);
    console.error('Stack:', error.stack, '\n');
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du statut',
      error: error.message
    });
  }
};

/**
 * 4. AJOUTER UN COMMENTAIRE
 */
export const addCommentaire = async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaire_admin } = req.body;

    console.log('\n💬 [ADMIN] Ajout commentaire - ID:', id);

    if (!commentaire_admin || commentaire_admin.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Commentaire requis'
      });
    }

    const checkResult = await pool.query(
      'SELECT id FROM aro_assurance_db.declarations WHERE id = $1',
      [id]
    );

    if (checkResult.rowCount === 0) {
      console.log('❌ Déclaration introuvable');
      return res.status(404).json({
        success: false,
        message: 'Déclaration non trouvée'
      });
    }

    await pool.query(
      'UPDATE aro_assurance_db.declarations SET commentaire_admin = $1 WHERE id = $2',
      [commentaire_admin, id]
    );

    console.log(`✅ Commentaire ajouté: "${commentaire_admin.substring(0, 50)}..."\n`);

    return res.json({
      success: true,
      message: 'Commentaire ajouté avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur addCommentaire:', error.message, '\n');
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du commentaire',
      error: error.message
    });
  }
};

/**
 * 5. STATISTIQUES GLOBALES
 */
export const getStatsAdmin = async (req, res) => {
  try {
    console.log('\n📊 [ADMIN] Récupération statistiques globales...');

    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN statut_declaration = 'en_attente' THEN 1 ELSE 0 END) as en_attente,
        SUM(CASE WHEN statut_declaration = 'en_traitement' THEN 1 ELSE 0 END) as en_traitement,
        SUM(CASE WHEN statut_declaration = 'validee' THEN 1 ELSE 0 END) as validees,
        SUM(CASE WHEN statut_declaration = 'refusee' THEN 1 ELSE 0 END) as refusees,
        SUM(CASE WHEN statut_declaration IN ('complement_requis', 'complements_requis') THEN 1 ELSE 0 END) as complement_requis,
        SUM(CASE WHEN DATE(date_declaration) = CURRENT_DATE THEN 1 ELSE 0 END) as aujourd_hui,
        SUM(CASE WHEN DATE(date_declaration) >= CURRENT_DATE - INTERVAL '7 days' THEN 1 ELSE 0 END) as cette_semaine,
        SUM(CASE WHEN DATE(date_declaration) >= CURRENT_DATE - INTERVAL '30 days' THEN 1 ELSE 0 END) as ce_mois
      FROM aro_assurance_db.declarations
    `);

    const statsData = statsResult.rows[0];

    console.log('┌──────────────────────────────────────┐');
    console.log(`│ Total:           ${statsData.total.toString().padEnd(20)}│`);
    console.log(`│ En attente:      ${statsData.en_attente.toString().padEnd(20)}│`);
    console.log(`│ En traitement:   ${statsData.en_traitement.toString().padEnd(20)}│`);
    console.log(`│ Validées:        ${statsData.validees.toString().padEnd(20)}│`);
    console.log(`│ Refusées:        ${statsData.refusees.toString().padEnd(20)}│`);
    console.log(`│ Compléments:     ${statsData.complement_requis.toString().padEnd(20)}│`);
    console.log('└──────────────────────────────────────┘');
    console.log(`📅 Aujourd'hui: ${statsData.aujourd_hui} | Cette semaine: ${statsData.cette_semaine}\n`);

    return res.json({
      success: true,
      data: statsData
    });

  } catch (error) {
    console.error('❌ Erreur getStatsAdmin:', error.message, '\n');
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
};

export default {
  getAllDeclarations,
  getDeclarationByIdAdmin,
  updateStatut,
  addCommentaire,
  getStatsAdmin
};
