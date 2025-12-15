/**
 * Utilitaires de cryptage et hashage
 * Assurances ARO - Sécurité
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

/**
 * Hash un mot de passe avec bcrypt
 * @param {String} password - Mot de passe en clair
 * @returns {Promise<String>} Hash du mot de passe
 */
export const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error('Erreur lors du hashage du mot de passe');
  }
};

/**
 * Compare un mot de passe avec son hash
 * @param {String} password - Mot de passe en clair
 * @param {String} hash - Hash à comparer
 * @returns {Promise<Boolean>} true si correspondance
 */
export const comparePassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error('Erreur lors de la comparaison du mot de passe');
  }
};

/**
 * Génère un code OTP numérique
 * @param {Number} length - Longueur du code (6 ou 8)
 * @returns {String} Code OTP
 */
export const generateOTP = (length = 8) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    // Utilisation de crypto pour une génération sécurisée
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }
  
  return otp;
};

/**
 * Hash un OTP avec SHA-256
 * @param {String} otp - Code OTP
 * @returns {String} Hash de l'OTP
 */
export const hashOTP = (otp) => {
  return crypto
    .createHash('sha256')
    .update(otp.toString())
    .digest('hex');
};

/**
 * Génère un hash SHA-256 pour un fichier
 * @param {Buffer} fileBuffer - Contenu du fichier
 * @returns {String} Hash du fichier
 */
export const hashFile = (fileBuffer) => {
  return crypto
    .createHash('sha256')
    .update(fileBuffer)
    .digest('hex');
};

/**
 * Génère un identifiant unique sécurisé
 * @param {String} prefix - Préfixe optionnel
 * @returns {String} ID unique
 */
export const generateSecureId = (prefix = '') => {
  const timestamp = Date.now().toString(36);
  const randomStr = crypto.randomBytes(8).toString('hex');
  return `${prefix}${timestamp}-${randomStr}`.toUpperCase();
};
