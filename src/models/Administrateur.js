/**
 * Modèle Administrateur - VERSION POSTGRESQL ✅
 * Assurances ARO Madagascar
 */

import pool from '../config/database.js';

class AdministrateurModel {
  /**
   * Trouve un admin par email ou username
   */
  static async findByIdentifier(identifier) {
    try {
      const result = await pool.query(
        `SELECT 
          id,
          nom_complet,
          email,
          username,
          mot_de_passe_hash,
          role,
          statut,
          derniere_connexion
        FROM aro_assurance_db.administrateurs 
        WHERE (email = $1 OR username = $2) AND statut = 'actif'
        LIMIT 1`,
        [identifier, identifier]
      );

      return result.rowCount > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new Error(`Erreur lors de la recherche de l'administrateur: ${error.message}`);
    }
  }

  /**
   * Trouve un admin par ID
   */
  static async findById(id) {
    try {
      const result = await pool.query(
        `SELECT 
          id,
          nom_complet,
          email,
          username,
          role,
          statut,
          derniere_connexion,
          date_creation
        FROM aro_assurance_db.administrateurs 
        WHERE id = $1 AND statut = 'actif'
        LIMIT 1`,
        [id]
      );

      return result.rowCount > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new Error(`Erreur lors de la recherche de l'administrateur: ${error.message}`);
    }
  }

  /**
   * Met à jour la dernière connexion
   */
  static async updateLastLogin(id) {
    try {
      await pool.query(
        'UPDATE aro_assurance_db.administrateurs SET derniere_connexion = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour de la connexion: ${error.message}`);
    }
  }

  /**
   * Met à jour le mot de passe
   */
  static async updatePassword(id, nouveauHash) {
    try {
      await pool.query(
        'UPDATE aro_assurance_db.administrateurs SET mot_de_passe_hash = $1 WHERE id = $2',
        [nouveauHash, id]
      );
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour du mot de passe: ${error.message}`);
    }
  }

  /**
   * Vérifie si un email existe déjà
   */
  static async emailExists(email) {
    try {
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM aro_assurance_db.administrateurs WHERE email = $1',
        [email]
      );

      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw new Error(`Erreur lors de la vérification de l'email: ${error.message}`);
    }
  }
}

export default AdministrateurModel;
