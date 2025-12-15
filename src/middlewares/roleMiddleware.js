/**
 * Middleware de vérification des rôles
 * Contrôle d'accès basé sur les rôles administrateurs
 * Assurances ARO Madagascar
 */

/**
 * Middleware pour vérifier le rôle administrateur
 * @param {Array} allowedRoles - Rôles autorisés ['super_admin', 'admin', 'gestionnaire']
 */
export const checkRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    if (req.user.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux administrateurs'
      });
    }

    if (allowedRoles.length === 0) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Accès refusé. Rôles autorisés: ${allowedRoles.join(', ')}`,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Vérifie si l'utilisateur est super admin
 */
export const isSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.type !== 'admin' || req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux super administrateurs'
    });
  }
  next();
};

/**
 * Vérifie si l'utilisateur est admin ou super admin
 */
export const isAdminOrAbove = (req, res, next) => {
  if (!req.user || req.user.type !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs'
    });
  }

  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Permissions insuffisantes'
    });
  }

  next();
};

/**
 * Vérifie si l'utilisateur peut gérer un autre utilisateur
 */
export const canManageUser = (targetRole) => {
  return (req, res, next) => {
    const userRole = req.user.role;

    const roleHierarchy = {
      super_admin: 3,
      admin: 2,
      gestionnaire: 1
    };

    const userLevel = roleHierarchy[userRole] || 0;
    const targetLevel = roleHierarchy[targetRole] || 0;

    if (userLevel <= targetLevel) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas gérer un utilisateur de ce niveau'
      });
    }

    next();
  };
};

/**
 * ✅ POSTGRESQL: Enregistre l'accès à une ressource sensible
 */
export const logSensitiveAccess = async (req, res, next) => {
  try {
    const pool = await import('../config/database.js').then(m => m.default);
    
    await pool.query(
      `INSERT INTO audit_logs (acteur_type, acteur_id, action, table_affectee, resultat, details_json, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.user.type,
        req.user.id,
        'SENSITIVE_ACCESS',
        req.baseUrl + req.path,
        'succes',
        JSON.stringify({ method: req.method, params: req.params }),
        req.ip,
        req.get('user-agent')
      ]
    );
  } catch (error) {
    console.error('Erreur log accès sensible:', error);
  }
  
  next();
};

export default {
  checkRole,
  isSuperAdmin,
  isAdminOrAbove,
  canManageUser,
  logSensitiveAccess
};
