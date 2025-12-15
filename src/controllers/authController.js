/**
 * Contrôleur d'authentification - VERSION POSTGRESQL
 * ARO Assurance Madagascar
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { createOTP, verifyOTP } from '../services/otpService.js';
import { sendOTPEmail } from '../services/emailService.js';

/**
 * LOGIN ADMINISTRATEUR
 */
export const loginAdmin = async (req, res) => {
  const { identifier, mot_de_passe } = req.body;

  try {
    console.log('🔐 Tentative login admin:', identifier);

    if (!identifier || !mot_de_passe) {
      return res.status(400).json({
        success: false,
        message: 'Email/username et mot de passe requis',
      });
    }

    // ✅ POSTGRESQL
    const result = await pool.query(
      `SELECT id, username, email, mot_de_passe_hash, nom_complet, role, statut
       FROM aro_assurance_db.administrateurs 
       WHERE (email = $1 OR username = $2) AND statut = 'actif'`,
      [identifier, identifier]
    );

    console.log('👤 Admins trouvés:', result.rowCount);

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'Identifiant ou mot de passe incorrect',
      });
    }

    const admin = result.rows[0];
    console.log('🔑 Vérification mot de passe...');

    const isPasswordValid = await bcrypt.compare(
      mot_de_passe,
      admin.mot_de_passe_hash
    );

    console.log('✅ Mot de passe valide:', isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Identifiant ou mot de passe incorrect',
      });
    }

    await pool.query(
      'UPDATE aro_assurance_db.administrateurs SET derniere_connexion = NOW() WHERE id = $1',
      [admin.id]
    );

    const token = jwt.sign(
      {
        id: admin.id,
        type: 'admin',
        role: admin.role,
        email: admin.email,
      },
      process.env.JWT_SECRET || 'votre_secret_jwt_super_securise',
      { expiresIn: '24h' }
    );

    console.log('🎫 Token généré pour admin:', admin.email);

    return res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        user: {
          id: admin.id,
          type: 'admin',
          role: admin.role,
          username: admin.username,
          email: admin.email,
          nom_complet: admin.nom_complet,
        },
      },
    });
  } catch (error) {
    console.error('❌ Erreur login admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      error: error.message,
    });
  }
};

/**
 * LOGIN ASSURÉ
 */
export const loginAssure = async (req, res) => {
  try {
    const { numero_dossier, numero_police, numero_compte, nom_complet } = req.body;

    console.log('🔐 Tentative login assuré:', numero_dossier);

    if (!numero_dossier || !numero_police || !numero_compte || !nom_complet) {
      return res.status(400).json({
        success: false,
        message: 'Tous les identifiants sont requis'
      });
    }

    // ✅ POSTGRESQL
    const result = await pool.query(
      `SELECT * FROM aro_assurance_db.assures 
       WHERE numero_dossier = $1 
       AND numero_police = $2 
       AND numero_compte = $3 
       AND nom_complet = $4
       AND statut_contrat = 'actif'`,
      [
        numero_dossier.trim().toUpperCase(),
        numero_police.trim().toUpperCase(),
        numero_compte.trim().toUpperCase(),
        nom_complet.trim()
      ]
    );

    console.log('👤 Assurés trouvés:', result.rowCount);

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects'
      });
    }

    const assure = result.rows[0];

    const token = jwt.sign(
      {
        id: assure.id,
        type: 'assure',
        numero_dossier: assure.numero_dossier,
        nom_complet: assure.nom_complet,
      },
      process.env.JWT_SECRET || 'votre_secret_jwt_super_securise',
      { expiresIn: '24h' }
    );

    console.log('🎫 Token généré pour assuré:', assure.nom_complet);

    try {
      await pool.query(
        `INSERT INTO aro_assurance_db.sessions_assures 
        (assure_id, token_jwt, ip_address, user_agent, est_actif, date_expiration) 
        VALUES ($1, $2, $3, $4, TRUE, NOW() + INTERVAL '24 hours')`,
        [
          assure.id,
          token,
          req.ip || req.connection?.remoteAddress || '127.0.0.1',
          req.get('user-agent') || 'Unknown'
        ]
      );
      console.log('✅ Session créée pour assuré ID:', assure.id);
    } catch (sessionError) {
      console.warn('⚠️ Erreur création session:', sessionError.message);
    }

    return res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        user: {
          id: assure.id,
          type: 'assure',
          numero_dossier: assure.numero_dossier,
          numero_police: assure.numero_police,
          numero_compte: assure.numero_compte,
          nom_complet: assure.nom_complet,
          email: assure.email,
          telephone: assure.telephone,
          type_assure: assure.type_assure,
          agence: assure.agence,
        },
      },
    });
  } catch (error) {
    console.error('❌ Erreur login assuré:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
    });
  }
};

/**
 * DEMANDE DE RÉINITIALISATION DE MOT DE PASSE
 */
export const requestPasswordReset = async (req, res) => {
  try {
    const { identifier } = req.body;

    console.log('🔄 Demande réinitialisation pour:', identifier);

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Email ou nom d\'utilisateur requis'
      });
    }

    const result = await pool.query(
      `SELECT id, email, nom_complet FROM aro_assurance_db.administrateurs 
       WHERE (email = $1 OR username = $2) AND statut = 'actif'`,
      [identifier, identifier]
    );

    if (result.rowCount === 0) {
      return res.json({
        success: true,
        message: 'Si cet email existe, un code de vérification a été envoyé'
      });
    }

    const admin = result.rows[0];

    const { otp, expiresAt } = await createOTP(
      admin.id,
      req.ip || '0.0.0.0',
      req.get('user-agent') || ''
    );

    await sendOTPEmail(
      admin.email,
      admin.nom_complet,
      otp,
      parseInt(process.env.OTP_EXPIRY_MINUTES) || 3
    );

    console.log(`✅ OTP envoyé à ${admin.email}`);

    await pool.query(
      `INSERT INTO aro_assurance_db.audit_logs 
      (acteur_type, acteur_id, action, resultat, ip_address, user_agent) 
      VALUES ($1, $2, $3, $4, $5, $6)`,
      ['admin', admin.id, 'PASSWORD_RESET_REQUEST', 'succes', req.ip, req.get('user-agent')]
    );

    return res.json({
      success: true,
      message: 'Code de vérification envoyé par email',
      data: {
        expiresAt,
        expiresInMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 3
      }
    });

  } catch (error) {
    console.error('❌ Erreur demande reset:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du code de vérification'
    });
  }
};

/**
 * RÉINITIALISATION DE MOT DE PASSE AVEC OTP
 */
export const resetPassword = async (req, res) => {
  try {
    const { identifier, nouveau_mot_de_passe } = req.body;

    console.log('🔑 Réinitialisation mot de passe pour:', identifier);

    if (!identifier || !nouveau_mot_de_passe) {
      return res.status(400).json({
        success: false,
        message: 'Email et nouveau mot de passe requis'
      });
    }

    if (nouveau_mot_de_passe.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 8 caractères'
      });
    }

    const adminResult = await pool.query(
      `SELECT id, email FROM aro_assurance_db.administrateurs 
       WHERE (email = $1 OR username = $2) AND statut = 'actif'`,
      [identifier, identifier]
    );

    if (adminResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const admin = adminResult.rows[0];

    const otpResult = await pool.query(
      `SELECT id FROM aro_assurance_db.otp_reinitialisations 
       WHERE admin_id = $1 
       AND est_utilise = true 
       AND date_creation >= NOW() - INTERVAL '10 minutes'
       ORDER BY date_creation DESC 
       LIMIT 1`,
      [admin.id]
    );

    if (otpResult.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Code OTP non vérifié ou expiré. Veuillez recommencer.'
      });
    }

    console.log('✅ OTP vérifié trouvé pour admin', admin.id);

    const newPasswordHash = await bcrypt.hash(nouveau_mot_de_passe, 10);

    await pool.query(
      'UPDATE aro_assurance_db.administrateurs SET mot_de_passe_hash = $1, date_modification = NOW() WHERE id = $2',
      [newPasswordHash, admin.id]
    );

    console.log(`✅ Mot de passe réinitialisé pour admin ${admin.id}`);

    await pool.query(
      `INSERT INTO aro_assurance_db.audit_logs 
      (acteur_type, acteur_id, action, resultat, ip_address, user_agent) 
      VALUES ($1, $2, $3, $4, $5, $6)`,
      ['admin', admin.id, 'PASSWORD_RESET_SUCCESS', 'succes', req.ip, req.get('user-agent')]
    );

    return res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur reset password:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la réinitialisation du mot de passe'
    });
  }
};

export const logout = async (req, res) => {
  console.log('👋 Déconnexion');
  return res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
};

export const getMe = async (req, res) => {
  return res.json({
    success: true,
    data: req.user
  });
};
