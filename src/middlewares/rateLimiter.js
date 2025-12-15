/**
 * Middleware de limitation de taux (Rate Limiting)
 * Protection contre les attaques par force brute et DDoS
 * Assurances ARO Madagascar
 * ✅ Optimisé pour 300-500 req/15min en production
 */

import rateLimit from 'express-rate-limit';

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Rate limiter général pour toutes les routes API
 * ✅ 400 requêtes par 15 minutes en PRODUCTION
 * ✅ ILLIMITÉ en DÉVELOPPEMENT
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 400 : 0,
  skip: (req) => NODE_ENV === 'development',
  message: {
    success: false,
    message: 'Trop de requêtes depuis cette IP. Veuillez réessayer dans 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const resetTime = new Date(Date.now() + 15 * 60 * 1000);
    res.status(429).json({
      success: false,
      message: 'Trop de requêtes. Veuillez patienter avant de réessayer.',
      retryAfter: req.rateLimit.resetTime,
      resetAt: resetTime.toISOString(),
      limit: 400,
      current: req.rateLimit.used
    });
  }
});

/**
 * Rate limiter strict pour les routes d'authentification
 * ✅ 10 tentatives par 15 minutes en PRODUCTION
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === 'production' ? 10 : 0,
  skip: (req) => NODE_ENV === 'development',
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Trop de tentatives de connexion. Votre IP a été temporairement bloquée.'
  },
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit auth atteint pour IP: ${req.ip} sur route: ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Trop de tentatives de connexion échouées. Veuillez réessayer dans 15 minutes.',
      blockedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    });
  }
});

/**
 * Rate limiter pour demandes OTP
 * ✅ 15 demandes par heure en PRODUCTION
 */
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: NODE_ENV === 'production' ? 15 : 0,
  skip: (req) => NODE_ENV === 'development',
  message: {
    success: false,
    message: 'Trop de demandes de code OTP. Veuillez réessayer dans 1 heure.'
  },
  handler: (req, res) => {
    console.warn(`⚠️ Trop de demandes OTP depuis IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Limite de demandes OTP atteinte. Pour votre sécurité, veuillez patienter 1 heure.',
      retryAfter: 3600
    });
  }
});

/**
 * Rate limiter pour création de déclarations
 * ✅ 20 déclarations par heure en PRODUCTION
 */
export const declarationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: NODE_ENV === 'production' ? 20 : 0,
  skip: (req) => NODE_ENV === 'development',
  keyGenerator: (req) => {
    return req.user ? `user_${req.user.id}` : req.ip;
  },
  message: {
    success: false,
    message: 'Vous avez atteint la limite de déclarations par heure.'
  }
});

/**
 * Rate limiter pour upload de fichiers
 * ✅ 40 uploads par 10 minutes en PRODUCTION
 */
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: NODE_ENV === 'production' ? 40 : 0,
  skip: (req) => NODE_ENV === 'development',
  message: {
    success: false,
    message: 'Trop d\'uploads. Veuillez patienter quelques minutes.'
  }
});

/**
 * Rate limiter strict pour endpoints sensibles
 * ✅ 15 requêtes par heure en PRODUCTION
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: NODE_ENV === 'production' ? 15 : 0,
  skip: (req) => NODE_ENV === 'development',
  message: {
    success: false,
    message: 'Action sensible limitée. Veuillez réessayer dans 1 heure.'
  },
  handler: (req, res) => {
    console.error(`🚨 Action sensible bloquée pour IP: ${req.ip} sur route: ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Trop de tentatives sur cette action sensible. Accès temporairement bloqué.',
      contact: 'support@assurances-aro.mg'
    });
  }
});

/**
 * Créer un rate limiter personnalisé
 */
export const createCustomLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max: NODE_ENV === 'production' ? max : 0,
    skip: (req) => NODE_ENV === 'development',
    message: {
      success: false,
      message: message || 'Trop de requêtes. Veuillez réessayer plus tard.'
    }
  });
};

export default {
  generalLimiter,
  authLimiter,
  otpLimiter,
  declarationLimiter,
  uploadLimiter,
  strictLimiter,
  createCustomLimiter
};
