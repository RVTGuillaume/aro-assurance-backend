/**
 * Configuration JWT pour authentification
 * Assurances ARO
 */

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'votre_secret_jwt_super_securise_2025_ARO',
  expiresInAssure: process.env.JWT_EXPIRE_ASSURE || '24h',
  expiresInAdmin: process.env.JWT_EXPIRE_ADMIN || '8h',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'votre_refresh_secret_2025_ARO',
  algorithm: 'HS256'
};

/**
 * Génère un token JWT
 * @param {Object} payload - Données à encoder
 * @param {String} userType - 'assure' ou 'admin'
 * @returns {String} Token JWT
 */
export const generateToken = (payload, userType = 'assure') => {
  const expiresIn = userType === 'admin' 
    ? JWT_CONFIG.expiresInAdmin 
    : JWT_CONFIG.expiresInAssure;

  return jwt.sign(
    {
      ...payload,
      type: userType,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_CONFIG.secret,
    { 
      expiresIn,
      algorithm: JWT_CONFIG.algorithm
    }
  );
};

/**
 * Vérifie et décode un token JWT
 * @param {String} token - Token à vérifier
 * @returns {Object} Payload décodé
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_CONFIG.secret);
  } catch (error) {
    throw new Error('Token invalide ou expiré');
  }
};

/**
 * Génère un refresh token
 * @param {Object} payload - Données à encoder
 * @returns {String} Refresh token
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(
    payload,
    JWT_CONFIG.refreshSecret,
    { expiresIn: '7d' }
  );
};

export default JWT_CONFIG;
