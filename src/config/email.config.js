/**
 * Configuration Email SMTP
 * ARO Assurance Madagascar
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

/**
 * Créer le transporteur nodemailer
 */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Vérifier la configuration au démarrage
console.log('📧 Transporteur email configuré');
console.log('   → Host:', process.env.EMAIL_HOST);
console.log('   → Port:', process.env.EMAIL_PORT);
console.log('   → User:', process.env.EMAIL_USER);
console.log('   → Pass:', process.env.EMAIL_PASSWORD ? '***' + process.env.EMAIL_PASSWORD.slice(-4) : 'MANQUANT');

export default transporter;
