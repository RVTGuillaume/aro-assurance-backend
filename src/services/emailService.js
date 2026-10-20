import { emailStatutAssure } from '../utils/emailLayout.js';
import { sendEmailViaBrevo } from './emailServiceBrevo.js';

// Fonction générique d'envoi
export async function sendEmail(to, subject, html) {
  return await sendEmailViaBrevo({ to, subject, htmlContent: html });
}

// Fonction pour l'OTP
export async function sendOTPEmail(to, otp) {
  return await sendEmailViaBrevo({ 
    to, 
    subject: "Votre code OTP", 
    htmlContent: `<p>Votre code est : <b>${otp}</b></p>` 
  });
}

// Fonction pour la création de déclaration
export async function sendDeclarationEmail(to, subject, html) {
  return await sendEmailViaBrevo({ to, subject, htmlContent: html });
}

// Fonction pour la modification de déclaration
export async function sendModificationEmail(to, subject, html) {
  return await sendEmailViaBrevo({ to, subject, htmlContent: html });
}

// ✅ LA FONCTION QUI MANQUAIT POUR L'ADMIN
export async function envoyerNotificationStatut(to, numeroDeclaration, ancienStatut, nouveauStatut, commentaire) {
  const mail = emailStatutAssure({ numero: numeroDeclaration, nouveauStatut, commentaire });
  return await sendEmailViaBrevo({ to, subject: mail.subject, htmlContent: mail.html });
}

export default { 
  sendEmail, 
  sendOTPEmail, 
  sendDeclarationEmail, 
  sendModificationEmail, 
  envoyerNotificationStatut 
};