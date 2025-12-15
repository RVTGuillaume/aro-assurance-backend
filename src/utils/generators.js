/**
 * Générateurs de numéros uniques pour ARO - POSTGRESQL
 * Numéros de dossier, police, compte, déclaration
 */

import crypto from 'crypto';
import pool from '../config/database.js';

/**
 * Génère un numéro de dossier unique
 * Format: DOS-YYYY-XXXXXX (ex: DOS-2025-123456)
 */
export const generateNumeroDossier = async () => {
  const year = new Date().getFullYear();
  let isUnique = false;
  let numero = '';

  while (!isUnique) {
    const random = crypto.randomInt(100000, 999999);
    numero = `DOS-${year}-${random}`;
    
    // ✅ CORRECTION POSTGRESQL
    const result = await pool.query(
      'SELECT id FROM assures WHERE numero_dossier = $1',
      [numero]
    );
    
    if (result.rows.length === 0) {
      isUnique = true;
    }
  }

  return numero;
};

/**
 * Génère un numéro de police unique
 * Format: POL-XXXXXX (ex: POL-789456)
 */
export const generateNumeroPolice = async () => {
  let isUnique = false;
  let numero = '';

  while (!isUnique) {
    const random = crypto.randomInt(100000, 999999);
    numero = `POL-${random}`;
    
    // ✅ CORRECTION POSTGRESQL
    const result = await pool.query(
      'SELECT id FROM assures WHERE numero_police = $1',
      [numero]
    );
    
    if (result.rows.length === 0) {
      isUnique = true;
    }
  }

  return numero;
};

/**
 * Génère un numéro de compte unique
 * Format: CPT-XXXXXX (ex: CPT-456123)
 */
export const generateNumeroCompte = async () => {
  let isUnique = false;
  let numero = '';

  while (!isUnique) {
    const random = crypto.randomInt(100000, 999999);
    numero = `CPT-${random}`;
    
    // ✅ CORRECTION POSTGRESQL
    const result = await pool.query(
      'SELECT id FROM assures WHERE numero_compte = $1',
      [numero]
    );
    
    if (result.rows.length === 0) {
      isUnique = true;
    }
  }

  return numero;
};

/**
 * Génère un numéro de déclaration unique
 * Format: DECL-YYYY-MMDD-XXXXXX
 */
export const generateNumeroDeclaration = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  let isUnique = false;
  let numero = '';

  while (!isUnique) {
    const random = crypto.randomInt(100000, 999999);
    numero = `DECL-${year}-${month}${day}-${random}`;
    
    // ✅ CORRECTION POSTGRESQL
    const result = await pool.query(
      'SELECT id FROM declarations WHERE numero_declaration = $1',
      [numero]
    );
    
    if (result.rows.length === 0) {
      isUnique = true;
    }
  }

  return numero;
};
