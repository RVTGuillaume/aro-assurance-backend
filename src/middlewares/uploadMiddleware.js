/**
 * Middleware Upload - Version avec Sharp
 * ARO Assurance Madagascar
 * @version 3.0 - POSTGRESQL
 */

import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer les dossiers d'upload
const uploadsDir = path.join(process.cwd(), 'uploads');
const profilesDir = path.join(uploadsDir, 'profiles');

if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
  console.log('✅ Dossier profiles créé');
}

// Stockage en mémoire
const storage = multer.memoryStorage();

// Validation des fichiers
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format non supporté. Utilisez JPG, PNG ou WebP'), false);
  }
};

// Configuration multer
export const uploadPhoto = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB max
  },
  fileFilter: fileFilter
});

/**
 * Traiter et redimensionner l'image avec Sharp
 */
export const processProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier reçu'
      });
    }

    const filename = `profile-${req.user.id}-${Date.now()}.jpg`;
    const filepath = path.join(profilesDir, filename);

    console.log('📸 Traitement image avec Sharp...');

    // Redimensionner avec Sharp
    await sharp(req.file.buffer)
      .resize(800, 800, { fit: 'cover' })
      .jpeg({ quality: 95 })
      .toFile(filepath);

    console.log('✅ Photo traitée:', filename);

    req.processedPhoto = {
      filename: filename,
      filepath: filepath,
      url: `/uploads/profiles/${filename}`
    };

    next();
  } catch (error) {
    console.error('❌ Erreur traitement photo:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du traitement de la photo'
    });
  }
};

/**
 * Supprimer une photo
 */
export const deleteOldPhoto = (filename) => {
  if (!filename) return;

  const filepath = path.join(profilesDir, filename);
  
  if (fs.existsSync(filepath)) {
    try {
      fs.unlinkSync(filepath);
      console.log('✅ Ancienne photo supprimée:', filename);
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
    }
  }
};

export default { uploadPhoto, processProfilePhoto, deleteOldPhoto };
