const VERT = '#0b7a4b';
const OR = '#d99a00';

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const front = () => (process.env.FRONTEND_URL || 'https://assurance-aro-guillaume.vercel.app').replace(/\/$/, '');
export const lienAssure = () => front() + '/login-assure';
export const lienAdmin = () => front() + '/login-admin';

const STATUTS = {
  en_attente: { label: 'En attente', couleur: '#4b5563', fond: '#f3f4f6', texte: 'Votre d&eacute;claration est en attente de prise en charge.' },
  en_traitement: { label: 'En cours de traitement', couleur: '#1d4ed8', fond: '#dbeafe', texte: 'Nos &eacute;quipes &eacute;tudient actuellement votre dossier.' },
  validee: { label: 'Valid\u00e9e', couleur: '#047857', fond: '#d1fae5', texte: 'Bonne nouvelle : votre d&eacute;claration a &eacute;t&eacute; valid&eacute;e.' },
  refusee: { label: 'Refus\u00e9e', couleur: '#b91c1c', fond: '#fee2e2', texte: 'Votre d&eacute;claration n\'a malheureusement pas pu &ecirc;tre accept&eacute;e.' },
  complements_requis: { label: 'Compl\u00e9ments requis', couleur: '#b45309', fond: '#fef3c7', texte: 'Des documents ou informations compl&eacute;mentaires sont n&eacute;cessaires pour poursuivre l\'&eacute;tude de votre dossier.' }
};

const badge = (label, couleur, fond) =>
  `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${fond};color:${couleur};font-size:13px;font-weight:bold;">${esc(label)}</span>`;

const fiche = (lignes) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf9;border:1px solid #e2e8e4;border-radius:8px;margin:20px 0;">${lignes
    .map(([k, v]) => `<tr><td style="padding:10px 16px;font-size:14px;color:#6b7280;width:40%;">${k}</td><td style="padding:10px 16px;font-size:14px;color:#111827;font-weight:bold;">${v}</td></tr>`)
    .join('')}</table>`;

const typeLisible = (t) => esc(String(t || '').replace(/_/g, ' '));

function gabarit({ preheader, titre, contenu, bouton }) {
  const btn = bouton
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr><td style="background:${VERT};border-radius:8px;"><a href="${esc(bouton.url)}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;">${esc(bouton.label)}</a></td></tr></table>`
    : '';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titre)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f3;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f3;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8e4;">
<tr><td style="background:${VERT};padding:24px 32px;font-family:Arial,Helvetica,sans-serif;"><span style="font-size:22px;font-weight:bold;color:#ffffff;">Assurance ARO</span><br><span style="font-size:13px;color:#fde68a;">Leader malgache depuis 1976</span></td></tr>
<tr><td style="height:4px;background:${OR};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:16px;line-height:1.6;">
<h1 style="margin:0 0 16px;font-size:22px;color:${VERT};">${esc(titre)}</h1>
${contenu}
${btn}
</td></tr>
<tr><td style="padding:20px 32px;background:#f8faf9;border-top:1px solid #e2e8e4;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b7280;line-height:1.5;">Assurances ARO Madagascar &middot; Message automatique, merci de ne pas y r&eacute;pondre.</td></tr>
</table></td></tr></table></body></html>`;
}

export function emailConfirmationAssure({ nom, numero, type }) {
  return gabarit({
    preheader: 'Votre d\u00e9claration est bien re\u00e7ue et mise \u00e0 l\'\u00e9tude.',
    titre: 'Votre d\u00e9claration est mise \u00e0 l\'\u00e9tude',
    contenu:
      `<p style="margin:0 0 12px;">Bonjour ${esc(nom || '')},</p>` +
      `<p style="margin:0 0 12px;">Nous avons bien re&ccedil;u votre d&eacute;claration. Elle est d&egrave;s &agrave; pr&eacute;sent <b>mise &agrave; l'&eacute;tude</b> par nos services.</p>` +
      fiche([
        ['Num&eacute;ro de d&eacute;claration', esc(numero)],
        ['Type de sinistre', typeLisible(type)],
        ['Statut', badge('Mise \u00e0 l\'\u00e9tude', '#1d4ed8', '#dbeafe')]
      ]) +
      `<p style="margin:0;">Nous reviendrons vers vous d&egrave;s que votre dossier aura &eacute;t&eacute; trait&eacute;.</p>`,
    bouton: { label: 'Suivre ma d\u00e9claration', url: lienAssure() }
  });
}

export function emailNouvelleDeclarationAdmin({ numero, type, assure }) {
  const date = new Date().toLocaleString('fr-FR', { timeZone: 'Indian/Antananarivo' });
  return gabarit({
    preheader: 'Une nouvelle d\u00e9claration attend votre validation.',
    titre: 'Nouvelle d\u00e9claration \u00e0 traiter',
    contenu:
      `<p style="margin:0 0 12px;">Une nouvelle d&eacute;claration vient d'&ecirc;tre d&eacute;pos&eacute;e et attend votre validation.</p>` +
      fiche([
        ['Num&eacute;ro', esc(numero)],
        ['Type de sinistre', typeLisible(type)],
        ['Assur&eacute;', esc(assure || 'Non renseign\u00e9')],
        ['D&eacute;pos&eacute;e le', esc(date)]
      ]),
    bouton: { label: 'Ouvrir le dossier', url: lienAdmin() }
  });
}

export function emailStatutAssure({ numero, nouveauStatut, commentaire }) {
  const s = STATUTS[nouveauStatut] || { label: String(nouveauStatut || 'Mis \u00e0 jour'), couleur: '#4b5563', fond: '#f3f4f6', texte: 'Le statut de votre d&eacute;claration a &eacute;t&eacute; mis &agrave; jour.' };
  const note = commentaire
    ? `<div style="border-left:4px solid ${OR};background:#fffbeb;padding:12px 16px;margin:16px 0;font-size:14px;"><b>Message de nos &eacute;quipes</b><br>${esc(commentaire).replace(/\n/g, '<br>')}</div>`
    : '';
  return {
    subject: `Votre d\u00e9claration ${numero} : ${s.label}`,
    html: gabarit({
      preheader: `Statut de votre d\u00e9claration ${numero} : ${s.label}`,
      titre: 'Mise \u00e0 jour de votre d\u00e9claration',
      contenu:
        `<p style="margin:0 0 12px;">${s.texte}</p>` +
        fiche([['Num&eacute;ro de d&eacute;claration', esc(numero)], ['Nouveau statut', badge(s.label, s.couleur, s.fond)]]) +
        note,
      bouton: { label: 'Voir ma d\u00e9claration', url: lienAssure() }
    })
  };
}