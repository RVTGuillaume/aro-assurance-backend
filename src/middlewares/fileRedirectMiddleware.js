/**
 * Middleware de redirection automatique des fichiers
 * Cherche les fichiers dans plusieurs dossiers possibles
 * @version CORRIGÉE - CORS + Meilleure gestion
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileRedirectMiddleware = (req, res, next) => {
  const requestedPath = req.path;
  const uploadsPath = path.join(__dirname, '../../uploads');

  // ✅ Chemins possibles (ordre optimisé)
  const possiblePaths = [
    path.join(uploadsPath, requestedPath),
    path.join(uploadsPath, 'assures', requestedPath),
    path.join(uploadsPath, 'declarations', requestedPath),
    path.join(uploadsPath, 'declarations/general', requestedPath),
    path.join(uploadsPath, 'declarations/general/temp', requestedPath)
  ];

  // Chercher le fichier
  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const relativePath = filePath.replace(uploadsPath, 'uploads');
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Fichier trouvé: ${relativePath}`);
        }

        // ✅ Ajouter headers CORS avant de servir le fichier
        const allowedOrigins = [
          'http://localhost:5173',
          'http://localhost:3000',
          'http://127.0.0.1:5173',
          process.env.CORS_ORIGIN
        ].filter(Boolean);

        const origin = req.headers.origin;
        if (!origin || allowedOrigins.includes(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:5173');
          res.setHeader('Access-Control-Allow-Credentials', 'true');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        }

        // Définir Content-Type correct
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.pdf': 'application/pdf',
          '.mp4': 'video/mp4',
          '.webm': 'video/webm'
        };

        if (mimeTypes[ext]) {
          res.setHeader('Content-Type', mimeTypes[ext]);
          res.setHeader('Content-Disposition', 'inline');
        }

        // Cache
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

        return res.sendFile(filePath);
      }
    } catch (error) {
      console.error(`❌ Erreur lecture fichier ${filePath}:`, error.message);
    }
  }

  // Si non trouvé
  if (process.env.NODE_ENV === 'development') {
    console.log(`❌ Fichier introuvable: ${requestedPath}`);
  }
  
  next(); // Passer au middleware suivant (express.static)
};

export default fileRedirectMiddleware;
