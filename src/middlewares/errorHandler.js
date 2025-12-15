/**
 * Middleware de gestion globale des erreurs
 * ARO Assurance Madagascar
 * @version 3.0 - POSTGRESQL
 */

import pool from '../config/database.js';

/**
 * Classe d'erreur personnalisée
 */
export class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Log une erreur dans la base de données
 */
const logErrorToDatabase = async (error, req) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs 
      (acteur_type, acteur_id, action, resultat, message_erreur, details_json, ip_address, user_agent) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.user ? req.user.type : 'systeme',
        req.user ? req.user.id : null,
        'ERROR_OCCURRED',
        'echec',
        error.message,
        JSON.stringify({
          stack: error.stack,
          path: req.path,
          method: req.method,
          statusCode: error.statusCode
        }),
        req.ip,
        req.get('user-agent')
      ]
    );
  } catch (dbError) {
    console.error('❌ Erreur lors du log dans la BD:', dbError);
  }
};

/**
 * Gestion des erreurs de validation
 */
const handleValidationError = (error) => {
  const errors = Object.values(error.errors || {}).map(err => err.message);
  const message = `Données invalides: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Gestion des erreurs de duplication de clé
 */
const handleDuplicateKeyError = (error) => {
  const field = error.message.match(/dup key: { (.*?): /)?.[1] || 'champ';
  return new AppError(`Le ${field} existe déjà. Veuillez en choisir un autre.`, 409);
};

/**
 * ✅ Gestion des erreurs PostgreSQL
 */
const handlePostgreSQLError = (error) => {
  // Codes erreur PostgreSQL: https://www.postgresql.org/docs/current/errcodes-appendix.html
  switch (error.code) {
    case '23505': // unique_violation
      return new AppError('Cette donnée existe déjà dans le système.', 409);
    
    case '23503': // foreign_key_violation
      return new AppError('Opération impossible: dépendances existantes.', 400);
    
    case '23502': // not_null_violation
      return new AppError('Champ requis manquant.', 400);
    
    case '22P02': // invalid_text_representation
      return new AppError('Format de données invalide.', 400);
    
    case '42P01': // undefined_table
      return new AppError('Table inexistante.', 500);
    
    case '42703': // undefined_column
      return new AppError('Champ de données invalide.', 400);
    
    case '08006': // connection_failure
    case '08001': // sqlclient_unable_to_establish_sqlconnection
      return new AppError('Impossible de se connecter à la base de données.', 503);
    
    default:
      return new AppError('Erreur de base de données.', 500);
  }
};

/**
 * Gestion des erreurs JWT
 */
const handleJWTError = () => {
  return new AppError('Token invalide. Veuillez vous reconnecter.', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Votre session a expiré. Veuillez vous reconnecter.', 401);
};

/**
 * Envoie la réponse d'erreur en développement
 */
const sendErrorDev = (err, req, res) => {
  console.error('💥 ERREUR DÉVELOPPEMENT:', err);

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message,
    stack: err.stack,
    details: {
      path: req.path,
      method: req.method,
      params: req.params,
      query: req.query,
      body: req.body
    }
  });
};

/**
 * Envoie la réponse d'erreur en production
 */
const sendErrorProd = (err, req, res) => {
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
      timestamp: err.timestamp
    });
  } else {
    console.error('💥 ERREUR PRODUCTION:', err);

    res.status(500).json({
      success: false,
      message: 'Une erreur s\'est produite. Notre équipe technique a été notifiée.',
      support: 'support@assurances-aro.mg'
    });
  }
};

/**
 * Middleware global de gestion des erreurs
 */
export const errorHandler = async (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  console.error('❌ Erreur capturée:', {
    message: err.message,
    status: error.statusCode,
    path: req.path
  });

  // Log l'erreur dans la base de données (erreurs sérieuses uniquement)
  if (error.statusCode >= 500) {
    await logErrorToDatabase(error, req);
  }

  // Gestion des types d'erreurs spécifiques
  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  }
  
  if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  }
  
  // ✅ POSTGRESQL: Erreurs PostgreSQL
  if (err.code && typeof err.code === 'string') {
    error = handlePostgreSQLError(err);
  }
  
  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }
  
  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Envoyer la réponse selon l'environnement
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

/**
 * Middleware pour routes non trouvées (404)
 */
export const notFound = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} introuvable sur ce serveur`,
    404
  );
  next(error);
};

/**
 * Wrapper pour les fonctions async
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export default { errorHandler, notFound, catchAsync, AppError };
