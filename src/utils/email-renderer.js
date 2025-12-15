import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailRenderer {
  /**
   * Obtenir le label français du statut
   */
  static getStatusLabel(statut) {
    const labels = {
      'validee': 'Validée ✅',
      'refusee': 'Refusée ❌',
      'en_traitement': 'En cours de traitement 🔄',
      'complements_requis': 'Compléments requis 📝',
      'en_attente': 'En attente ⏳'
    };
    return labels[statut] || statut;
  }

  /**
   * Obtenir l'icône du statut
   */
  static getStatusIcon(statut) {
    const icons = {
      'validee': '✅',
      'refusee': '❌',
      'en_traitement': '🔄',
      'complements_requis': '📝',
      'en_attente': '⏳'
    };
    return icons[statut] || '📋';
  }

  /**
   * Obtenir le titre selon le statut
   */
  static getTitle(statut) {
    const titles = {
      'validee': 'Déclaration validée',
      'refusee': 'Déclaration refusée',
      'en_traitement': 'Déclaration en traitement',
      'complements_requis': 'Compléments requis',
      'en_attente': 'Déclaration en attente'
    };
    return titles[statut] || 'Mise à jour de votre déclaration';
  }

  /**
   * Formater la date
   */
  static formatDate(date) {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(date).toLocaleDateString('fr-FR', options);
  }

  /**
   * Rendre le template avec les données
   */
  static async renderNotificationStatut(data) {
    try {
      // Lire le template
      const templatePath = path.join(__dirname, '../templates/email/notification-statut.html');
      let html = fs.readFileSync(templatePath, 'utf8');

      // Section commentaire
      const commentaireSection = data.commentaire ? `
        <div class="comment-box">
          <div class="comment-title">Commentaire de l'administrateur</div>
          <div class="comment-text">${data.commentaire}</div>
        </div>
      ` : '';

      // Remplacer les variables
      const replacements = {
        '{{STATUT_CLASS}}': data.nouveauStatut,
        '{{STATUT_ICON}}': this.getStatusIcon(data.nouveauStatut),
        '{{TITRE}}': this.getTitle(data.nouveauStatut),
        '{{NUMERO_DECLARATION}}': data.numero_declaration,
        '{{ASSURE_NOM}}': data.assure_nom,
        '{{TYPE_SINISTRE}}': data.type_sinistre || 'Non spécifié',
        '{{DATE_TRAITEMENT}}': this.formatDate(new Date()),
        '{{ANCIEN_STATUT_LABEL}}': this.getStatusLabel(data.ancienStatut),
        '{{NOUVEAU_STATUT_LABEL}}': this.getStatusLabel(data.nouveauStatut),
        '{{COMMENTAIRE_SECTION}}': commentaireSection,
        '{{PORTAL_URL}}': process.env.FRONTEND_URL || 'http://localhost:5173/assure/declarations'
      };

      // Appliquer les remplacements
      for (const [key, value] of Object.entries(replacements)) {
        html = html.replace(new RegExp(key, 'g'), value);
      }

      return html;

    } catch (error) {
      console.error('❌ Erreur rendu template:', error);
      throw error;
    }
  }
}

export default EmailRenderer;
