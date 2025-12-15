import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import AssureDeclarationController from '../controllers/assureDeclarationController.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification assuré
router.use(authenticate);

// Créer une déclaration
router.post('/', AssureDeclarationController.createDeclaration);

// Lister mes déclarations
router.get('/', AssureDeclarationController.getMyDeclarations);

// Détails d'une déclaration
router.get('/:id', AssureDeclarationController.getDeclarationDetails);

export default router;
