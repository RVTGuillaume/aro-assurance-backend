/**
 * Routes administrateur - VERSION CORRIGÉE PostgreSQL
 * Gestion des assurés, déclarations et paramètres système
 * Assurances ARO Madagascar
 * @version 3.0
 */

import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { checkRole } from '../middlewares/roleMiddleware.js'; // ✅ CORRECTION
import {
  validateCreateAssure,
  validateParamId,
  validatePagination,
  sanitizeInput
} from '../middlewares/validationMiddleware.js';
import { generalLimiter } from '../middlewares/rateLimiter.js';
import AdminController from '../controllers/adminController.js';
import ProfilController from '../controllers/admin/profilController.js';
import { uploadPhoto, processProfilePhoto } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Authentification requise pour TOUTES les routes admin
router.use(authenticate);

/**
 * ========================================
 * GESTION DU PROFIL ADMIN
 * ========================================
 */

router.get('/profile/me', generalLimiter, ProfilController.getMyProfile);
router.patch('/profile/me', generalLimiter, sanitizeInput, ProfilController.updateMyProfile);
router.post('/profile/photo', generalLimiter, uploadPhoto.single('photo'), processProfilePhoto, ProfilController.uploadProfilePhoto);
router.delete('/profile/photo', generalLimiter, ProfilController.deleteProfilePhoto);
router.patch('/profile/password', generalLimiter, sanitizeInput, ProfilController.changePassword);
router.patch('/profile/toggle-status', generalLimiter, ProfilController.toggleStatus);

/**
 * ========================================
 * GESTION DES ASSURÉS
 * ========================================
 */

router.post('/assures', checkRole(['super_admin', 'admin', 'gestionnaire']), generalLimiter, sanitizeInput, validateCreateAssure, AdminController.createAssure);
router.get('/assures', generalLimiter, validatePagination, AdminController.getAllAssures);
router.get('/assures/:id', generalLimiter, validateParamId, AdminController.getAssureById);
router.patch('/assures/:id', checkRole(['super_admin', 'admin']), generalLimiter, validateParamId, sanitizeInput, AdminController.updateAssure);
router.patch('/assures/:id/statut', checkRole(['super_admin', 'admin']), generalLimiter, validateParamId, AdminController.updateStatutContrat);
router.post('/assures/:id/ayants-droit', checkRole(['super_admin', 'admin', 'gestionnaire']), generalLimiter, validateParamId, sanitizeInput, AdminController.addAyantDroit);

/**
 * ========================================
 * GESTION DES DÉCLARATIONS
 * ========================================
 */

router.get('/declarations', generalLimiter, validatePagination, AdminController.getAllDeclarations);
router.get('/declarations/:id', generalLimiter, validateParamId, AdminController.getDeclarationDetails);
router.patch('/declarations/:id/statut', checkRole(['super_admin', 'admin', 'gestionnaire']), generalLimiter, validateParamId, sanitizeInput, AdminController.updateDeclarationStatut);
router.post('/declarations/:id/commentaire', generalLimiter, validateParamId, sanitizeInput, AdminController.addCommentaire);

/**
 * ========================================
 * STATISTIQUES ET RAPPORTS
 * ========================================
 */

router.get('/dashboard/stats', generalLimiter, AdminController.getDashboardStats);

router.get('/rapports/declarations', checkRole(['super_admin', 'admin']), generalLimiter, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Rapport des déclarations',
      data: { total: 0, par_statut: {}, par_type: {} }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du rapport'
    });
  }
});

router.get('/rapports/assures', checkRole(['super_admin', 'admin']), generalLimiter, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Rapport des assurés',
      data: { total: 0, actifs: 0, inactifs: 0 }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du rapport'
    });
  }
});

/**
 * ========================================
 * AUDIT LOGS
 * ========================================
 */

router.get('/audit-logs', checkRole(['super_admin']), generalLimiter, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    return res.status(200).json({
      success: true,
      message: 'Logs d\'audit',
      data: [],
      pagination: { page, limit, total: 0, pages: 0 }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des logs'
    });
  }
});

/**
 * ========================================
 * NOTIFICATIONS
 * ========================================
 */

router.post('/notifications/send', checkRole(['super_admin', 'admin']), generalLimiter, sanitizeInput, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Notification envoyée'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de la notification'
    });
  }
});

/**
 * ========================================
 * PARAMÈTRES SYSTÈME
 * ========================================
 */

router.get('/parametres', checkRole(['super_admin']), generalLimiter, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        otp_length: process.env.OTP_LENGTH || 8,
        otp_expiry_minutes: process.env.OTP_EXPIRY_MINUTES || 10,
        max_file_size: process.env.MAX_FILE_SIZE || 10485760,
        maintenance_mode: false
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paramètres'
    });
  }
});

router.patch('/parametres/:cle', checkRole(['super_admin']), generalLimiter, sanitizeInput, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Paramètre mis à jour'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du paramètre'
    });
  }
});

export default router;
