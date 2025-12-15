/**
 * =====================================
 * 📋 ROUTES DÉCLARATIONS - ARO ASSURANCE
 * Version 2.7 - FIX IMPORT UPLOAD
 * =====================================
 */

import express from 'express';
import { 
  createDeclarationOnly,
  uploadFilesForDeclaration,
  getMyDeclarations,
  getDeclarationById,
  getDeclarationFiles,
  deleteFile,
  getMyStats,
  deleteDeclaration,
  updateDeclaration
} from '../controllers/declarationController.js';
import { authenticate, requireAssure } from '../middlewares/authMiddleware.js';
import uploadDeclaration from '../config/upload-declaration.js';  // ✅ IMPORT PAR DÉFAUT

const router = express.Router();

console.log('🔥 Chargement des routes déclarations v2.7...');

// ==========================================
// 🔴 SECTION 1 : ROUTES GET SPÉCIFIQUES
// ==========================================

router.get(
  '/stats',
  authenticate,
  requireAssure,
  (req, res, next) => {
    console.log(`📊 [GET] /api/declarations/stats - User: ${req.user?.id}`);
    next();
  },
  getMyStats
);

// ==========================================
// 🔴 SECTION 2 : ROUTES GET LISTE
// ==========================================

router.get(
  '/',
  authenticate,
  requireAssure,
  (req, res, next) => {
    console.log(`📋 [GET] /api/declarations - User: ${req.user?.id}`);
    console.log('🔍 Query:', req.query);
    next();
  },
  getMyDeclarations
);

// ==========================================
// 🔴 SECTION 3 : ROUTES GET FICHIERS
// ==========================================

router.get(
  '/:id/files',
  authenticate,
  requireAssure,
  (req, res, next) => {
    console.log(`📁 [GET] /api/declarations/${req.params.id}/files - User: ${req.user?.id}`);
    next();
  },
  getDeclarationFiles
);

// ==========================================
// 🔴 SECTION 4 : ROUTES GET DÉTAILS
// ==========================================

router.get(
  '/:id',
  authenticate,
  requireAssure,
  (req, res, next) => {
    console.log(`🔍 [GET] /api/declarations/${req.params.id} - User: ${req.user?.id}`);
    next();
  },
  getDeclarationById
);

// ==========================================
// 🟢 SECTION 5 : ROUTES POST CRÉATION
// ==========================================

router.post(
  '/',
  authenticate,
  requireAssure,
  (req, res, next) => {
    console.log(`✅ [POST] /api/declarations - User: ${req.user?.id}`);
    next();
  },
  createDeclarationOnly
);

// ==========================================
// 🟢 SECTION 6 : ROUTES POST UPLOAD FICHIERS
// ==========================================

router.post(
  '/:id/upload',
  authenticate,
  requireAssure,
  (req, res, next) => {
    console.log(`📎 [POST] /api/declarations/${req.params.id}/upload - User: ${req.user?.id}`);
    next();
  },
  uploadDeclaration.array('fichiers', 20),  // ✅ UTILISATION DIRECTE
  (req, res, next) => {
    const filesCount = req.files?.length || 0;
    const sourceFichier = req.body.source_fichier || 'original';
    
    console.log(`📁 Fichiers reçus: ${filesCount}`);
    console.log(`📋 source_fichier: ${sourceFichier}`);
    
    if (req.files && filesCount > 0) {
      req.files.forEach((file, index) => {
        file.source_fichier = sourceFichier;
        console.log(`  📄 ${index + 1}. ${file.originalname} - source: ${sourceFichier}`);
      });
    }
    
    next();
  },
  uploadFilesForDeclaration
);

// ==========================================
// 🟡 SECTION 7 : ROUTES PUT MODIFICATION
// ==========================================

router.put(
  '/:id',
  authenticate,
  requireAssure,
  (req, res, next) => {
    console.log(`✏️ [PUT] /api/declarations/${req.params.id} - User: ${req.user?.id}`);
    next();
  },
  updateDeclaration
);

// ==========================================
// 🔴 SECTION 8 : ROUTES DELETE SUPPRESSION
// ==========================================

/**
 * @route   DELETE /api/declarations/fichiers/:id
 * @desc    Supprimer un fichier spécifique de la BDD et du serveur
 * @access  Private (Assuré uniquement)
 * @param   id - ID du fichier (pas de la déclaration)
 * @priority ⭐⭐⭐ TRÈS HAUTE (avant DELETE /:id)
 */
router.delete(
  '/fichiers/:id',
  authenticate,
  requireAssure,
  (req, res, next) => {
    console.log(`🗑️ [DELETE] /api/declarations/fichiers/${req.params.id} - User: ${req.user?.id}`);
    next();
  },
  deleteFile
);

/**
 * @route   DELETE /api/declarations/:id
 * @desc    Supprimer une déclaration complète
 * @access  Private (Assuré uniquement)
 */
router.delete(
  '/:id',
  authenticate,
  requireAssure,
  (req, res, next) => {
    console.log(`🗑️ [DELETE] /api/declarations/${req.params.id} - User: ${req.user?.id}`);
    next();
  },
  deleteDeclaration
);

// ==========================================
// ❌ SECTION 9 : GESTION ERREURS 404
// ==========================================

router.use((req, res) => {
  console.log(`❌ [${req.method}] ${req.originalUrl} - Route non trouvée`);
  
  return res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} non trouvée`,
    availableRoutes: {
      GET: [
        '/api/declarations - Liste des déclarations',
        '/api/declarations/stats - Statistiques',
        '/api/declarations/:id - Détails déclaration',
        '/api/declarations/:id/files - Fichiers déclaration'
      ],
      POST: [
        '/api/declarations - Créer une déclaration',
        '/api/declarations/:id/upload - Upload fichiers'
      ],
      PUT: [
        '/api/declarations/:id - Modifier une déclaration'
      ],
      DELETE: [
        '/api/declarations/:id - Supprimer une déclaration',
        '/api/declarations/fichiers/:id - Supprimer un fichier'
      ]
    }
  });
});

console.log('✅ Routes déclarations chargées (v2.7 - Fix import upload)');

export default router;
