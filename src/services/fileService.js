/**
 * Service de gestion des fichiers
 * Opérations sur les fichiers uploadés
 * Assurances ARO Madagascar
 */

import fs from 'fs';
import path from 'path';
import { hashFile } from '../utils/encryption.js';
import PieceJointeModel from '../models/PieceJointe.js';

class FileService {
  /**
   * Sauvegarder les informations d'un fichier en base de données
   */
  static async saveFileInfo(fileData) {
    try {
      const fileId = await PieceJointeModel.create(fileData);
      return fileId;
    } catch (error) {
      throw new Error(`Erreur sauvegarde fichier: ${error.message}`);
    }
  }

  /**
   * Supprimer un fichier physique et sa référence en BD
   */
  static async deleteFile(fileId) {
    try {
      const file = await PieceJointeModel.findById(fileId);
      
      if (!file) {
        throw new Error('Fichier non trouvé');
      }

      // Supprimer le fichier physique
      if (fs.existsSync(file.chemin_fichier)) {
        fs.unlinkSync(file.chemin_fichier);
      }

      // Supprimer de la base de données
      await PieceJointeModel.delete(fileId);

      return true;
    } catch (error) {
      throw new Error(`Erreur suppression fichier: ${error.message}`);
    }
  }

  /**
   * Vérifier l'intégrité d'un fichier
   */
  static async verifyFileIntegrity(fileId) {
    try {
      const file = await PieceJointeModel.findById(fileId);
      
      if (!file) {
        return { valid: false, message: 'Fichier non trouvé' };
      }

      if (!fs.existsSync(file.chemin_fichier)) {
        return { valid: false, message: 'Fichier physique introuvable' };
      }

      const fileBuffer = fs.readFileSync(file.chemin_fichier);
      const currentHash = hashFile(fileBuffer);

      if (currentHash !== file.hash_fichier) {
        return { valid: false, message: 'Hash du fichier ne correspond pas' };
      }

      return { valid: true, message: 'Fichier valide' };
    } catch (error) {
      return { valid: false, message: error.message };
    }
  }

  /**
   * Obtenir les métadonnées d'un fichier
   */
  static getFileMetadata(filePath) {
    try {
      const stats = fs.statSync(filePath);
      
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension: path.extname(filePath),
        exists: true
      };
    } catch (error) {
      return { exists: false };
    }
  }

  /**
   * Nettoyer les fichiers orphelins (sans référence en BD)
   */
  static async cleanOrphanFiles(declarationsDir) {
    try {
      const files = fs.readdirSync(declarationsDir);
      let cleaned = 0;

      for (const file of files) {
        const filePath = path.join(declarationsDir, file);
        
        // Vérifier si le fichier existe en BD
        const [pieces] = await pool.query(
          'SELECT id FROM pieces_jointes WHERE nom_fichier_stocke = ?',
          [file]
        );

        // Si pas en BD, supprimer
        if (pieces.length === 0) {
          fs.unlinkSync(filePath);
          cleaned++;
          console.log(`🧹 Fichier orphelin supprimé: ${file}`);
        }
      }

      return cleaned;
    } catch (error) {
      console.error('Erreur nettoyage fichiers orphelins:', error);
      return 0;
    }
  }
}

export default FileService;
