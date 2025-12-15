/**
 * Routes Profil Admin
 * ARO Assurance Madagascar
 */

import { Router } from 'express';
import { uploadPhoto, processProfilePhoto } from '../middlewares/uploadMiddleware.js';
import ProfilController from '../controllers/admin/profilController.js';

const router = Router();

// Récupérer le profil
router.get('/me', ProfilController.getMyProfile);

// Mettre à jour le profil
router.patch('/me', ProfilController.updateMyProfile);

// Upload photo
router.post('/photo', uploadPhoto.single('photo'), processProfilePhoto, ProfilController.uploadProfilePhoto);

// Supprimer photo
router.delete('/photo', ProfilController.deleteProfilePhoto);

// Changer mot de passe
router.patch('/password', ProfilController.changePassword);

// Toggle statut actif/inactif
router.patch('/toggle-status', ProfilController.toggleStatus);

console.log('✅ Routes profil admin chargées');

export default router;
