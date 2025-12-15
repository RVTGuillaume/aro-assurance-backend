/**
 * Routes d'authentification
 * Gestion des connexions et réinitialisation mot de passe
 * Assurances ARO Madagascar
 * @version 2.1 - CORRIGÉ AVEC LOGS COMPLETS
 */

import express from 'express';
import {
  loginAssure,
  loginAdmin,
  requestPasswordReset,
  resetPassword
} from '../controllers/authController.js';
import {
  validateLoginAssure,
  validateLoginAdmin,
  validatePasswordResetRequest,
  validatePasswordReset,
  sanitizeInput,
  handleValidationErrors
} from '../middlewares/validationMiddleware.js';
import {
  authLimiter,
  otpLimiter,
  strictLimiter
} from '../middlewares/rateLimiter.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import pool from '../config/database.js';
import AssureModel from '../models/Assure.js';
import AdministrateurModel from '../models/Administrateur.js';
import { verifyOTP } from '../services/otpService.js';

const router = express.Router();

/**
 * @route   POST /api/auth/login-assure
 * @desc    Connexion d'un assuré avec 4 identifiants
 * @access  Public
 * @body    { numero_dossier, numero_police, numero_compte, nom_complet }
 */
router.post(
  '/login-assure',
  authLimiter,
  sanitizeInput,
  validateLoginAssure,
  handleValidationErrors,
  async (req, res, next) => {
    console.log('🔐 [AUTH] POST /login-assure - START');
    console.log('📋 [AUTH] Body keys:', Object.keys(req.body));
    next();
  },
  loginAssure
);

/**
 * @route   POST /api/auth/login-admin
 * @desc    Connexion d'un administrateur
 * @access  Public
 * @body    { identifier, mot_de_passe }
 */
router.post(
  '/login-admin',
  authLimiter,
  sanitizeInput,
  validateLoginAdmin,
  handleValidationErrors,
  async (req, res, next) => {
    console.log('🔐 [AUTH] POST /login-admin - START');
    console.log('📋 [AUTH] Identifier:', req.body.identifier?.substring(0, 10) + '...');
    next();
  },
  loginAdmin
);

/**
 * @route   POST /api/auth/request-password-reset
 * @desc    Demande de réinitialisation mot de passe (Admin uniquement)
 * @access  Public
 * @body    { identifier }
 */
router.post(
  '/request-password-reset',
  otpLimiter,
  sanitizeInput,
  validatePasswordResetRequest,
  handleValidationErrors,
  async (req, res, next) => {
    console.log('📧 [AUTH] POST /request-password-reset - START');
    console.log('📋 [AUTH] Identifier:', req.body.identifier);
    next();
  },
  requestPasswordReset
);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Vérifier le code OTP (avant reset password)
 * @access  Public
 * @body    { identifier, code_otp }
 */
router.post(
  '/verify-otp',
  strictLimiter,
  sanitizeInput,
  async (req, res) => {
    console.log('🔍 [OTP] POST /verify-otp - START');
    const startTime = Date.now();
    
    try {
      const { identifier, code_otp } = req.body;

      console.log('📋 [OTP] Identifier:', identifier);
      console.log('🔑 [OTP] Code OTP length:', code_otp?.length);

      // Validation des champs requis
      if (!identifier || !code_otp) {
        console.log('❌ [OTP] Champs manquants');
        return res.status(400).json({
          success: false,
          message: 'Email et code OTP requis'
        });
      }

      // Rechercher l'admin
      console.log('🔍 [OTP] Recherche admin dans la base...');
      const [admins] = await pool.execute(
        `SELECT id, email, nom_complet, statut 
         FROM administrateurs 
         WHERE (email = ? OR username = ?) AND statut = 'actif'`,
        [identifier, identifier]
      );

      if (admins.length === 0) {
        console.log('❌ [OTP] Admin non trouvé:', identifier);
        
        // Log audit (tentative échouée)
        await pool.execute(
          `INSERT INTO audit_logs 
          (acteur_type, acteur_id, action, resultat, ip_address, user_agent, details) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            'admin', 
            null, 
            'VERIFY_OTP_FAILED', 
            'echec', 
            req.ip, 
            req.get('user-agent'),
            `Utilisateur non trouvé: ${identifier}`
          ]
        );
        
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      const admin = admins[0];
      console.log('✅ [OTP] Admin trouvé:', {
        id: admin.id,
        email: admin.email,
        nom: admin.nom_complet
      });

      // Vérifier le code OTP
      console.log('🔍 [OTP] Vérification du code...');
      const otpVerification = await verifyOTP(admin.email, code_otp);

      if (!otpVerification.valid) {
        console.log('❌ [OTP] Code invalide:', otpVerification.message);
        
        // Log audit (OTP invalide)
        await pool.execute(
          `INSERT INTO audit_logs 
          (acteur_type, acteur_id, action, resultat, ip_address, user_agent, details) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            'admin', 
            admin.id, 
            'VERIFY_OTP_FAILED', 
            'echec', 
            req.ip, 
            req.get('user-agent'),
            otpVerification.message
          ]
        );
        
        return res.status(400).json({
          success: false,
          message: otpVerification.message,
          attemptsLeft: otpVerification.attemptsLeft
        });
      }

      console.log('✅ [OTP] Code vérifié avec succès');

      // Log audit (succès)
      await pool.execute(
        `INSERT INTO audit_logs 
        (acteur_type, acteur_id, action, resultat, ip_address, user_agent) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        ['admin', admin.id, 'OTP_VERIFIED', 'succes', req.ip, req.get('user-agent')]
      );

      const duration = Date.now() - startTime;
      console.log(`✅ [OTP] Vérification réussie en ${duration}ms`);

      return res.json({
        success: true,
        message: 'Code OTP vérifié avec succès',
        data: {
          adminId: admin.id,
          email: admin.email
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [OTP] Erreur après ${duration}ms:`, error.message);
      console.error('❌ [OTP] Stack:', error.stack);
      
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification du code',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Réinitialisation mot de passe avec code OTP
 * @access  Public
 * @body    { identifier, code_otp, nouveau_mot_de_passe }
 */
router.post(
  '/reset-password',
  strictLimiter,
  sanitizeInput,
  validatePasswordReset,
  handleValidationErrors,
  async (req, res, next) => {
    console.log('🔐 [RESET] POST /reset-password - START');
    console.log('📋 [RESET] Identifier:', req.body.identifier);
    next();
  },
  resetPassword
);

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnexion (invalide la session)
 * @access  Private (Assuré ou Admin)
 */
router.post('/logout', authenticate, async (req, res) => {
  console.log('👋 [LOGOUT] POST /logout - START');
  console.log('👤 [LOGOUT] User type:', req.user?.type);
  console.log('👤 [LOGOUT] User ID:', req.user?.id);
  
  try {
    // Invalider la session si assuré
    if (req.user.type === 'assure') {
      const token = req.headers.authorization?.substring(7);
      
      if (token) {
        console.log('🔒 [LOGOUT] Invalidation session assuré...');
        const [result] = await pool.execute(
          'UPDATE sessions_assures SET est_actif = FALSE WHERE assure_id = ? AND token_jwt = ?',
          [req.user.id, token]
        );
        console.log('✅ [LOGOUT] Sessions invalidées:', result.affectedRows);
      }
    }

    // Log audit
    await pool.execute(
      `INSERT INTO audit_logs 
      (acteur_type, acteur_id, action, resultat, ip_address, user_agent) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.type, req.user.id, 'LOGOUT', 'succes', req.ip, req.get('user-agent')]
    );

    console.log('✅ [LOGOUT] Déconnexion réussie');
    
    return res.status(200).json({
      success: true,
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    console.error('❌ [LOGOUT] Erreur:', error.message);
    console.error('❌ [LOGOUT] Stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/auth/verify-token
 * @desc    Vérifie la validité du token
 * @access  Private
 */
router.get('/verify-token', authenticate, (req, res) => {
  console.log('🔍 [TOKEN] GET /verify-token');
  console.log('✅ [TOKEN] Token valide pour:', req.user.nom_complet);
  
  return res.status(200).json({
    success: true,
    message: 'Token valide',
    user: {
      id: req.user.id,
      type: req.user.type,
      nom_complet: req.user.nom_complet
    }
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Récupère les informations de l'utilisateur connecté
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
  console.log('👤 [ME] GET /me - START');
  console.log('📋 [ME] User type:', req.user.type);
  console.log('📋 [ME] User ID:', req.user.id);
  
  const startTime = Date.now();
  
  try {
    let userData;

    if (req.user.type === 'assure') {
      console.log('👤 [ME] Chargement profil assuré...');
      
      const assure = await AssureModel.findById(req.user.id);
      
      if (!assure) {
        console.log('❌ [ME] Assuré non trouvé');
        return res.status(404).json({
          success: false,
          message: 'Assuré non trouvé'
        });
      }
      
      const ayants_droit = await AssureModel.getAyantsDroit(req.user.id);
      console.log('✅ [ME] Ayants droit chargés:', ayants_droit.length);

      userData = {
        id: assure.id,
        type: 'assure',
        numero_dossier: assure.numero_dossier,
        numero_police: assure.numero_police,
        nom_complet: assure.nom_complet,
        email: assure.email,
        telephone: assure.telephone,
        agence: assure.agence,
        type_assure: assure.type_assure,
        statut_contrat: assure.statut_contrat,
        ayants_droit
      };
      
    } else if (req.user.type === 'admin') {
      console.log('👨‍💼 [ME] Chargement profil admin...');
      
      const admin = await AdministrateurModel.findById(req.user.id);
      
      if (!admin) {
        console.log('❌ [ME] Admin non trouvé');
        return res.status(404).json({
          success: false,
          message: 'Administrateur non trouvé'
        });
      }

      userData = {
        id: admin.id,
        type: 'admin',
        nom_complet: admin.nom_complet,
        email: admin.email,
        username: admin.username,
        role: admin.role
      };
      
    } else {
      console.log('❌ [ME] Type utilisateur invalide:', req.user.type);
      return res.status(400).json({
        success: false,
        message: 'Type d\'utilisateur invalide'
      });
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [ME] Profil chargé en ${duration}ms`);

    return res.status(200).json({
      success: true,
      data: userData
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [ME] Erreur après ${duration}ms:`, error.message);
    console.error('❌ [ME] Stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/auth/health
 * @desc    Health check pour vérifier que l'API répond
 * @access  Public
 */
router.get('/health', (req, res) => {
  console.log('💚 [HEALTH] GET /health');
  
  return res.json({
    success: true,
    message: 'Auth API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
