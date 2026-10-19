const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export async function sendEmailViaBrevo({ to, subject, htmlContent, textContent }) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;
  const fromName = process.env.EMAIL_FROM_NAME || 'ARO Assurance';

  // ✅ Sécurité anti-crash : on force la conversion en string
  const emailDestinataire = String(to).trim();

  if (!emailDestinataire || emailDestinataire === 'undefined' || !emailDestinataire.includes('@')) {
    console.warn('⚠️ Brevo: Email destinataire vide ou invalide, envoi annulé.');
    return { success: false, error: 'Email destinataire invalide' };
  }

  if (!apiKey || !fromEmail) {
    console.error('❌ Brevo: BREVO_API_KEY ou EMAIL_FROM manquant');
    return { success: false, error: 'Configuration Brevo incomplète' };
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: emailDestinataire }],
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent || subject,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Brevo API error:', data);
      return { success: false, error: data.message || 'Erreur Brevo' };
    }

    console.log('✅ Email envoyé via Brevo:', data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('❌ Erreur réseau Brevo:', error.message);
    return { success: false, error: error.message };
  }
}