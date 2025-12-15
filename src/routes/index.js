/**
 * Point d'entrée principal des routes
 * Centralise toutes les routes de l'API
 * Assurances ARO Madagascar
 */

import express from 'express';
import authRoutes from './authRoutes.js';
import declarationRoutes from './declarationRoutes.js';
import adminRoutes from './adminRoutes.js';
import fileRoutes from './fileRoutes.js';
import assureRoutes from './assureRoutes.js';
import adminDeclarationRoutes from './adminDeclarationRoutes.js'; // ✅ Import correct
import pool from '../config/database.js';
import assureProfilRoutes from './assure/assureProfilRoutes.js';
import notificationRoutes from './admin/notificationRoutes.js';

const router = express.Router();

console.log('🔥 [ROUTES] Initialisation des routes API...');

/**
 * @route   GET /api/
 * @desc    Route racine de l'API - Healthcheck
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bienvenue sur l\'API Assurances ARO Madagascar',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      declarations: '/api/declarations',
      admin: '/api/admin',
      adminDeclarations: '/api/admin/declarations', // ✅ Ajout endpoint admin
      files: '/api/files',
      assures: '/api/assures'
    }
  });
});

/**
 * @route   GET /api/health
 * @desc    Vérification de l'état de l'API et de la base de données
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    // Test connexion base de données
    await pool.query('SELECT 1');

    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'operational',
        database: 'operational',
        email: 'operational'
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'operational',
        database: 'down',
        email: 'unknown'
      },
      error: 'Service de base de données indisponible'
    });
  }
});

/**
 * @route   GET /api/version
 * @desc    Information sur la version de l'API
 * @access  Public
 */
router.get('/version', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'ARO Assurance API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    node_version: process.version,
    build_date: '2025-12-11',
    features: {
      authentication: 'JWT',
      otp_length: process.env.OTP_LENGTH || 8,
      max_file_size_mb: parseInt(process.env.MAX_FILE_SIZE || 10485760) / (1024 * 1024),
      session_duration: '24h (assurés) / 8h (admins)'
    }
  });
});

// ============================================
// MONTAGE DES ROUTES (ORDRE IMPORTANT)
// ============================================

// 1. Routes publiques (authentication)
router.use('/auth', authRoutes);
console.log('✅ [ROUTES] /api/auth - Chargées');

// 2. Routes assurés (déclarations côté assuré)
router.use('/declarations', declarationRoutes);
console.log('✅ [ROUTES] /api/declarations - Chargées');
// Routes profil assuré
router.use('/assure/profil', assureProfilRoutes);

// Routes notifications admin
router.use('/admin/notifications', notificationRoutes);
// 3. Routes admin (AVANT les routes spécifiques pour éviter les conflits)
// ⚠️ IMPORTANT : Mettre /admin/declarations AVANT /admin
router.use('/admin/declarations', adminDeclarationRoutes);
console.log('✅ [ROUTES] /api/admin/declarations - Chargées');

router.use('/admin', adminRoutes);
console.log('✅ [ROUTES] /api/admin - Chargées');

// 4. Routes fichiers
router.use('/files', fileRoutes);
console.log('✅ [ROUTES] /api/files - Chargées');

// 5. Routes assurés (gestion des profils)
router.use('/assures', assureRoutes);
console.log('✅ [ROUTES] /api/assures - Chargées');

console.log('✅ [ROUTES] Toutes les routes API sont chargées');
console.log('📋 [ROUTES] Routes disponibles:');
console.log('   - POST   /api/auth/login');
console.log('   - POST   /api/auth/logout');
console.log('   - GET    /api/declarations (assuré)');
console.log('   - POST   /api/declarations (assuré)');
console.log('   - GET    /api/admin/declarations (admin) ← NOUVEAU');
console.log('   - PATCH  /api/admin/declarations/:id/statut (admin) ← NOUVEAU');
console.log('   - GET    /api/admin/dashboard/stats (admin) ← NOUVEAU');

export default router;
