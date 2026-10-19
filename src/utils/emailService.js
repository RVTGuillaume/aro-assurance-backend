import { sendEmailViaBrevo } from '../services/emailServiceBrevo.js';

export async function sendEmail(to, subject, html) { return await sendEmailViaBrevo({ to, subject, htmlContent: html }); }
export async function sendOTPEmail(to, otp) { return await sendEmailViaBrevo({ to, subject: "Votre code OTP", htmlContent: `<p>Votre code est : <b>${otp}</b></p>` }); }
export async function sendDeclarationEmail(to, subject, html) { return await sendEmailViaBrevo({ to, subject, htmlContent: html }); }
export async function sendModificationEmail(to, subject, html) { return await sendEmailViaBrevo({ to, subject, htmlContent: html }); }

export async function envoyerNotificationStatut(to, numeroDeclaration, ancienStatut, nouveauStatut, commentaire) {
  return await sendEmailViaBrevo({
    to: to,
    subject: `Mise à jour de votre déclaration ${numeroDeclaration}`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Bonjour,</h2>
        <p>Le statut de votre déclaration <b>${numeroDeclaration}</b> a été mis à jour.</p>
        <ul>
          <li>Ancien statut : <b>${ancienStatut}</b></li>
          <li>Nouveau statut : <b style="color: #16a34a;">${nouveauStatut}</b></li>
        </ul>
        <p><b>Commentaire :</b><br/>${commentaire || 'Aucun'}</p>
        <br/>
        <p>Cordialement,<br/>L'équipe Assurance ARO</p>
      </div>
    `
  });
}

export default { sendEmail, sendOTPEmail, sendDeclarationEmail, sendModificationEmail, envoyerNotificationStatut };