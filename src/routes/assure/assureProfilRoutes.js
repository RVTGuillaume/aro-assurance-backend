/**
 * Routes Profil Assuré
 * ARO Assurance Madagascar
 */
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import AssureProfilController from '../../controllers/assure/assureProfilController.js';
import { authenticate, requireAssure } from '../../middlewares/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// =============================================
// CONFIGURATION MULTER POUR PHOTOS
// =============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads/assures');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('📁 Dossier uploads/assures créé');
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'assure-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seules les images JPEG, PNG et WebP sont autorisées'));
    }
  }
});

console.log('🔐 Routes profil assuré chargées');

// =============================================
// ROUTES PROTÉGÉES (AUTHENTIFICATION REQUISE)
// =============================================

// Appliquer l'authentification à TOUTES les routes
router.use(authenticate);
router.use(requireAssure);

// GET /api/assure/profil - Récupérer mon profil
router.get('/', (req, res, next) => {
  console.log('👤 GET /api/assure/profil - User:', req.user.nom_complet);
  AssureProfilController.getMyProfile(req, res, next);
});

// POST /api/assure/profil/photo - Changer ma photo
router.post('/photo', upload.single('photo'), (req, res, next) => {
  console.log('📸 POST /api/assure/profil/photo - User:', req.user.nom_complet);
  console.log('📁 Fichier:', req.file?.filename);
  AssureProfilController.updateProfilePhoto(req, res, next);
});

export default router;
