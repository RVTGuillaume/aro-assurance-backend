import './config/email.config.js';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

// ✅ Logger simple
const logger = {
  debug: console.log,
  warning: console.warn,
  error: console.error,
  success: console.log,
  database: console.log,
  box: (title, messages) => {
    console.log('\n' + '='.repeat(50));
    console.log(title);
    messages.forEach(msg => console.log(msg));
    console.log('='.repeat(50) + '\n');
  }
};

import assureProfilRoutes from './routes/assure/assureProfilRoutes.js';
import downloadRoutes from './routes/downloadRoutes.js';
import { securityHeaders, customSecurityHeaders } from './middlewares/securityHeaders.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { generalLimiter } from './middlewares/rateLimiter.js';
import fileRedirectMiddleware from './middlewares/fileRedirectMiddleware.js';
import apiRoutes from './routes/index.js';
import pool, { testConnection } from './config/database.js';  // ✅ IMPORT testConnection

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SHOW_LOGS = NODE_ENV === 'development';

// ✅ BASE_URL
process.env.BASE_URL = process.env.BASE_URL || process.env.API_URL || `http://localhost:${PORT}`;

// CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://assurance-aro-guillaume.vercel.app',
  'https://assurance-aro-tiana.vercel.app',
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warning(`Origine refusée: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Range'],
  exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length', 'Accept-Ranges', 'Content-Range']
}));

app.options('*', cors());

// TIMEOUTS
app.use((req, res, next) => {
  req.setTimeout(600000);
  res.setTimeout(600000);
  next();
});

// SECURITY & COMPRESSION
app.use(securityHeaders);
app.use(customSecurityHeaders);
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression'] || req.path.startsWith('/uploads')) return false;
    return compression.filter(req, res);
  }
}));

// BODY PARSER
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true, parameterLimit: 100000 }));
app.use(cookieParser());

// SERVIR FICHIERS UPLOADÉS
const uploadsPath = path.join(__dirname, '../uploads');

app.use('/uploads', (req, res, next) => {
  const origin = req.headers.origin;
  
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');
  }
  
  if (req.method === 'OPTIONS' || req.method === 'HEAD') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use('/uploads', fileRedirectMiddleware);

app.use('/uploads', express.static(uploadsPath, {
  dotfiles: 'ignore',
  index: false,
  maxAge: '1y',
  
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav'
    };
    
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', fileSize);
    
    if (['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov', '.mp3'].includes(ext)) {
      res.setHeader('Content-Disposition', 'inline');
    } else {
      const filename = path.basename(filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    }
    
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// ROUTES
app.use('/api/assure/profil', assureProfilRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api', generalLimiter);

if (SHOW_LOGS) {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    logger.debug(`${timestamp} ${req.method} ${req.path}`);
    next();
  });
}

app.use((req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode === 429) {
      logger.warning(`🚨 Rate limit atteint: ${req.ip} sur ${req.path}`);
    }
  });
  next();
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Assurances ARO Madagascar',
    version: '1.0.0',
    environment: NODE_ENV,
    database: 'PostgreSQL',
    status: 'operational'
  });
});

app.use('/api', apiRoutes);

// ERREURS
app.use(notFound);
app.use(errorHandler);

// TÂCHES PLANIFIÉES
import OtpReinitialisationModel from './models/OtpReinitialisation.js';

const cleanupExpiredOTPs = async () => {
  try {
    const deleted = await OtpReinitialisationModel.cleanExpired();
    if (deleted > 0 && SHOW_LOGS) logger.success(`✅ ${deleted} OTP expirés nettoyés`);
  } catch (error) {
    logger.error(`❌ Erreur nettoyage OTP: ${error.message}`);
  }
};

const cleanupExpiredSessions = async () => {
  try {
    const result = await pool.query(
      "DELETE FROM sessions_assures WHERE date_expiration < NOW() OR est_actif = FALSE"
    );
    
    if (result.rowCount > 0 && SHOW_LOGS) {
      logger.success(`✅ ${result.rowCount} sessions expirées nettoyées`);
    }
  } catch (error) {
    logger.error(`❌ Erreur nettoyage sessions: ${error.message}`);
  }
};

setInterval(cleanupExpiredOTPs, 60 * 60 * 1000);
setInterval(cleanupExpiredSessions, 6 * 60 * 60 * 1000);

// DÉMARRAGE
let server;

const startServer = async () => {
  try {
    // ✅ TEST CONNEXION POSTGRESQL AVEC RETRY
    await testConnection();

    // Créer dossier uploads
    const uploadsDir = path.join(__dirname, '../uploads/declarations');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      logger.success('📁 Dossier uploads créé');
    }

    // Démarrer serveur HTTP
    server = app.listen(PORT, () => {
      logger.box(
        '🏥 ASSURANCES ARO MADAGASCAR - API 🏥',
        [
          `🚀 Serveur    : ${process.env.API_URL || `http://localhost:${PORT}`}`,
          `📚 API        : ${process.env.API_URL || `http://localhost:${PORT}`}/api`,
          `🗄️  Database   : PostgreSQL (Render)`,
          `⏳ Timeout    : 10 minutes`,
          `📦 Streaming  : Activé`,
          `🌍 Env        : ${NODE_ENV}`
        ]
      );
    });

    server.setTimeout(600000);
    server.keepAliveTimeout = 610000;
    server.headersTimeout = 620000;

    // Nettoyage initial
    await cleanupExpiredOTPs();
    await cleanupExpiredSessions();

  } catch (error) {
    logger.error(`❌ ERREUR FATALE: ${error.message}`);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  logger.warning(`⚠️ Signal ${signal} reçu`);
  if (server) {
    server.close(async () => {
      await pool.end();
      logger.success('✅ Serveur arrêté proprement');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('❌ Arrêt forcé après 10 secondes');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error(`❌ Unhandled Rejection: ${reason}`);
});
process.on('uncaughtException', (error) => {
  logger.error(`❌ Uncaught Exception: ${error.message}`);
});

startServer();

export default app;