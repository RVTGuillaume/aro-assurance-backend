/**
 * Middleware pour vérifier que l'utilisateur est admin
 */

const adminMiddleware = (req, res, next) => {
  // Vérifier que l'utilisateur est authentifié
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Non authentifié'
    });
  }

  // Vérifier que c'est un admin
  if (req.user.type !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs'
    });
  }

  next();
};

export default adminMiddleware;
