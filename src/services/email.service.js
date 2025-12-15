import transporter from '../config/email.config.js';
import EmailRenderer from '../utils/email-renderer.js';

class EmailService {
  /**
   * Envoyer notification de changement de statut avec template PREMIUM
   */
  async envoyerNotificationStatut(declaration, ancienStatut, nouveauStatut, commentaire) {
    try {
      const { assure_nom, assure_email, numero_declaration, type_sinistre } = declaration;

      console.log('📧 Envoi email notification PREMIUM...');
      console.log('   → Destinataire:', assure_email);
      console.log('   → Déclaration:', numero_declaration);
      console.log('   → Statut:', ancienStatut, '→', nouveauStatut);

      if (!assure_email) {
        console.warn('⚠️  Pas d\'email pour', assure_nom);
        return { success: false, message: 'Pas d\'email disponible' };
      }

      // Préparer les données pour le template
      const templateData = {
        assure_nom,
        numero_declaration,
        type_sinistre,
        ancienStatut,
        nouveauStatut,
        commentaire
      };

      // Générer le sujet selon le statut
      const sujets = {
        'validee': `✅ Déclaration ${numero_declaration} validée`,
        'refusee': `❌ Déclaration ${numero_declaration} refusée`,
        'en_traitement': `🔄 Déclaration ${numero_declaration} en cours de traitement`,
        'complements_requis': `📝 Compléments requis - ${numero_declaration}`,
        'en_attente': `⏳ Déclaration ${numero_declaration} en attente`
      };
      const sujet = sujets[nouveauStatut] || `📋 Mise à jour - ${numero_declaration}`;

      // Générer le texte simple (fallback pour clients email qui n'acceptent pas HTML)
      const textePlain = this.genererTextePlain(templateData);

      // Rendre le template HTML
      const htmlContent = await EmailRenderer.renderNotificationStatut(templateData);

      // Envoyer l'email
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"ARO Assurance Madagascar" <${process.env.EMAIL_USER}>`,
        to: assure_email,
        subject: sujet,
        text: textePlain,
        html: htmlContent,
        // En-têtes pour améliorer la délivrabilité
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      });

      console.log('✅ Email PREMIUM envoyé avec succès !');
      console.log('   → Message ID:', info.messageId);
      console.log('   → Template: notification-statut.html (responsive)');
      
      return { success: true, messageId: info.messageId };

    } catch (error) {
      console.error('❌ ERREUR envoi email PREMIUM:');
      console.error('   → Message:', error.message);
      console.error('   → Stack:', error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Générer version texte simple (fallback)
   */
  genererTextePlain(data) {
    const { assure_nom, numero_declaration, type_sinistre, ancienStatut, nouveauStatut, commentaire } = data;
    
    const statusLabels = {
      'validee': 'VALIDÉE ✅',
      'refusee': 'REFUSÉE ❌',
      'en_traitement': 'EN COURS DE TRAITEMENT 🔄',
      'complements_requis': 'COMPLÉMENTS REQUIS 📝',
      'en_attente': 'EN ATTENTE ⏳'
    };

    let texte = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏥 ARO ASSURANCE MADAGASCAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bonjour ${assure_nom},

Votre déclaration a été mise à jour.

📋 INFORMATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Numéro de déclaration : ${numero_declaration}
Type de sinistre      : ${type_sinistre || 'Non spécifié'}
Date de traitement    : ${new Date().toLocaleDateString('fr-FR')}

📊 CHANGEMENT DE STATUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Statut précédent : ${statusLabels[ancienStatut] || ancienStatut}
Nouveau statut   : ${statusLabels[nouveauStatut] || nouveauStatut}
`;

    if (commentaire) {
      texte += `
💬 COMMENTAIRE DE L'ADMINISTRATEUR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${commentaire}
`;
    }

    texte += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pour plus de détails, connectez-vous à votre espace assuré :
${process.env.FRONTEND_URL || 'http://localhost:5173/assure/declarations'}

📞 Besoin d'aide ? Contactez-nous
🌐 www.aro-assurance.mg

© 2025 ARO Assurance Madagascar
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;

    return texte.trim();
  }
}

export default new EmailService();
