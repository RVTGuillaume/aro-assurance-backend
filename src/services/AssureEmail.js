const nodemailer = require('nodemailer');

// Configuration SMTP
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ✅ Envoyer notification admin
exports.sendAdminNotification = async ({ type, numeroDeclaration, assureId, modifications }) => {
  try {
    const mailOptions = {
      from: `"ARO Assurance" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `🔔 Notification: ${type}`,
      html: `
        <h2>Notification ARO Assurance</h2>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Déclaration N°:</strong> ${numeroDeclaration}</p>
        <p><strong>Assuré ID:</strong> ${assureId}</p>
        <h3>Modifications:</h3>
        <pre>${JSON.stringify(modifications, null, 2)}</pre>
        <p>Consultez le backoffice pour plus de détails.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email envoyé à l\'admin');
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
  }
};
