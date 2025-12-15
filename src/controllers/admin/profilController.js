/**
 * Contrôleur Profil Admin - VERSION POSTGRESQL ✅
 */

import pool from '../../config/database.js';
import { deleteOldPhoto } from '../../middlewares/uploadMiddleware.js';
import bcrypt from 'bcrypt';

class ProfilController {
  /**
   * Récupérer le profil
   */
  static async getMyProfile(req, res) {
    try {
      const admin_id = req.user.id;

      const result = await pool.query(
        `SELECT 
          id, nom_complet, email, username, role, statut,
          photo_profil, date_creation, derniere_connexion
         FROM aro_assurance_db.administrateurs
         WHERE id = $1`,
        [admin_id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Administrateur non trouvé'
        });
      }

      const admin = result.rows[0];

      if (admin.photo_profil) {
        const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
        admin.photo_profil_url = `${BASE_URL}${admin.photo_profil}`;
      }

      return res.status(200).json({
        success: true,
        data: admin
      });
    } catch (error) {
      console.error('❌ Erreur getMyProfile:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du profil'
      });
    }
  }

  /**
   * Mettre à jour le profil
   */
  static async updateMyProfile(req, res) {
    try {
      const admin_id = req.user.id;
      const { nom_complet, email, username } = req.body;

      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (nom_complet) {
        updates.push(`nom_complet = $${paramIndex}`);
        values.push(nom_complet);
        paramIndex++;
      }

      if (email) {
        updates.push(`email = $${paramIndex}`);
        values.push(email);
        paramIndex++;
      }

      if (username) {
        updates.push(`username = $${paramIndex}`);
        values.push(username);
        paramIndex++;
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Aucune donnée à mettre à jour'
        });
      }

      values.push(admin_id);

      await pool.query(
        `UPDATE aro_assurance_db.administrateurs SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      );

      const updatedResult = await pool.query(
        'SELECT id, nom_complet, email, username, role, statut, photo_profil FROM aro_assurance_db.administrateurs WHERE id = $1',
        [admin_id]
      );

      return res.status(200).json({
        success: true,
        message: 'Profil mis à jour',
        data: updatedResult.rows[0]
      });
    } catch (error) {
      console.error('❌ Erreur updateMyProfile:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur mise à jour'
      });
    }
  }

  /**
   * Upload photo
   */
  static async uploadProfilePhoto(req, res) {
    try {
      const admin_id = req.user.id;
      const { filename, url } = req.processedPhoto;

      const adminResult = await pool.query(
        'SELECT photo_profil FROM aro_assurance_db.administrateurs WHERE id = $1',
        [admin_id]
      );

      const oldPhoto = adminResult.rows[0]?.photo_profil;

      await pool.query(
        'UPDATE aro_assurance_db.administrateurs SET photo_profil = $1 WHERE id = $2',
        [url, admin_id]
      );

      if (oldPhoto) {
        const oldFilename = oldPhoto.split('/').pop();
        deleteOldPhoto(oldFilename);
      }

      const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

      return res.status(200).json({
        success: true,
        message: 'Photo mise à jour',
        data: {
          photo_url: `${BASE_URL}${url}`
        }
      });
    } catch (error) {
      console.error('❌ Erreur uploadProfilePhoto:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur upload'
      });
    }
  }

  /**
   * Supprimer photo
   */
  static async deleteProfilePhoto(req, res) {
    try {
      const admin_id = req.user.id;

      const adminResult = await pool.query(
        'SELECT photo_profil FROM aro_assurance_db.administrateurs WHERE id = $1',
        [admin_id]
      );

      const oldPhoto = adminResult.rows[0]?.photo_profil;

      await pool.query(
        'UPDATE aro_assurance_db.administrateurs SET photo_profil = NULL WHERE id = $1',
        [admin_id]
      );

      if (oldPhoto) {
        const filename = oldPhoto.split('/').pop();
        deleteOldPhoto(filename);
      }

      return res.status(200).json({
        success: true,
        message: 'Photo supprimée'
      });
    } catch (error) {
      console.error('❌ Erreur deleteProfilePhoto:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur suppression'
      });
    }
  }

  /**
   * Changer mot de passe
   */
  static async changePassword(req, res) {
    try {
      const admin_id = req.user.id;
      const { old_password, new_password } = req.body;

      if (!old_password || !new_password) {
        return res.status(400).json({
          success: false,
          message: 'Ancien et nouveau mot de passe requis'
        });
      }

      if (new_password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Le mot de passe doit contenir au moins 8 caractères'
        });
      }

      const adminResult = await pool.query(
        'SELECT mot_de_passe_hash FROM aro_assurance_db.administrateurs WHERE id = $1',
        [admin_id]
      );

      if (adminResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Administrateur non trouvé'
        });
      }

      const isValidPassword = await bcrypt.compare(old_password, adminResult.rows[0].mot_de_passe_hash);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Ancien mot de passe incorrect'
        });
      }

      const hashedPassword = await bcrypt.hash(new_password, 10);

      await pool.query(
        'UPDATE aro_assurance_db.administrateurs SET mot_de_passe_hash = $1 WHERE id = $2',
        [hashedPassword, admin_id]
      );

      return res.status(200).json({
        success: true,
        message: 'Mot de passe changé avec succès'
      });
    } catch (error) {
      console.error('❌ Erreur changePassword:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du changement de mot de passe'
      });
    }
  }

  /**
   * Toggle statut actif/inactif
   */
  static async toggleStatus(req, res) {
    try {
      const admin_id = req.user.id;

      const adminResult = await pool.query(
        'SELECT statut FROM aro_assurance_db.administrateurs WHERE id = $1',
        [admin_id]
      );

      if (adminResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Administrateur non trouvé'
        });
      }

      const currentStatus = adminResult.rows[0].statut;
      const newStatus = currentStatus === 'actif' ? 'inactif' : 'actif';

      await pool.query(
        'UPDATE aro_assurance_db.administrateurs SET statut = $1 WHERE id = $2',
        [newStatus, admin_id]
      );

      return res.status(200).json({
        success: true,
        message: 'Statut mis à jour',
        data: { statut: newStatus }
      });
    } catch (error) {
      console.error('❌ Erreur toggleStatus:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur changement statut'
      });
    }
  }
}

export default ProfilController;
