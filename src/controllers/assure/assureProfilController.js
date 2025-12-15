/**
 * Contrôleur Profil Assuré - VERSION POSTGRESQL ✅
 * ARO Assurance Madagascar
 */
import pool from '../../config/database.js';
import path from 'path';
import fs from 'fs';

class AssureProfilController {
  
  /**
   * 👤 GET /api/assure/profil - Récupérer mon profil
   */
  static async getMyProfile(req, res) {
    try {
      const assure_id = req.user.id;

      const result = await pool.query(
        `SELECT 
          id, numero_dossier, numero_police, numero_compte, 
          nom_complet, adresse, telephone, email, photo, 
          date_naissance, type_assure, titulaire_id, 
          parente_avec_titulaire, agence, 
          date_debut_contrat, date_fin_contrat, statut_contrat,
          date_creation
        FROM aro_assurance_db.assures 
        WHERE id = $1`,
        [assure_id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Assuré non trouvé'
        });
      }

      const assure = result.rows[0];

      // Générer l'URL complète de la photo
      if (assure.photo) {
        const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
        assure.photo_url = `${BASE_URL}${assure.photo}`;
      } else {
        assure.photo_url = null;
      }

      console.log('✅ Profil assuré récupéré:', assure.nom_complet);

      return res.status(200).json({
        success: true,
        data: assure
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
   * 📸 POST /api/assure/profil/photo - Changer ma photo de profil
   */
  static async updateProfilePhoto(req, res) {
    try {
      const assure_id = req.user.id;
      const nom_complet = req.user.nom_complet;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni'
        });
      }

      const photoUrl = `/uploads/assures/${req.file.filename}`;

      // Récupérer l'ancienne photo
      const assureResult = await pool.query(
        'SELECT photo FROM aro_assurance_db.assures WHERE id = $1',
        [assure_id]
      );

      const oldPhoto = assureResult.rows[0]?.photo;

      // Mettre à jour la photo dans la BDD
      await pool.query(
        'UPDATE aro_assurance_db.assures SET photo = $1 WHERE id = $2',
        [photoUrl, assure_id]
      );

      // 🔔 CRÉER UNE NOTIFICATION POUR L'ADMIN
      await pool.query(
        `INSERT INTO aro_assurance_db.notifications 
        (destinataire_type, destinataire_id, titre, message, type_notification, est_lu, date_creation) 
        VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          'admin',
          1,
          '📸 Photo de profil modifiée',
          `L'assuré ${nom_complet} (Dossier: ${req.user.numero_dossier}) a changé sa photo de profil.`,
          'info',
          false
        ]
      );

      console.log('🔔 Notification envoyée à l\'admin');

      // Supprimer l'ancienne photo du serveur
      if (oldPhoto) {
        const oldFilename = oldPhoto.split('/').pop();
        const oldPath = path.join(process.cwd(), 'uploads', 'assures', oldFilename);
        
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
            console.log('🗑️ Ancienne photo supprimée:', oldFilename);
          } catch (err) {
            console.error('⚠️ Erreur suppression ancienne photo:', err);
          }
        }
      }

      const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

      console.log('✅ Photo mise à jour pour:', nom_complet);

      return res.status(200).json({
        success: true,
        message: 'Photo mise à jour avec succès',
        data: {
          photo_url: `${BASE_URL}${photoUrl}`
        }
      });

    } catch (error) {
      console.error('❌ Erreur updateProfilePhoto:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour de la photo'
      });
    }
  }
}

export default AssureProfilController;
