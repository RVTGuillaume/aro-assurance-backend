/**
 * Validateurs personnalisés
 * Fonctions de validation réutilisables
 * Assurances ARO Madagascar
 */

/**
 * Valider un numéro de téléphone malgache
 */
export const isValidMadagascarPhone = (phone) => {
  const phoneRegex = /^(\+261|0)(3[2-49]|2[0-9])\s?\d{2}\s?\d{3}\s?\d{2}$/;
  return phoneRegex.test(phone);
};

/**
 * Valider un email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valider un mot de passe fort
 */
export const isStrongPassword = (password) => {
  // Minimum 12 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{12,}$/;
  return passwordRegex.test(password);
};

/**
 * Valider une date (format YYYY-MM-DD)
 */
export const isValidDate = (dateString) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Valider un âge (entre 0 et 120 ans)
 */
export const isValidAge = (age) => {
  return Number.isInteger(age) && age >= 0 && age <= 120;
};

/**
 * Valider un numéro de dossier ARO
 */
export const isValidNumeroDossier = (numero) => {
  const regex = /^DOS-\d{4}-\d{6}$/;
  return regex.test(numero);
};

/**
 * Valider un numéro de police ARO
 */
export const isValidNumeroPolice = (numero) => {
  const regex = /^POL-\d{6}$/;
  return regex.test(numero);
};

/**
 * Valider un numéro de compte ARO
 */
export const isValidNumeroCompte = (numero) => {
  const regex = /^CPT-\d{6}$/;
  return regex.test(numero);
};

/**
 * Sanitize une chaîne de caractères (enlever HTML, scripts)
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/<[^>]*>/g, '') // Enlever HTML
    .replace(/[<>'"]/g, '') // Enlever caractères dangereux
    .trim();
};

/**
 * Valider un code OTP (6 ou 8 chiffres)
 */
export const isValidOTP = (otp, length = 8) => {
  const regex = new RegExp(`^\\d{${length}}$`);
  return regex.test(otp);
};

/**
 * Valider une taille de fichier
 */
export const isValidFileSize = (size, maxSizeMB = 10) => {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return size <= maxBytes;
};

/**
 * Valider un type MIME de fichier
 */
export const isValidMimeType = (mimeType) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  return allowedTypes.includes(mimeType);
};

/**
 * Valider un statut de déclaration
 */
export const isValidDeclarationStatus = (status) => {
  const validStatuses = ['en_attente', 'en_traitement', 'validee', 'refusee', 'complements_requis'];
  return validStatuses.includes(status);
};

/**
 * Valider un type de sinistre
 */
export const isValidTypeSinistre = (type) => {
  const validTypes = ['maladie', 'ophtalmologie', 'accident', 'hospitalisation', 'soins_dentaires'];
  return validTypes.includes(type);
};

export default {
  isValidMadagascarPhone,
  isValidEmail,
  isStrongPassword,
  isValidDate,
  isValidAge,
  isValidNumeroDossier,
  isValidNumeroPolice,
  isValidNumeroCompte,
  sanitizeString,
  isValidOTP,
  isValidFileSize,
  isValidMimeType,
  isValidDeclarationStatus,
  isValidTypeSinistre
};
