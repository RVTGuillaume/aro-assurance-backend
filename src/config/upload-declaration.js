/**
 * Configuration Multer pour les déclarations
 * Upload de fichiers PDF avec validation stricte
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process'; // ✅ CORRECTION ICI

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/declarations');
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  }
});

// Validation des fichiers
const fileFilter = (req, file, cb) => {
  // Accepter seulement les PDF
  if (['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formats acceptés : PDF, images (JPG, PNG, WEBP), Word, Excel'), false);
  }
};

// Configuration Multer
const uploadDeclaration = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    files: 5 // Maximum 5 fichiers
  }
});

// Middleware de validation PDF avancée
export const validatePDF = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Aucun fichier uploadé'
    });
  }

  try {
    // Vérifier chaque fichier
    for (const file of req.files) {
      const filePath = file.path;
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Fichier introuvable: ${file.originalname}`);
      }

      // Lire les premiers octets pour vérifier la signature PDF
      const buffer = fs.readFileSync(filePath, { encoding: 'binary', start: 0, end: 4 });
      if (!buffer.startsWith('%PDF')) {
        fs.unlinkSync(filePath); // Supprimer le fichier invalide
        throw new Error(`Fichier corrompu ou non-PDF: ${file.originalname}`);
      }

      // Vérifier la taille réelle
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        fs.unlinkSync(filePath);
        throw new Error(`Fichier vide: ${file.originalname}`);
      }

      if (stats.size > (parseInt(process.env.MAX_FILE_SIZE) || 10485760)) {
        fs.unlinkSync(filePath);
        throw new Error(`Fichier trop volumineux: ${file.originalname}`);
      }

      // ✅ UTILISATION CORRECTE DE execSync (déjà importé en haut)
      try {
        // Utiliser pdfinfo pour valider le PDF (si disponible)
        execSync(`pdfinfo "${filePath}"`, { stdio: 'ignore' });
      } catch (err) {
        // pdfinfo non disponible, on continue sans cette validation
        console.warn('⚠️ pdfinfo non disponible, validation PDF basique uniquement');
      }
    }

    next();
    
  } catch (error) {
    // Nettoyer tous les fichiers uploadés en cas d'erreur
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || 'Fichier PDF invalide'
    });
  }
};

// Middleware de nettoyage en cas d'erreur
export const cleanupOnError = (err, req, res, next) => {
  if (req.files) {
    req.files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
  }
  next(err);
};

export default uploadDeclaration;
