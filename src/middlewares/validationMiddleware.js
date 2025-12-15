/**
 * Middleware de validation des entrées
 * Utilise express-validator
 */

import { body, param, query, validationResult } from 'express-validator';

/**
 * Middleware pour gérer les erreurs de validation
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Erreurs de validation:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Middleware pour nettoyer/sanitizer les entrées
 */
export const sanitizeInput = (req, res, next) => {
  // Nettoyer les espaces inutiles dans body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
};

/**
 * Validation login assuré
 */
export const validateLoginAssure = [
  body('numero_dossier')
    .trim()
    .notEmpty().withMessage('Numéro de dossier requis')
    .isLength({ min: 3, max: 50 }).withMessage('Numéro de dossier invalide'),
  
  body('numero_police')
    .trim()
    .notEmpty().withMessage('Numéro de police requis')
    .isLength({ min: 3, max: 50 }).withMessage('Numéro de police invalide'),
  
  body('numero_compte')
    .trim()
    .notEmpty().withMessage('Numéro de compte requis')
    .isLength({ min: 3, max: 50 }).withMessage('Numéro de compte invalide'),
  
  body('nom_complet')
    .trim()
    .notEmpty().withMessage('Nom complet requis')
    .isLength({ min: 3, max: 255 }).withMessage('Nom invalide'),

  handleValidationErrors
];

/**
 * Validation login admin
 */
export const validateLoginAdmin = [
  body('identifier')
    .trim()
    .notEmpty().withMessage('Email ou username requis')
    .isLength({ min: 3, max: 255 }).withMessage('Identifiant invalide'),
  
  body('mot_de_passe')
    .notEmpty().withMessage('Mot de passe requis')
    .isLength({ min: 8 }).withMessage('Mot de passe invalide'),

  handleValidationErrors
];

/**
 * Validation demande réinitialisation mot de passe
 */
export const validatePasswordResetRequest = [
  body('identifier')
    .trim()
    .notEmpty().withMessage('Email ou username requis')
    .isLength({ min: 3, max: 255 }).withMessage('Identifiant invalide'),

  handleValidationErrors
];

/**
 * Validation réinitialisation mot de passe
 */
export const validatePasswordReset = [
  body('identifier')
    .trim()
    .notEmpty().withMessage('Email ou username requis'),
  
  body('code_otp')
    .trim()
    .notEmpty().withMessage('Code OTP requis')
    .isLength({ min: 6, max: 8 }).withMessage('Code OTP doit contenir 6 ou 8 chiffres')
    .isNumeric().withMessage('Code OTP doit être numérique'),
  
  body('nouveau_mot_de_passe')
    .notEmpty().withMessage('Nouveau mot de passe requis')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir: majuscules, minuscules et chiffres'),

  handleValidationErrors
];

/**
 * Validation création assuré
 */
export const validateCreateAssure = [
  body('nom_complet')
    .trim()
    .notEmpty().withMessage('Nom complet requis')
    .isLength({ min: 3, max: 255 }).withMessage('Nom entre 3 et 255 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s\-']+$/).withMessage('Nom invalide'),
  
  body('adresse')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Adresse trop longue'),
  
  body('telephone')
    .optional()
    .trim()
    .matches(/^[\d\s\+\-\(\)]+$/).withMessage('Numéro de téléphone invalide'),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),

  handleValidationErrors
];

/**
 * Validation création déclaration
 */
export const validateCreateDeclaration = [
  body('type_sinistre')
    .trim()
    .notEmpty().withMessage('Type de sinistre requis')
    .isIn(['accident', 'maladie', 'hospitalisation', 'maternite', 'deces', 'autre'])
    .withMessage('Type de sinistre invalide'),
  
  body('date_sinistre')
    .notEmpty().withMessage('Date du sinistre requise')
    .isISO8601().withMessage('Date invalide'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Description requise')
    .isLength({ min: 10, max: 2000 }).withMessage('Description entre 10 et 2000 caractères'),

  handleValidationErrors
];

/**
 * Validation paramètre ID
 */
export const validateParamId = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID invalide'),
  
  handleValidationErrors
];

/**
 * Validation pagination
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page invalide'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limite invalide (1-100)'),
  
  handleValidationErrors
];

export default {
  handleValidationErrors,
  validateLoginAssure,
  validateLoginAdmin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateCreateAssure,
  validateCreateDeclaration,
  validateParamId,
  validatePagination,
  sanitizeInput
};
