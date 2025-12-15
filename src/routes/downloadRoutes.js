import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

/**
 * ✅ ROUTE DE STREAMING POUR GROS FICHIERS
 */
router.get('/download/:type/:filename', (req, res) => {
  try {
    const { type, filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', type, filename);

    console.log(`📥 [STREAMING] Demande téléchargement: ${filename}`);
    console.log(`📂 Chemin: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.log('❌ Fichier introuvable');
      return res.status(404).json({ success: false, message: 'Fichier introuvable' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    console.log(`📊 Taille fichier: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

    // ✅ STREAMING AVEC SUPPORT RANGE (REPRISE TÉLÉCHARGEMENT)
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'application/octet-stream',
      };

      console.log(`📦 Streaming partiel: ${start}-${end}/${fileSize}`);
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      };

      console.log(`📦 Streaming complet`);
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }

    res.on('finish', () => {
      console.log(`✅ [STREAMING] Téléchargement terminé: ${filename}\n`);
    });

  } catch (error) {
    console.error('❌ Erreur streaming:', error);
    res.status(500).json({ success: false, message: 'Erreur téléchargement' });
  }
});

export default router;
