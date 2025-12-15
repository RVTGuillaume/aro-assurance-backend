/**
 * Configuration Multer pour upload de pièces jointes
 * Assurances ARO Madagascar
 * @version 3.0 - PostgreSQL
 */

import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer les dossiers d'upload
const uploadsDir = path.join(__dirname, '../../uploads');
const declarationsDir = path.join(uploadsDir, 'declarations');
const tempDir = path.join(uploadsDir, 'temp');

[uploadsDir, declarationsDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Configuration du stockage des fichiers
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, declarationsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
    const extension = path.extname(file.originalname).toLowerCase();
    const sanitizedName = file.originalname
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .substring(0, 50);
    
    const filename = `${sanitizedName}-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

/**
 * Filtrage des types de fichiers autorisés
 */
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf'
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Type de fichier non autorisé. Formats acceptés: JPG, PNG, PDF. Reçu: ${file.mimetype}`
      ),
      false
    );
  }
};

/**
 * Limites de taille et nombre de fichiers
 */
const limits = {
  fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10 MB par défaut
  files: parseInt(process.env.MAX_FILES_COUNT) || 10,
  fieldSize: 1024 * 1024,
  fields: 50,
  parts: 60
};

/**
 * Configuration Multer principale
 */
export const upload = multer({
  storage,
  fileFilter,
  limits
});

/**
 * Middleware pour upload unique
 */
export const uploadSingle = (fieldName = 'file') => {
  return upload.single(fieldName);
};

/**
 * Middleware pour upload multiple
 */
export const uploadMultiple = (fieldName = 'pieces_jointes', maxCount = 10) => {
  return upload.array(fieldName, maxCount);
};

/**
 * Middleware pour upload de champs multiples
 */
export const uploadFields = (fields) => {
  return upload.fields(fields);
};

/**
 * Utilitaire pour supprimer un fichier
 */
export const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Erreur suppression fichier:', error);
    return false;
  }
};

/**
 * Utilitaire pour nettoyer les fichiers temporaires
 */
export const cleanupTempFiles = () => {
  try {
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 heures

    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`🧹 Fichier temporaire supprimé: ${file}`);
      }
    });
  } catch (error) {
    console.error('Erreur nettoyage fichiers temporaires:', error);
  }
};

/**
 * Validation de la taille de fichier
 */
export const validateFileSize = (size) => {
  return size <= limits.fileSize;
};

/**
 * Obtenir la taille de fichier lisible
 */
export const getReadableFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Configuration exportée
 */
export const uploadConfig = {
  uploadsDir,
  declarationsDir,
  tempDir,
  limits,
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf']
};

export default {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  deleteFile,
  cleanupTempFiles,
  validateFileSize,
  getReadableFileSize,
  uploadConfig
};
