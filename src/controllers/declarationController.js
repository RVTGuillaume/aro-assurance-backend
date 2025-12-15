/**
 * Contrôleur Déclarations - PostgreSQL Version
 * Assurance ARO Madagascar
 * @version 5.0 - POSTGRESQL avec placeholders $1, $2, etc.
 */

import pool from '../config/database.js';
import { sendDeclarationEmail, sendModificationEmail } from '../utils/emailService.js';
import fs from 'fs';

// ✅ Fonction utilitaire pour convertir undefined/empty en null
const toNull = (value) => {
  if (value === undefined || value === '' || value === 'undefined' || value === 'null') {
    return null;
  }
  return value;
};

/**
 * ÉTAPE 1 : Créer déclaration SANS fichiers + Envoi email optionnel
 * @route POST /api/declarations
 */
export const createDeclarationOnly = async (req, res) => {
  console.log('🔥 POST /declarations - START');
  let client;
  
  try {
    const assureId = req.user?.id;
    
    if (!assureId) {
      console.log('❌ User non authentifié');
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    console.log('⚡ Création déclaration pour assuré:', assureId);

    const sendEmail = req.body.sendEmail === true || req.body.sendEmail === 'true';
    const saveToDb = req.body.saveToDb !== false && req.body.saveToDb !== 'false';

    console.log('📨 Options:', { sendEmail, saveToDb });

    const {
      adresse_assure, personne_soignee_nom, personne_soignee_profession,
      personne_soignee_age, personne_soignee_parente, autre_garantie_couvre,
      type_sinistre, accident_date, accident_lieu, accident_constate_par,
      accident_circonstances, accident_blessures, accident_soigne_par,
      maladie_type, maladie_code_oms, maladie_designation,
      maladie_soignee_par, maladie_date_debut, hospitalisation_etablissement,
      hospitalisation_date_debut, hospitalisation_date_fin,
      hospitalisation_operation_par, hospitalisation_description,
      soins_dentaires_date_debut, soins_dentaires_date_fin,
      soins_dentaires_effectues_par
    } = req.body;

    const typesValides = ['accident', 'maladie', 'hospitalisation', 'soins_dentaires'];
    if (!type_sinistre || !typesValides.includes(type_sinistre)) {
      console.log('❌ Type sinistre invalide:', type_sinistre);
      return res.status(400).json({
        success: false,
        message: `Type de sinistre invalide. Types acceptés: ${typesValides.join(', ')}`
      });
    }

    const numeroDeclaration = `DEC-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    let declarationId = null;

    console.log('🔢 Numéro généré:', numeroDeclaration);

    client = await pool.connect();
    await client.query('BEGIN');

    if (saveToDb) {
      console.log('💾 Insertion en base...');
      
      // ✅ POSTGRESQL: Utiliser $1, $2, ... et RETURNING pour récupérer l'ID
      const result = await client.query(`
        INSERT INTO aro_assurance_db.declarations (
          assure_id, numero_declaration, adresse_assure,
          personne_soignee_nom, personne_soignee_profession, personne_soignee_age,
          personne_soignee_parente, autre_garantie_couvre, type_sinistre,
          accident_date, accident_lieu, accident_constate_par,
          accident_circonstances, accident_blessures, accident_soigne_par,
          maladie_type, maladie_code_oms, maladie_designation,
          maladie_soignee_par, maladie_date_debut,
          hospitalisation_etablissement, hospitalisation_date_debut,
          hospitalisation_date_fin, hospitalisation_operation_par,
          hospitalisation_description, soins_dentaires_date_debut,
          soins_dentaires_date_fin, soins_dentaires_effectues_par,
          statut_declaration, date_declaration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, NOW())
        RETURNING id
      `, [
        assureId, numeroDeclaration, toNull(adresse_assure),
        toNull(personne_soignee_nom), toNull(personne_soignee_profession), toNull(personne_soignee_age),
        toNull(personne_soignee_parente), toNull(autre_garantie_couvre), type_sinistre,
        toNull(accident_date), toNull(accident_lieu), toNull(accident_constate_par),
        toNull(accident_circonstances), toNull(accident_blessures), toNull(accident_soigne_par),
        toNull(maladie_type), toNull(maladie_code_oms), toNull(maladie_designation),
        toNull(maladie_soignee_par), toNull(maladie_date_debut),
        toNull(hospitalisation_etablissement), toNull(hospitalisation_date_debut),
        toNull(hospitalisation_date_fin), toNull(hospitalisation_operation_par),
        toNull(hospitalisation_description), toNull(soins_dentaires_date_debut),
        toNull(soins_dentaires_date_fin), toNull(soins_dentaires_effectues_par),
        'en_attente'
      ]);

      declarationId = result.rows[0].id; // ✅ POSTGRESQL: .rows[0].id au lieu de .insertId
      console.log('✅ Déclaration enregistrée ID:', declarationId);
    }

    await client.query('COMMIT');
    console.log('✅ Transaction committée');

    // ✅ RÉPONDRE IMMÉDIATEMENT AU FRONTEND (AVANT L'EMAIL)
    console.log('✅ Réponse envoyée immédiatement');
    res.status(201).json({
      success: true,
      message: 'Déclaration créée avec succès',
      data: {
        declaration_id: declarationId,
        numero_declaration: numeroDeclaration,
        type_sinistre: type_sinistre,
        sent_email: sendEmail,
        saved_to_db: saveToDb
      }
    });

    // ✅ ENVOYER L'EMAIL EN ARRIÈRE-PLAN (NON-BLOQUANT)
    if (sendEmail) {
      sendDeclarationEmail(assureId, numeroDeclaration, type_sinistre, personne_soignee_nom)
        .then(() => console.log('📧 Email envoyé avec succès en background'))
        .catch(err => console.error('❌ Erreur envoi email background:', err.message));
    }

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      console.log('🔄 Rollback effectué');
    }
    
    console.error('❌ Erreur createDeclarationOnly:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de la déclaration',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } finally {
    if (client) {
      client.release();
      console.log('🔓 Connexion libérée');
    }
  }
};

/**
 * ÉTAPE 2 : Upload fichiers pour déclaration existante
 * @route POST /api/declarations/:id/upload
 */
export const uploadFilesForDeclaration = async (req, res) => {
  console.log('🔥 POST /declarations/:id/upload - START');
  let client;
  
  try {
    const declarationId = req.params.id;
    const assureId = req.user?.id;

    if (!assureId) {
      console.log('❌ User non authentifié');
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    console.log('📎 Upload fichiers pour déclaration:', declarationId);

    // ✅ POSTGRESQL: Utiliser $1, $2, $3
    const result = await pool.query(
      `SELECT id, type_sinistre, numero_declaration 
       FROM aro_assurance_db.declarations 
       WHERE (id = $1 OR numero_declaration = $2) AND assure_id = $3`,
      [declarationId, declarationId, assureId]
    );

    if (result.rowCount === 0) { // ✅ POSTGRESQL: rowCount au lieu de length
      console.log('❌ Déclaration non trouvée pour:', declarationId);
      
      // Nettoyer les fichiers uploadés
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            console.log('🗑️ Fichier nettoyé:', file.filename);
          }
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'Déclaration non trouvée ou non autorisée'
      });
    }

    const declaration = result.rows[0]; // ✅ POSTGRESQL: .rows[0]
    const realDeclarationId = declaration.id;

    if (!req.files || req.files.length === 0) {
      console.log('❌ Aucun fichier');
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier à uploader'
      });
    }

    const sourceFichier = req.body.source_fichier || 'original';
    console.log('📁 Fichiers reçus:', req.files.length, '| Source:', sourceFichier);

    client = await pool.connect();
    await client.query('BEGIN');

    const fichiersUploades = [];

    for (const file of req.files) {
      // ✅ POSTGRESQL: $1, $2, ... et RETURNING
      const insertResult = await client.query(`
        INSERT INTO aro_assurance_db.declaration_fichiers (
          declaration_id, type_sinistre, nom_original,
          nom_stockage, chemin_fichier, type_mime,
          taille_octets, source_fichier, statut, date_upload
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id
      `, [
        realDeclarationId,
        declaration.type_sinistre,
        file.originalname,
        file.filename,
        file.path,
        file.mimetype,
        file.size,
        sourceFichier,
        'complete'
      ]);

      fichiersUploades.push({
        id: insertResult.rows[0].id, // ✅ POSTGRESQL
        nom: file.originalname,
        taille: file.size,
        source_fichier: sourceFichier
      });

      console.log('✅ Fichier uploadé:', file.originalname, '| Source:', sourceFichier);
    }

    await client.query('COMMIT');
    console.log('✅ Transaction committée');

    return res.json({
      success: true,
      message: `${req.files.length} fichier(s) uploadé(s) avec succès`,
      data: {
        declaration_id: realDeclarationId,
        numero_declaration: declaration.numero_declaration,
        fichiers_count: req.files.length,
        source_fichier: sourceFichier,
        fichiers: fichiersUploades
      }
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }

    console.error('❌ Erreur uploadFilesForDeclaration:', error);
    
    // Nettoyer les fichiers en cas d'erreur
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload des fichiers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * Récupérer mes déclarations avec pagination et filtres
 * @route GET /api/declarations
 */
export const getMyDeclarations = async (req, res) => {
  console.log('🔥 GET /declarations - START');
  
  try {
    const assureId = req.user?.id;
    
    if (!assureId) {
      console.log('❌ User non authentifié');
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    console.log('👤 User ID:', assureId);

    const { page = 1, limit = 10, statut = '', type_sinistre = '' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    console.log('📄 Pagination:', { pageNum, limitNum, offset });

    let query = `
      SELECT 
        d.*,
        (SELECT COUNT(*) FROM aro_assurance_db.declaration_fichiers WHERE declaration_id = d.id) as fichiers_count,
        (SELECT COUNT(*) FROM aro_assurance_db.declaration_fichiers WHERE declaration_id = d.id AND statut = 'complete') as fichiers_complete
      FROM aro_assurance_db.declarations d
      WHERE d.assure_id = $1
    `;

    const params = [assureId];
    let paramIndex = 2;

    if (statut) {
      query += ` AND d.statut_declaration = $${paramIndex}`;
      params.push(statut);
      paramIndex++;
    }

    if (type_sinistre) {
      query += ` AND d.type_sinistre = $${paramIndex}`;
      params.push(type_sinistre);
      paramIndex++;
    }

    query += ` ORDER BY d.date_declaration DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    console.log('🔍 Exécution query...');

    const result = await pool.query(query, params);

    console.log('✅ Résultats:', result.rowCount);

    let countQuery = 'SELECT COUNT(*) as total FROM aro_assurance_db.declarations WHERE assure_id = $1';
    const countParams = [assureId];
    let countParamIndex = 2;

    if (statut) {
      countQuery += ` AND statut_declaration = $${countParamIndex}`;
      countParams.push(statut);
      countParamIndex++;
    }

    if (type_sinistre) {
      countQuery += ` AND type_sinistre = $${countParamIndex}`;
      countParams.push(type_sinistre);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    console.log('✅ Total:', total);
    console.log('✅ Réponse envoyée');

    return res.json({
      success: true,
      data: result.rows, // ✅ POSTGRESQL: .rows
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('❌ Erreur getMyDeclarations:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des déclarations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * ✅ Récupérer une déclaration par ID avec TOUS les fichiers
 * @route GET /api/declarations/:id
 */
export const getDeclarationById = async (req, res) => {
  console.log('🔥 GET /declarations/:id - START');
  
  try {
    const { id } = req.params;
    const assureId = req.user?.id;

    if (!assureId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    console.log('🔍 Recherche déclaration ID:', id);

    // ✅ POSTGRESQL: $1, $2, $3
    const declarationResult = await pool.query(
      `SELECT 
        d.*, 
        a.nom_complet as assure_nom,
        a.numero_dossier,
        a.email,
        a.telephone
      FROM aro_assurance_db.declarations d
      INNER JOIN aro_assurance_db.assures a ON d.assure_id = a.id
      WHERE (d.id = $1 OR d.numero_declaration = $2) AND d.assure_id = $3`,
      [id, id, assureId]
    );

    if (declarationResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Déclaration non trouvée'
      });
    }

    const declaration = declarationResult.rows[0];
    const declarationId = declaration.id;

    // ✅ RÉCUPÉRER TOUS LES FICHIERS
    const fichiersResult = await pool.query(
      `SELECT 
        id, 
        nom_original,
        nom_stockage,
        chemin_fichier,
        type_mime as type_fichier,
        taille_octets,
        source_fichier,
        date_upload
      FROM aro_assurance_db.declaration_fichiers 
      WHERE declaration_id = $1
      ORDER BY date_upload DESC`,
      [declarationId]
    );

    const fichiers = fichiersResult.rows;
    const fichiersOriginaux = fichiers.filter(f => f.source_fichier === 'original');
    const fichiersComplements = fichiers.filter(f => f.source_fichier === 'complement');

    console.log('✅ Déclaration trouvée');
    console.log(`📁 Fichiers originaux: ${fichiersOriginaux.length}`);
    console.log(`📁 Fichiers compléments: ${fichiersComplements.length}`);
    console.log(`📦 Total fichiers: ${fichiers.length}`);

    return res.json({
      success: true,
      data: {
        ...declaration,
        fichiers: fichiers,
        stats_fichiers: {
          originaux: fichiersOriginaux.length,
          complements: fichiersComplements.length,
          total: fichiers.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur getDeclarationById:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la déclaration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Statistiques de l'assuré AVEC PROTECTION TIMEOUT
 * @route GET /api/declarations/stats
 */
export const getMyStats = async (req, res) => {
  console.log('🔥 GET /stats - START');
  
  try {
    const assureId = req.user?.id;

    if (!assureId) {
      console.log('❌ User non authentifié');
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    console.log('👤 User ID:', assureId);
    console.log('🔍 Exécution query stats...');

    // ✅ POSTGRESQL avec timeout de 8 secondes
    const statsPromise = pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN statut_declaration = 'en_attente' THEN 1 ELSE 0 END) as en_attente,
        SUM(CASE WHEN statut_declaration = 'en_traitement' THEN 1 ELSE 0 END) as en_traitement,
        SUM(CASE WHEN statut_declaration = 'validee' THEN 1 ELSE 0 END) as validees,
        SUM(CASE WHEN statut_declaration = 'refusee' THEN 1 ELSE 0 END) as refusees,
        SUM(CASE WHEN statut_declaration = 'complement_requis' THEN 1 ELSE 0 END) as complements_requis
      FROM aro_assurance_db.declarations
      WHERE assure_id = $1
    `, [assureId]);

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), 8000)
    );

    const result = await Promise.race([statsPromise, timeoutPromise]);

    const stats = result.rows[0] || {
      total: 0,
      en_attente: 0,
      en_traitement: 0,
      validees: 0,
      refusees: 0,
      complements_requis: 0
    };

    console.log('✅ Stats:', stats);
    console.log('✅ Réponse envoyée');

    return res.json({
      success: true,
      data: {
        total: parseInt(stats.total) || 0,
        en_attente: parseInt(stats.en_attente) || 0,
        en_traitement: parseInt(stats.en_traitement) || 0,
        validees: parseInt(stats.validees) || 0,
        refusees: parseInt(stats.refusees) || 0,
        complements_requis: parseInt(stats.complements_requis) || 0
      }
    });

  } catch (error) {
    console.error('❌ Erreur getMyStats:', error);
    
    if (error.message === 'TIMEOUT') {
      console.log('⏱️ Timeout détecté - Retour stats vides');
      return res.status(200).json({
        success: true,
        data: {
          total: 0,
          en_attente: 0,
          en_traitement: 0,
          validees: 0,
          refusees: 0,
          complements_requis: 0
        },
        warning: 'Chargement en cours, actualisez dans quelques secondes'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * ✅ Supprimer une déclaration
 * @route DELETE /api/declarations/:id
 */
export const deleteDeclaration = async (req, res) => {
  try {
    const { id } = req.params;
    const assureId = req.user?.id;

    if (!assureId) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
    }

    // ✅ POSTGRESQL
    const result = await pool.query(
      'SELECT id FROM aro_assurance_db.declarations WHERE (id = $1 OR numero_declaration = $2) AND assure_id = $3',
      [id, id, assureId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Déclaration introuvable ou non autorisée'
      });
    }

    await pool.query(
      'DELETE FROM aro_assurance_db.declarations WHERE id = $1',
      [result.rows[0].id]
    );

    console.log('✅ Déclaration supprimée ID:', result.rows[0].id);

    return res.json({
      success: true,
      message: 'Déclaration supprimée avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur suppression déclaration:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * ✅ MISE À JOUR D'UNE DÉCLARATION - POSTGRESQL
 * @route PUT /api/declarations/:id
 */
export const updateDeclaration = async (req, res) => {
  let client;
  
  try {
    const { id } = req.params;
    const assureId = req.user?.id;

    console.log('🔄 Modification déclaration ID:', id);
    console.log('👤 Assuré ID:', assureId);

    const { sendEmail, saveToDb, ...formData } = req.body;

    client = await pool.connect();

    // ✅ POSTGRESQL
    const existingResult = await client.query(
      `SELECT * FROM aro_assurance_db.declarations 
       WHERE (id = $1 OR numero_declaration = $2) 
       AND assure_id = $3`,
      [id, id, assureId]
    );

    if (existingResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Déclaration introuvable ou accès non autorisé'
      });
    }

    const declaration = existingResult.rows[0];
    console.log('✅ Déclaration trouvée:', declaration.numero_declaration);

    if (saveToDb) {
      const fieldsToUpdate = [
        'adresse_assure', 'personne_soignee_nom', 'personne_soignee_profession',
        'personne_soignee_age', 'personne_soignee_parente', 'autre_garantie_couvre',
        'type_sinistre', 'accident_date', 'accident_lieu', 'accident_constate_par',
        'accident_circonstances', 'accident_blessures', 'accident_soigne_par',
        'maladie_type', 'maladie_code_oms', 'maladie_designation',
        'maladie_soignee_par', 'maladie_date_debut',
        'hospitalisation_etablissement', 'hospitalisation_date_debut',
        'hospitalisation_date_fin', 'hospitalisation_operation_par',
        'hospitalisation_description', 'soins_dentaires_date_debut',
        'soins_dentaires_date_fin', 'soins_dentaires_effectues_par'
      ];

      const updateValues = fieldsToUpdate.map(field => toNull(formData[field]));
      const setClause = fieldsToUpdate.map((field, index) => `${field} = $${index + 1}`).join(', ');

      const sqlUpdate = `
        UPDATE aro_assurance_db.declarations 
        SET ${setClause}
        WHERE id = $${fieldsToUpdate.length + 1}
      `;

      await client.query(sqlUpdate, [...updateValues, declaration.id]);

      console.log('✅ Déclaration mise à jour dans la BDD');
    } else {
      console.log('⚠️ Mise à jour BDD désactivée (saveToDb = false)');
    }

    res.status(200).json({
      success: true,
      message: 'Déclaration modifiée avec succès',
      data: {
        id: declaration.id,
        numero_declaration: declaration.numero_declaration,
        emailSent: sendEmail || false,
        dbSaved: saveToDb || false
      }
    });

    // Email en arrière-plan
    if (sendEmail) {
      sendModificationEmail({
        declarationNumber: declaration.numero_declaration,
        userName: req.user?.nom_complet || 'Utilisateur',
        userEmail: req.user?.email || '',
        modificationType: formData.type_sinistre,
        modificationDate: new Date().toLocaleDateString('fr-FR'),
        ...formData
      })
      .then(() => console.log('📧 Email de modification envoyé'))
      .catch(err => console.error('❌ Erreur email:', err.message));
    }

  } catch (error) {
    console.error('❌ Erreur modification:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la modification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * ✅ Lister les fichiers d'une déclaration
 * @route GET /api/declarations/:id/files
 */
export const getDeclarationFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const assureId = req.user?.id;

    if (!assureId) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
    }

    console.log('📁 Récupération fichiers pour déclaration:', id);

    const declarationResult = await pool.query(
      'SELECT id FROM aro_assurance_db.declarations WHERE (id = $1 OR numero_declaration = $2) AND assure_id = $3',
      [id, id, assureId]
    );

    if (declarationResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Déclaration introuvable'
      });
    }

    const declarationId = declarationResult.rows[0].id;

    const fichiersResult = await pool.query(
      `SELECT 
        id, nom_original, nom_stockage, chemin_fichier,
        type_mime, taille_octets, type_sinistre,
        source_fichier, date_upload, statut
      FROM aro_assurance_db.declaration_fichiers
      WHERE declaration_id = $1
      ORDER BY date_upload DESC`,
      [declarationId]
    );

    console.log(`✅ ${fichiersResult.rowCount} fichier(s) trouvé(s)`);

    return res.json({
      success: true,
      data: fichiersResult.rows,
      count: fichiersResult.rowCount
    });

  } catch (error) {
    console.error('❌ Erreur getDeclarationFiles:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des fichiers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * ✅ Supprimer un fichier
 * @route DELETE /api/declarations/fichiers/:id
 */
export const deleteFile = async (req, res) => {
  let client;
  
  try {
    const { id } = req.params;
    const assureId = req.user?.id;

    if (!assureId) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
    }

    console.log('🗑️ Suppression fichier ID:', id);

    client = await pool.connect();
    await client.query('BEGIN');

    const fichierResult = await client.query(
      `SELECT df.*, d.assure_id 
       FROM aro_assurance_db.declaration_fichiers df
       INNER JOIN aro_assurance_db.declarations d ON df.declaration_id = d.id
       WHERE df.id = $1`,
      [id]
    );

    if (fichierResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fichier introuvable'
      });
    }

    const fichier = fichierResult.rows[0];

    if (fichier.assure_id !== assureId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Supprimer le fichier physique
    if (fs.existsSync(fichier.chemin_fichier)) {
      fs.unlinkSync(fichier.chemin_fichier);
      console.log('✅ Fichier physique supprimé:', fichier.chemin_fichier);
    }

    await client.query(
      'DELETE FROM aro_assurance_db.declaration_fichiers WHERE id = $1',
      [id]
    );

    await client.query('COMMIT');

    console.log('✅ Fichier supprimé avec succès');

    return res.json({
      success: true,
      message: 'Fichier supprimé avec succès'
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('❌ Erreur suppression fichier:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

export default {
  createDeclarationOnly,
  uploadFilesForDeclaration,
  getDeclarationFiles,
  deleteFile, 
  getMyDeclarations,
  getDeclarationById,
  getMyStats,
  deleteDeclaration,
  updateDeclaration
};
