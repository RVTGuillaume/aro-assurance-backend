/**
 * Service de gestion des OTP (One-Time Password)
 * Génération, validation et expiration des codes
 * ARO Assurance Madagascar
 */

import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

/**
 * Générer un code OTP de 8 chiffres
 */
export const generateOTP = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

/**
 * Créer et enregistrer un OTP pour un admin
 * @param {number} adminId - ID de l'administrateur
 * @param {string} ipAddress - Adresse IP
 * @param {string} userAgent - User agent du navigateur
 * @returns {Promise<{otp: string, expiresAt: Date}>}
 */
export const createOTP = async (adminId, ipAddress = '0.0.0.0', userAgent = '') => {
  try {
    // Invalider tous les anciens OTP non utilisés de cet admin
    await pool.execute(
      'UPDATE otp_reinitialisations SET est_utilise = 1 WHERE admin_id = ? AND est_utilise = 0',
      [adminId]
    );

    // Générer le code OTP
    const otpCode = generateOTP();
    
    // Hasher le code OTP
    const otpHash = await bcrypt.hash(otpCode, 10);
    
    // Calculer la date d'expiration (3 minutes)
    const expirationMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 3;
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    // Insérer le OTP dans la base de données
    const [result] = await pool.execute(
      `INSERT INTO otp_reinitialisations 
      (admin_id, otp_hash, date_creation, date_expiration, tentatives_restantes, est_utilise, ip_address, user_agent) 
      VALUES (?, ?, NOW(), ?, ?, 0, ?, ?)`,
      [adminId, otpHash, expiresAt, parseInt(process.env.OTP_MAX_ATTEMPTS) || 3, ipAddress, userAgent]
    );

    console.log(`✅ OTP créé pour admin ${adminId}, expire à ${expiresAt.toLocaleString('fr-FR', { timeZone: 'Indian/Antananarivo' })}`);

    return {
      otpId: result.insertId,
      otp: otpCode,
      expiresAt
    };

  } catch (error) {
    console.error('❌ Erreur création OTP:', error);
    throw new Error('Erreur lors de la génération du code OTP');
  }
};

/**
 * Vérifier un code OTP
 * @param {string} email - Email de l'admin
 * @param {string} otpCode - Code OTP saisi
 * @returns {Promise<{valid: boolean, message: string, adminId?: number}>}
 */
export const verifyOTP = async (email, otpCode) => {
  try {
    // Récupérer l'admin par email
    const [admins] = await pool.execute(
      'SELECT id FROM administrateurs WHERE email = ? AND statut = "actif"',
      [email]
    );

    if (admins.length === 0) {
      return { valid: false, message: 'Email non trouvé' };
    }

    const adminId = admins[0].id;

    // Récupérer le dernier OTP valide non utilisé
    const [otps] = await pool.execute(
      `SELECT id, otp_hash, date_expiration, tentatives_restantes 
       FROM otp_reinitialisations 
       WHERE admin_id = ? 
       AND est_utilise = 0 
       AND date_expiration > NOW() 
       ORDER BY date_creation DESC 
       LIMIT 1`,
      [adminId]
    );

    if (otps.length === 0) {
      return { valid: false, message: 'Code expiré ou invalide' };
    }

    const otp = otps[0];

    // Vérifier les tentatives restantes
    if (otp.tentatives_restantes <= 0) {
      await pool.execute(
        'UPDATE otp_reinitialisations SET est_utilise = 1 WHERE id = ?',
        [otp.id]
      );
      return { valid: false, message: 'Nombre maximum de tentatives atteint' };
    }

    // Vérifier le code OTP
    const isMatch = await bcrypt.compare(otpCode, otp.otp_hash);

    if (!isMatch) {
      // Décrémenter les tentatives restantes
      await pool.execute(
        'UPDATE otp_reinitialisations SET tentatives_restantes = tentatives_restantes - 1 WHERE id = ?',
        [otp.id]
      );

      const tentativesRestantes = otp.tentatives_restantes - 1;
      return { 
        valid: false, 
        message: `Code incorrect. ${tentativesRestantes} essai(s) restant(s)`,
        attemptsLeft: tentativesRestantes
      };
    }

    // Code valide : marquer comme utilisé
    await pool.execute(
      'UPDATE otp_reinitialisations SET est_utilise = 1 WHERE id = ?',
      [otp.id]
    );

    console.log(`✅ OTP validé pour admin ${adminId}`);

    return { 
      valid: true, 
      message: 'Code vérifié avec succès',
      adminId
    };

  } catch (error) {
    console.error('❌ Erreur vérification OTP:', error);
    throw new Error('Erreur lors de la vérification du code');
  }
};

/**
 * Nettoyer les OTP expirés (à exécuter périodiquement)
 */
export const cleanupExpiredOTPs = async () => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM otp_reinitialisations WHERE date_expiration < NOW() OR est_utilise = 1'
    );
    console.log(`🧹 ${result.affectedRows} OTP expirés nettoyés`);
    return result.affectedRows;
  } catch (error) {
    console.error('❌ Erreur nettoyage OTP:', error);
    return 0;
  }
};

export default {
  generateOTP,
  createOTP,
  verifyOTP,
  cleanupExpiredOTPs
};
