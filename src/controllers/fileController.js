/**
 * Contrôleur de gestion des fichiers - VERSION POSTGRESQL ✅
 */

import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';

class FileController {
  /**
   * Upload de fichiers
   */
  static async uploadFiles(req, res) {
    try {
      const declarationId = req.params.declarationId;
      const assureId = req.user.id;
      const files = req.files;
      const { source_fichier } = req.body;

      console.log('📤 Upload fichiers pour déclaration:', declarationId);
      console.log('📁 Nombre de fichiers:', files?.length || 0);
      console.log('📦 source_fichier reçu:', source_fichier);

      if (!files || files.length === 0) {
        console.log('⚠️ Aucun fichier à uploader');
        return res.status(200).json({
          success: true,
          message: 'Aucun nouveau fichier à uploader',
          data: []
        });
      }

      // Vérifier déclaration
      const declarationResult = await pool.query(
        `SELECT id, assure_id, statut 
         FROM aro_assurance_db.declarations 
         WHERE id = $1 OR numero_declaration = $2`,
        [declarationId, declarationId]
      );

      if (declarationResult.rowCount === 0) {
        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });

        return res.status(404).json({
          success: false,
          message: 'Déclaration non trouvée'
        });
      }

      const declaration = declarationResult.rows[0];

      if (declaration.assure_id !== assureId) {
        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });

        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé'
        });
      }

      const validSources = ['initial', 'complement', 'declaration', 'original'];
      const finalSource = validSources.includes(source_fichier) 
        ? source_fichier 
        : 'declaration';

      console.log('✅ source_fichier utilisé:', finalSource);

      const uploadedFiles = [];
      
      for (const file of files) {
        const result = await pool.query(
          `INSERT INTO aro_assurance_db.declaration_fichiers 
          (declaration_id, nom_stockage, nom_original, type_mime, taille_octets, chemin_fichier, source_fichier) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
          [
            declaration.id,
            file.filename,
            file.originalname,
            file.mimetype,
            file.size,
            file.path,
            finalSource
          ]
        );

        uploadedFiles.push({
          id: result.rows[0].id,
          filename: file.originalname,
          nom_original: file.originalname,
          size: file.size,
          taille_octets: file.size,
          mimetype: file.mimetype,
          type_mime: file.mimetype,
          source_fichier: finalSource,
          chemin_fichier: file.path
        });
      }

      console.log('✅ Fichiers uploadés:', uploadedFiles.length);

      return res.status(201).json({
        success: true,
        message: `${uploadedFiles.length} fichier(s) uploadé(s) avec succès`,
        data: uploadedFiles
      });
    } catch (error) {
      console.error('❌ Erreur upload fichiers:', error);
      
      if (req.files) {
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
    }
  }

  /**
   * Télécharger un fichier
   */
  static async downloadFile(req, res) {
    try {
      const pieceId = req.params.id;
      const userId = req.user.id;
      const userType = req.user.type;

      console.log('📥 Téléchargement fichier ID:', pieceId);

      const result = await pool.query(
        `SELECT df.*, d.assure_id
         FROM aro_assurance_db.declaration_fichiers df
         JOIN aro_assurance_db.declarations d ON df.declaration_id = d.id
         WHERE df.id = $1`,
        [pieceId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Fichier non trouvé'
        });
      }

      const piece = result.rows[0];

      if (userType === 'assure' && piece.assure_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé'
        });
      }

      const filePath = piece.chemin_fichier;

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Fichier physique non trouvé'
        });
      }

      console.log('✅ Envoi fichier:', piece.nom_original);
      res.download(filePath, piece.nom_original);
    } catch (error) {
      console.error('❌ Erreur téléchargement:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du téléchargement',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Supprimer un fichier
   */
  static async deleteFile(req, res) {
    try {
      const pieceId = req.params.id;
      const assureId = req.user.id;

      console.log('🗑️ Suppression fichier ID:', pieceId);

      const result = await pool.query(
        `SELECT df.*, d.assure_id, d.statut
         FROM aro_assurance_db.declaration_fichiers df
         JOIN aro_assurance_db.declarations d ON df.declaration_id = d.id
         WHERE df.id = $1`,
        [pieceId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Fichier non trouvé'
        });
      }

      const piece = result.rows[0];

      if (piece.assure_id !== assureId) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé'
        });
      }

      if (piece.statut !== 'en_attente') {
        return res.status(403).json({
          success: false,
          message: 'Impossible de supprimer un fichier d\'une déclaration en cours de traitement'
        });
      }

      if (fs.existsSync(piece.chemin_fichier)) {
        fs.unlinkSync(piece.chemin_fichier);
        console.log('✅ Fichier physique supprimé:', piece.chemin_fichier);
      }

      await pool.query('DELETE FROM aro_assurance_db.declaration_fichiers WHERE id = $1', [pieceId]);

      console.log('✅ Fichier supprimé de la BDD');

      return res.json({
        success: true,
        message: 'Fichier supprimé avec succès'
      });
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Lister les fichiers
   */
  static async listFiles(req, res) {
    console.log('🔍 [listFiles] START');
    
    try {
      let declarationId = req.params.declarationId;
      const userId = req.user.id;
      const userType = req.user.type;

      console.log('📂 Paramètres:', { declarationId, userId, userType });

      if (userType === 'assure') {
        const result = await pool.query(
          `SELECT id FROM aro_assurance_db.declarations 
           WHERE (id = $1 OR numero_declaration = $2) AND assure_id = $3`,
          [declarationId, declarationId, userId]
        );

        if (result.rowCount === 0) {
          return res.status(404).json({
            success: false,
            message: 'Déclaration non trouvée ou accès refusé'
          });
        }

        declarationId = result.rows[0].id;
      }

      const fichiersResult = await pool.query(
        `SELECT 
          id,
          nom_original,
          nom_stockage,
          chemin_fichier,
          type_mime,
          taille_octets,
          source_fichier,
          date_upload
        FROM aro_assurance_db.declaration_fichiers
        WHERE declaration_id = $1
        ORDER BY date_upload DESC`,
        [declarationId]
      );

      const fichiers = fichiersResult.rows;

      console.log('✅ Fichiers récupérés:', fichiers.length);

      const stats = {
        originaux: fichiers.filter(f => f.source_fichier === 'original' || f.source_fichier === 'initial').length,
        complements: fichiers.filter(f => f.source_fichier === 'complement').length,
        total: fichiers.length
      };

      console.log('📊 Stats:', stats);

      return res.json({
        success: true,
        data: fichiers,
        stats
      });
    } catch (error) {
      console.error('❌ Erreur liste fichiers:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des fichiers',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export default FileController;
