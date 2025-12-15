/**
 * Service d'envoi d'emails
 * Gestion des emails OTP et notifications
 * ARO Assurance Madagascar
 */

import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Créer le transporteur nodemailer
 * ⚡ OPTIMISÉ pour connexions lentes (latence élevée)
 */
const createTransporter = () => {
  const config = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true', // false pour port 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    },
    // ⚡ TIMEOUTS AUGMENTÉS pour connexion lente (latence 200ms+)
    connectionTimeout: 60000,  // 60 secondes (au lieu de 5s par défaut)
    greetingTimeout: 30000,    // 30 secondes (au lieu de 5s)
    socketTimeout: 60000,      // 60 secondes (au lieu de 10s)
    // Pool de connexions pour réutilisation
    pool: true,
    maxConnections: 1,
    maxMessages: 3,
    // Retry automatique
    debug: false,              // Mettez true pour debug détaillé
    logger: false
  };

  console.log('📧 Configuration SMTP:', {
    host: config.host,
    port: config.port,
    user: config.auth.user,
    secure: config.secure,
    timeouts: '60s (optimisé pour connexion lente)'
  });

  // Vérifier que nodemailer est bien importé
  if (!nodemailer || typeof nodemailer.createTransport !== 'function') {
    console.error('❌ nodemailer non importé correctement');
    throw new Error('nodemailer non disponible');
  }

  return nodemailer.createTransport(config);
};

/**
 * Template HTML pour l'email OTP
 */
const getOTPEmailTemplate = (otpCode, expiresInMinutes, recipientName) => {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code de vérification - ARO Assurance</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden;">
                    
                    <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Code de Vérification</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Réinitialisation de mot de passe</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Bonjour <strong>${recipientName}</strong>,
                            </p>
                            
                            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                Vous avez demandé la réinitialisation de votre mot de passe administrateur. Voici votre code de vérification :
                            </p>
                            
                            <div style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); border-radius: 15px; padding: 30px; text-align: center; margin: 0 0 30px 0;">
                                <div style="background: white; border-radius: 12px; padding: 20px; display: inline-block;">
                                    <p style="color: #10b981; font-size: 48px; font-weight: 900; letter-spacing: 16px; margin: 0; font-family: 'Courier New', monospace;">
                                        ${otpCode}
                                    </p>
                                </div>
                            </div>
                            
                            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 0 0 30px 0;">
                                <p style="color: #92400e; margin: 0 0 10px 0; font-weight: 600; font-size: 14px;">
                                    ⏱️ Ce code expire dans <strong>${expiresInMinutes} minutes</strong>
                                </p>
                                <p style="color: #92400e; margin: 0; font-weight: 600; font-size: 14px;">
                                    🔐 Vous avez <strong>3 essais maximum</strong>
                                </p>
                            </div>
                            
                            <div style="background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">
                                <p style="color: #991b1b; margin: 0; font-size: 14px; line-height: 1.6;">
                                    <strong>⚠️ IMPORTANT :</strong><br>
                                    • Ne partagez jamais ce code<br>
                                    • ARO ne demandera jamais ce code par téléphone<br>
                                    • Si vous n'avez pas fait cette demande, ignorez cet email
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                                © ${new Date().getFullYear()} ARO Assurance Madagascar
                            </p>
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                Email automatique - Ne pas répondre
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
};

/**
 * Envoyer un email OTP
 * ⚡ OPTIMISÉ pour connexions lentes
 */
export const sendOTPEmail = async (toEmail, recipientName, otpCode, expiresInMinutes = 3) => {
  try {
    console.log(`📧 Envoi OTP à ${toEmail}...`);
    console.log('⏳ Connexion au serveur SMTP (patientez, connexion lente)...');

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || `ARO Assurance <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `🔐 Code de vérification ARO - ${otpCode}`,
      html: getOTPEmailTemplate(otpCode, expiresInMinutes, recipientName),
      // Texte brut en fallback
      text: `
ARO Assurance Madagascar
Code de vérification

Bonjour ${recipientName},

Votre code de vérification : ${otpCode}

Ce code expire dans ${expiresInMinutes} minutes.
Vous avez 3 essais maximum.

Si vous n'avez pas fait cette demande, ignorez cet email.

© ${new Date().getFullYear()} ARO Assurance Madagascar
      `.trim()
    };

    console.log('📤 Envoi en cours...');
    const startTime = Date.now();
    
    const info = await transporter.sendMail(mailOptions);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Email OTP envoyé en ${duration}s`);
    console.log(`   → Message ID: ${info.messageId}`);
    console.log(`   → Destinataire: ${toEmail}`);
    
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Erreur envoi email OTP:', error.message);
    console.error('📋 Code erreur:', error.code);
    console.error('📋 Commande SMTP:', error.command);
    
    // Messages d'erreur plus explicites
    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      console.error('⚠️ Timeout de connexion - Votre connexion Internet est trop lente');
      console.error('💡 Solutions:');
      console.error('   1. Vérifiez votre connexion Internet');
      console.error('   2. Réessayez dans quelques instants');
      console.error('   3. Utilisez un autre réseau WiFi');
    }
    
    throw new Error(`Erreur lors de l'envoi de l'email: ${error.message}`);
  }
};

/**
 * Tester la configuration email
 * ⚡ OPTIMISÉ pour connexions lentes
 */
export const testEmailConfig = async () => {
  try {
    console.log('🔍 Test de la configuration email...');
    console.log('⏳ Connexion au serveur SMTP (timeout 60s)...');
    
    const startTime = Date.now();
    const transporter = createTransporter();
    
    await transporter.verify();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Configuration email SMTP validée en ${duration}s`);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur configuration SMTP:', error.message);
    console.error('📋 Variables .env requises:');
    console.error('   EMAIL_HOST:', process.env.EMAIL_HOST || '❌ manquant');
    console.error('   EMAIL_PORT:', process.env.EMAIL_PORT || '❌ manquant');
    console.error('   EMAIL_USER:', process.env.EMAIL_USER || '❌ manquant');
    console.error('   EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ défini' : '❌ manquant');
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      console.error('⚠️ Timeout de connexion détecté');
      console.error('💡 Votre connexion Internet est trop lente pour Gmail SMTP');
      console.error('💡 Considérez l\'utilisation de Mailtrap pour le développement');
    }
    
    return false;
  }
};

// Tester au démarrage du module (COMMENTÉ pour éviter les erreurs au démarrage)
// testEmailConfig();

export default {
  sendOTPEmail,
  testEmailConfig
};
