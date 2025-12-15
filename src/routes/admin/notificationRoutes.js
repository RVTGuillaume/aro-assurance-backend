/**
 * Routes Notifications Admin
 * ARO Assurance Madagascar
 */
import express from 'express';
import NotificationController from '../../controllers/admin/notificationController.js';
import { authenticate, requireAdmin } from '../../middlewares/authMiddleware.js';

const router = express.Router();

console.log('🔔 Routes notifications admin chargées');

// Authentification admin requise
router.use(authenticate);
router.use(requireAdmin);

// GET /api/admin/notifications - Liste des notifications
router.get('/', NotificationController.getAllNotifications);

// PUT /api/admin/notifications/:id/lire - Marquer une notification comme lue
router.put('/:id/lire', NotificationController.markAsRead);

// PUT /api/admin/notifications/lire-tout - Marquer toutes comme lues
router.put('/lire-tout', NotificationController.markAllAsRead);

export default router;
