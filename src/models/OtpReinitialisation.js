/**
 * Modèle OTP Réinitialisation - VERSION POSTGRESQL ✅
 */

import pool from '../config/database.js';

class OtpReinitialisationModel {
  /**
   * Crée un nouveau OTP
   */
  static async create({ admin_id, otp_hash, date_expiration, ip_address, user_agent }) {
    try {
      const result = await pool.query(
        `INSERT INTO aro_assurance_db.otp_reinitialisations 
        (admin_id, otp_hash, date_expiration, tentatives_restantes, ip_address, user_agent) 
        VALUES ($1, $2, $3, 5, $4, $5)
        RETURNING id`,
        [admin_id, otp_hash, date_expiration, ip_address, user_agent]
      );

      return result.rows[0].id;
    } catch (error) {
      throw new Error(`Erreur lors de la création de l'OTP: ${error.message}`);
    }
  }

  /**
   * Trouve un OTP valide par admin_id
   */
  static async findValidByAdminId(admin_id) {
    try {
      const result = await pool.query(
        `SELECT 
          id,
          admin_id,
          otp_hash,
          date_expiration,
          tentatives_restantes,
          est_utilise
        FROM aro_assurance_db.otp_reinitialisations 
        WHERE admin_id = $1 
          AND est_utilise = FALSE 
          AND date_expiration > NOW()
          AND tentatives_restantes > 0
        ORDER BY date_creation DESC
        LIMIT 1`,
        [admin_id]
      );

      return result.rowCount > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new Error(`Erreur lors de la recherche de l'OTP: ${error.message}`);
    }
  }

  /**
   * Décrémente le nombre de tentatives restantes
   */
  static async decrementTentatives(otp_id) {
    try {
      await pool.query(
        'UPDATE aro_assurance_db.otp_reinitialisations SET tentatives_restantes = tentatives_restantes - 1 WHERE id = $1',
        [otp_id]
      );
    } catch (error) {
      throw new Error(`Erreur lors de la décrémentation des tentatives: ${error.message}`);
    }
  }

  /**
   * Marque un OTP comme utilisé
   */
  static async markAsUsed(otp_id) {
    try {
      await pool.query(
        'UPDATE aro_assurance_db.otp_reinitialisations SET est_utilise = TRUE WHERE id = $1',
        [otp_id]
      );
    } catch (error) {
      throw new Error(`Erreur lors du marquage de l'OTP: ${error.message}`);
    }
  }

  /**
   * Invalide tous les OTP d'un admin
   */
  static async invalidateAllByAdminId(admin_id) {
    try {
      await pool.query(
        'UPDATE aro_assurance_db.otp_reinitialisations SET est_utilise = TRUE WHERE admin_id = $1 AND est_utilise = FALSE',
        [admin_id]
      );
    } catch (error) {
      throw new Error(`Erreur lors de l'invalidation des OTP: ${error.message}`);
    }
  }

  /**
   * Nettoie les OTP expirés
   */
  static async cleanExpired() {
    try {
      const result = await pool.query(
        `DELETE FROM aro_assurance_db.otp_reinitialisations 
         WHERE date_expiration < NOW() 
         OR (est_utilise = TRUE AND date_creation < NOW() - INTERVAL '7 days')`
      );

      return result.rowCount;
    } catch (error) {
      throw new Error(`Erreur lors du nettoyage des OTP: ${error.message}`);
    }
  }
}

export default OtpReinitialisationModel;
