/**
 * Service Email PREMIUM avec animations CSS
 * Design Apple-style professionnel
 * ARO Assurance Madagascar
 * @version 3.0 - POSTGRESQL FINAL
 */

import nodemailer from 'nodemailer';
import pool from '../config/database.js';

// ✅ COULEURS DU DESIGN SYSTEM (inchangé)
const COLORS = {
  primary: '#4F46E5',
  secondary: '#06B6D4',
  accent: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  dark: '#1F2937',
  light: '#F9FAFB',
  white: '#FFFFFF',
  aro: '#006B5B'
};

// ✅ CRÉER LE TRANSPORTEUR (inchangé)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Configuration email invalide:', error.message);
  } else {
    console.log('✅ Serveur email prêt');
  }
});

/**
 * Formater le code OTP : 6598 2356 (inchangé)
 */
const formatOTP = (code) => {
  const str = code.toString();
  return `${str.substring(0, 4)} ${str.substring(4, 8)}`;
};

/**
 * Template de base avec animations CSS (inchangé - très long donc je ne répète pas)
 */
const getBaseTemplate = (content, title) => {
  return `
<!DOCTYPE html>
<html lang="fr">
<!-- ... même template que dans ton code ... -->
</html>
  `;
};

/**
 * ✅ ENVOYER EMAIL OTP (inchangé)
 */
export const sendOTPEmail = async (to, username, code) => {
  // ... ton code OTP reste identique ...
  const formattedCode = formatOTP(code);
  
  const content = `
    <!-- ... ton HTML OTP ... -->
  `;

  const mailOptions = {
    from: `"ARO Assurance" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
    to,
    subject: '🔐 Réinitialisation de mot de passe - Code OTP',
    html: getBaseTemplate(content, 'Réinitialisation de mot de passe')
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * ✅ ENVOYER EMAIL DE NOUVELLE DÉCLARATION - POSTGRESQL
 */
export async function sendDeclarationEmail(assureId, numeroDeclaration, typeSinistre, personneSoignee) {
  try {
    console.log('📧 Envoi email pour:', numeroDeclaration);
    
    // ✅ CORRECTION POSTGRESQL
    const assureResult = await pool.query(
      'SELECT nom_complet, email, numero_dossier FROM assures WHERE id = $1',
      [assureId]
    );

    if (assureResult.rows.length === 0) {
      throw new Error('Assuré introuvable');
    }

    const assure = assureResult.rows[0];
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@aro-assurance.mg';

    const typeLabels = {
      accident: '🚑 Accident',
      maladie: '🏥 Maladie',
      hospitalisation: '🏨 Hospitalisation',
      soins_dentaires: '🦷 Soins Dentaires'
    };

    const emailBody = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">📋 Nouvelle Déclaration</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Assurance ARO Madagascar</p>
          </div>
          <div style="padding: 30px 20px;">
            <div style="background-color: #f9fafb; border-left: 4px solid #10B981; padding: 15px; margin-bottom: 15px; border-radius: 5px;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Numéro de déclaration</p>
              <p style="margin: 0; font-size: 18px; font-weight: bold; color: #059669;">${numeroDeclaration}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Assuré</td>
                <td style="padding: 12px 0; text-align: right; color: #111827; font-size: 14px;">${assure.nom_complet}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 600;">N° Dossier</td>
                <td style="padding: 12px 0; text-align: right; color: #111827; font-size: 14px;">${assure.numero_dossier || 'N/A'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Email</td>
                <td style="padding: 12px 0; text-align: right; color: #111827; font-size: 14px;">${assure.email}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Type</td>
                <td style="padding: 12px 0; text-align: right; color: #111827; font-size: 14px;">${typeLabels[typeSinistre] || typeSinistre}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Personne soignée</td>
                <td style="padding: 12px 0; text-align: right; color: #111827; font-size: 14px;">${personneSoignee || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Date</td>
                <td style="padding: 12px 0; text-align: right; color: #111827; font-size: 14px;">${new Date().toLocaleString('fr-FR', { timeZone: 'Indian/Antananarivo', dateStyle: 'full', timeStyle: 'short' })}</td>
              </tr>
            </table>
          </div>
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">Connectez-vous au dashboard ARO pour consulter les détails complets.</p>
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} Assurance ARO Madagascar. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"Assurance ARO" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `📋 Nouvelle Déclaration - ${numeroDeclaration}`,
      html: emailBody,
    });

    console.log('📧 Email envoyé avec succès à:', adminEmail);
  } catch (error) {
    console.error('❌ Erreur envoi email:', error.message);
    throw error;
  }
}

/**
 * ✅ ENVOYER EMAIL DE MODIFICATION (inchangé - aucune requête SQL)
 */
export const sendModificationEmail = async (data) => {
  // ... ton code reste identique car pas de requête SQL ...
};

export default {
  sendOTPEmail,
  sendDeclarationEmail,
  sendModificationEmail
};
