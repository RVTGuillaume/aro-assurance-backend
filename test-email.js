/**
 * Script de test d'envoi d'email
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function testEmail() {
  try {
    console.log('📧 Test d\'envoi d\'email...');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('SMTP_USER:', process.env.SMTP_USER);
    console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***masqué***' : '❌ NON DÉFINI');

    const info = await transporter.sendMail({
      from: `"ARO Test" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // S'envoie à soi-même pour tester
      subject: '✅ Test ARO Assurance',
      text: 'Si vous recevez ce message, la configuration email fonctionne !',
      html: '<b>Si vous recevez ce message, la configuration email fonctionne !</b>',
    });

    console.log('✅ Email envoyé avec succès !');
    console.log('Message ID:', info.messageId);
    console.log('Vérifiez votre boîte mail (et spam)');
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    
    // Messages d'erreur courants
    if (error.message.includes('Invalid login')) {
      console.error('\n🔴 ERREUR: Identifiants incorrects');
      console.error('Solution: Vérifiez SMTP_USER et SMTP_PASS dans .env');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n🔴 ERREUR: Impossible de se connecter au serveur SMTP');
      console.error('Solution: Vérifiez SMTP_HOST et SMTP_PORT');
    } else if (error.message.includes('self signed certificate')) {
      console.error('\n🔴 ERREUR: Problème de certificat SSL');
      console.error('Solution: Ajoutez "tls: { rejectUnauthorized: false }" dans la config');
    }
  }
}

testEmail();
