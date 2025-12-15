/**
 * Routes de gestion des fichiers - VERSION CORRIGÉE
 * Upload et téléchargement de pièces jointes
 * Assurances ARO Madagascar
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { authenticate } from '../middlewares/authMiddleware.js';
import { uploadLimiter } from '../middlewares/rateLimiter.js';
import FileController from '../controllers/fileController.js';

const router = express.Router();

// Configuration Multer pour upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/declarations/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${extension}`);
  }
});

// ✅ FILTRAGE ÉTENDU (accepter vidéos + images + PDF)
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
    'video/mp4',           // ✅ Ajout vidéos
    'video/quicktime',     // ✅ MOV
    'video/x-msvideo',     // ✅ AVI
    'application/msword',  // ✅ DOC
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // ✅ DOCX
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé: ${file.mimetype}. Formats acceptés: JPG, PNG, PDF, MP4, MOV, DOC, DOCX`), false);
  }
};

// ✅ AUGMENTER LES LIMITES POUR VIDÉOS
const limits = {
  fileSize: 5 * 1024 * 1024 * 1024, // 5 Go (au lieu de 15 MB)
  files: 10
};

// ✅ ACCEPTER 'files' ET 'source_fichier'
const upload = multer({
  storage,
  fileFilter,
  limits
});

/**
 * @route   POST /api/files/upload/:declarationId
 * @desc    Upload de pièces jointes pour une déclaration
 * @access  Private (Assuré - propriétaire de la déclaration)
 */
router.post(
  '/upload/:declarationId',  // ✅ CORRECTION: declarationId au lieu de id
  authenticate,
  uploadLimiter,
  upload.array('fichiers', 10), // ✅ Accepte 'files'
  FileController.uploadFiles
);

/**
 * @route   GET /api/files/download/:id
 * @desc    Télécharger une pièce jointe spécifique
 * @access  Private (Assuré propriétaire ou Admin)
 */
router.get(
  '/download/:id',
  authenticate,
  FileController.downloadFile
);

/**
 * @route   DELETE /api/files/:id
 * @desc    Supprimer une pièce jointe
 * @access  Private (Assuré propriétaire avant validation)
 */
router.delete(
  '/:id',
  authenticate,
  FileController.deleteFile
);

/**
 * @route   GET /api/files/declaration/:declarationId
 * @desc    Lister toutes les pièces jointes d'une déclaration
 * @access  Private (Assuré propriétaire ou Admin)
 */
router.get(
  '/declaration/:declarationId',  // ✅ CORRECTION
  authenticate,
  FileController.listFiles
);

/**
 * Gestion des erreurs Multer
 */
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `Fichier trop volumineux. Taille maximum: ${(limits.fileSize / (1024 * 1024 * 1024)).toFixed(2)} Go`
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: `Trop de fichiers. Maximum: ${limits.files} fichiers`
      });
    }
  }

  if (error.message.includes('Type de fichier')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
});

export default router;
