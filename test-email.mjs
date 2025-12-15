/**
 * Script de test d'envoi d'email - ES MODULE
 */

import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function testEmail() {
  try {
    console.log('📧 Test d\'envoi d\'email...\n');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('SMTP_USER:', process.env.SMTP_USER);
    console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***masqué (longueur: ' + process.env.SMTP_PASS.length + ')***' : '❌ NON DÉFINI');
    console.log('\n🔄 Envoi en cours...\n');

    const info = await transporter.sendMail({
      from: `"ARO Test" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: '✅ Test ARO Assurance - ' + new Date().toLocaleString(),
      text: 'Si vous recevez ce message, la configuration email fonctionne parfaitement !',
      html: '<h1>✅ Configuration Email OK</h1><p>Si vous recevez ce message, la configuration email fonctionne parfaitement !</p>',
    });

    console.log('✅ Email envoyé avec succès !');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('\n📬 Vérifiez votre boîte mail : ' + process.env.SMTP_USER);
    console.log('⚠️  Pensez à vérifier les SPAMS aussi !');
  } catch (error) {
    console.error('\n❌ ERREUR COMPLÈTE:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Command:', error.command);
    
    if (error.message.includes('Invalid login')) {
      console.error('\n🔴 SOLUTION: Mot de passe Gmail incorrect');
      console.error('1. Vérifiez que vous utilisez un "Mot de passe d\'application"');
      console.error('2. Générez-en un ici: https://myaccount.google.com/apppasswords');
      console.error('3. Activez "Validation en 2 étapes" si nécessaire');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n🔴 SOLUTION: Serveur SMTP inaccessible');
      console.error('Vérifiez votre connexion internet et les paramètres SMTP');
    }
  }
}

testEmail();
