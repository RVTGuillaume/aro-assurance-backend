/**
 * Service de logging avec Winston + Chalk
 * Enregistrement des logs applicatifs avec couleurs
 * Assurances ARO Madagascar
 */

import winston from 'winston';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer le dossier logs s'il n'existe pas
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Format personnalisé des logs pour fichiers
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`;
    }
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

// Configuration du logger Winston
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  transports: [
    // Logs d'erreurs dans un fichier séparé
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    // Tous les logs dans combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// ============================================
// LOGGER CONSOLE AVEC CHALK
// ============================================
const logger = {
  success: (msg) => {
    console.log(chalk.green('✅'), chalk.white(msg));
    winstonLogger.info(msg);
  },
  
  info: (msg) => {
    console.log(chalk.blue('ℹ️ '), chalk.white(msg));
    winstonLogger.info(msg);
  },
  
  warning: (msg) => {
    console.log(chalk.yellow('⚠️ '), chalk.yellow(msg));
    winstonLogger.warn(msg);
  },
  
  error: (msg) => {
    console.log(chalk.red('❌'), chalk.red(msg));
    winstonLogger.error(msg);
  },
  
  server: (msg) => {
    console.log(chalk.magenta('🚀'), chalk.white(msg));
    winstonLogger.info(msg);
  },
  
  database: (msg) => {
    console.log(chalk.cyan('🔌'), chalk.white(msg));
    winstonLogger.info(msg);
  },
  
  route: (msg) => {
    console.log(chalk.gray('   →'), chalk.gray(msg));
  },
  
  box: (title, lines) => {
    console.log('');
    console.log(chalk.bold.cyan('╔═══════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║'), chalk.bold.white(title.padEnd(53)), chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('╚═══════════════════════════════════════════════════════╝'));
    lines.forEach(line => console.log(chalk.white(line)));
    console.log('');
    winstonLogger.info(`${title}: ${lines.join(', ')}`);
  },

  // Logs détaillés uniquement dans fichiers
  debug: (msg) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(chalk.gray('🐛'), chalk.gray(msg));
    }
    winstonLogger.debug(msg);
  }
};

// Méthodes pratiques (compatibilité avec ancien code)
export const logInfo = (message, meta = {}) => {
  logger.info(message);
  winstonLogger.info(message, meta);
};

export const logError = (message, error = null, meta = {}) => {
  logger.error(message);
  winstonLogger.error(message, { ...meta, error: error?.message, stack: error?.stack });
};

export const logWarn = (message, meta = {}) => {
  logger.warning(message);
  winstonLogger.warn(message, meta);
};

export const logDebug = (message, meta = {}) => {
  logger.debug(message);
  winstonLogger.debug(message, meta);
};

export default logger;
