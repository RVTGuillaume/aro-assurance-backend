/**
 * Middleware de sécurité - Headers HTTP
 * Configuration des headers de sécurité avec Helmet
 * Assurances ARO Madagascar
 * @version CORRIGÉE - CORS Compatible
 */

import helmet from 'helmet';

/**
 * Configuration Helmet pour sécurité renforcée + CORS
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: [
        "'self'", 
        "data:", 
        "blob:",
        "http://localhost:5173", 
        "http://localhost:5000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5000"
      ],
      connectSrc: [
        "'self'",
        "http://localhost:5173",
        "http://localhost:5000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5000"
      ],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: [
        "'self'",
        "http://localhost:5173",
        "http://localhost:5000",
        "blob:"
      ],
      frameSrc: ["'none'"],
    },
  },
  
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  dnsPrefetchControl: { allow: false },
  expectCt: false,
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
});

/**
 * Headers personnalisés supplémentaires
 */
export const customSecurityHeaders = (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

  if (req.path.includes('/auth') || req.path.includes('/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }

  res.setHeader('X-ARO-Version', '1.0.0');
  res.setHeader('X-ARO-Environment', process.env.NODE_ENV || 'production');

  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  next();
};

export default { securityHeaders, customSecurityHeaders };
