/**
 * Middleware d'authentification
 * Vérifie le token JWT et l'identité de l'utilisateur
 * ARO Assurance Madagascar
 * @version 3.0 - POSTGRESQL
 */

import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

/**
 * Middleware d'authentification principal
 * Vérifie le token JWT dans le header Authorization
 */
export const authenticate = async (req, res, next) => {
  console.log('🔐 [AUTH] Vérification authentification...');
  console.log('🔍 [AUTH] URL:', req.originalUrl);
  console.log('🔍 [AUTH] Method:', req.method);
  
  try {
    // Récupérer le token depuis le header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.log('❌ [AUTH] Aucun header Authorization');
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant',
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.log('❌ [AUTH] Format header invalide:', authHeader.substring(0, 20));
      return res.status(401).json({
        success: false,
        message: 'Format de token invalide. Utilisez: Bearer <token>',
      });
    }

    const token = authHeader.substring(7); // Enlever "Bearer "
    console.log('🔑 [AUTH] Token reçu (longueur):', token.length);

    // Vérifier et décoder le token
    let decoded;
    try {
      const jwtSecret = process.env.JWT_SECRET || 'votre_secret_jwt_super_securise';
      decoded = jwt.verify(token, jwtSecret);
      console.log('✅ [AUTH] Token décodé:', {
        id: decoded.id,
        type: decoded.type,
        exp: new Date(decoded.exp * 1000).toISOString()
      });
    } catch (error) {
      console.log('❌ [AUTH] Erreur décodage token:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expiré. Veuillez vous reconnecter.',
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token invalide. Veuillez vous reconnecter.',
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Erreur de validation du token',
      });
    }

    // Vérifier que les champs requis sont présents
    if (!decoded.id || !decoded.type) {
      console.log('❌ [AUTH] Token incomplet:', decoded);
      return res.status(401).json({
        success: false,
        message: 'Token invalide: données manquantes',
      });
    }

    // ✅ POSTGRESQL: Récupérer les infos complètes de l'utilisateur
    if (decoded.type === 'assure') {
      console.log('👤 [AUTH] Type: Assuré - ID:', decoded.id);
      
      const result = await pool.query(
        'SELECT * FROM assures WHERE id = $1 AND statut_contrat = $2',
        [decoded.id, 'actif']
      );

      if (result.rows.length === 0) {
        console.log('❌ [AUTH] Assuré non trouvé ou inactif - ID:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'Compte introuvable ou inactif',
        });
      }

      const assure = result.rows[0];
      req.user = {
        id: assure.id,
        type: 'assure',
        numero_dossier: assure.numero_dossier,
        nom_complet: assure.nom_complet,
        email: assure.email,
        telephone: assure.telephone,
        statut_contrat: assure.statut_contrat
      };

      console.log('✅ [AUTH] Assuré authentifié:', {
        id: req.user.id,
        nom: req.user.nom_complet,
        numero_dossier: req.user.numero_dossier
      });
      
    } else if (decoded.type === 'admin') {
      console.log('👨‍💼 [AUTH] Type: Admin - ID:', decoded.id);
      
      const result = await pool.query(
        'SELECT * FROM administrateurs WHERE id = $1 AND statut = $2',
        [decoded.id, 'actif']
      );

      if (result.rows.length === 0) {
        console.log('❌ [AUTH] Admin non trouvé ou inactif - ID:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'Compte administrateur introuvable ou inactif',
        });
      }

      const admin = result.rows[0];
      req.user = {
        id: admin.id,
        type: 'admin',
        role: admin.role,
        email: admin.email,
        nom_complet: admin.nom_complet,
        statut: admin.statut
      };

      console.log('✅ [AUTH] Admin authentifié:', {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      });
      
    } else {
      console.log('❌ [AUTH] Type utilisateur invalide:', decoded.type);
      return res.status(401).json({
        success: false,
        message: `Type d'utilisateur invalide: ${decoded.type}`,
      });
    }

    console.log('✅ [AUTH] Authentification réussie');
    // Passer au middleware suivant
    next();
    
  } catch (error) {
    console.error('❌ [AUTH] Erreur inattendue:', error.message);
    console.error('❌ [AUTH] Stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'authentification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Middleware pour vérifier que l'utilisateur est un assuré
 */
export const requireAssure = (req, res, next) => {
  console.log('🔒 [ASSURE] Vérification type utilisateur:', req.user?.type);
  
  if (!req.user) {
    console.log('❌ [ASSURE] Aucun utilisateur authentifié');
    return res.status(401).json({
      success: false,
      message: 'Authentification requise',
    });
  }

  if (req.user.type !== 'assure') {
    console.log('❌ [ASSURE] Type incorrect:', req.user.type);
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux assurés',
    });
  }

  console.log('✅ [ASSURE] Accès autorisé');
  next();
};

/**
 * ✅ Middleware simple pour vérifier que l'utilisateur est un admin
 */
export const requireAdmin = (req, res, next) => {
  console.log('🔒 [ADMIN] Vérification admin...');
  console.log('🔍 [ADMIN] User type:', req.user?.type);
  console.log('🔍 [ADMIN] User role:', req.user?.role);

  if (!req.user) {
    console.log('❌ [ADMIN] Aucun utilisateur authentifié');
    return res.status(401).json({
      success: false,
      message: 'Authentification requise',
    });
  }

  if (req.user.type !== 'admin') {
    console.log('❌ [ADMIN] Type incorrect:', req.user.type);
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs',
    });
  }

  console.log('✅ [ADMIN] Accès autorisé');
  next();
};

/**
 * Middleware avancé pour vérifier le rôle admin spécifique
 */
export const requireAdminRole = (requiredRoles = []) => {
  return (req, res, next) => {
    console.log('🔒 [ADMIN ROLE] Vérification rôle admin...');
    console.log('🔍 [ADMIN ROLE] User role:', req.user?.role);
    console.log('🔍 [ADMIN ROLE] Required roles:', requiredRoles);

    if (!req.user) {
      console.log('❌ [ADMIN ROLE] Aucun utilisateur authentifié');
      return res.status(401).json({
        success: false,
        message: 'Authentification requise',
      });
    }

    if (req.user.type !== 'admin') {
      console.log('❌ [ADMIN ROLE] Type incorrect:', req.user.type);
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux administrateurs',
      });
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(req.user.role)) {
      console.log('❌ [ADMIN ROLE] Rôle insuffisant:', {
        userRole: req.user.role,
        requiredRoles
      });
      return res.status(403).json({
        success: false,
        message: `Accès réservé aux rôles: ${requiredRoles.join(', ')}`,
      });
    }

    console.log('✅ [ADMIN ROLE] Accès autorisé');
    next();
  };
};

/**
 * Middleware pour logger les requêtes authentifiées
 */
export const logAuthenticatedRequest = (req, res, next) => {
  if (req.user) {
    console.log('📋 [LOG] Requête authentifiée:', {
      user: req.user.nom_complet || req.user.email,
      type: req.user.type,
      method: req.method,
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    });
  }
  next();
};

export default {
  authenticate,
  requireAssure,
  requireAdmin,
  requireAdminRole,
  logAuthenticatedRequest
};
