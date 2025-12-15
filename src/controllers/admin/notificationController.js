/**
 * Contrôleur Notifications Admin - VERSION POSTGRESQL ✅
 */
import pool from '../../config/database.js';

class NotificationController {
  
  /**
   * 📬 GET /api/admin/notifications
   */
  static async getAllNotifications(req, res) {
    try {
      const admin_id = req.user.id;
      const { limit = 50, offset = 0, est_lu } = req.query;

      let query = `
        SELECT 
          id, destinataire_type, destinataire_id, 
          titre, message, type_notification, 
          est_lu, date_creation
        FROM aro_assurance_db.notifications 
        WHERE destinataire_type = 'admin' AND destinataire_id = $1
      `;

      const params = [admin_id];
      let paramIndex = 2;

      if (est_lu !== undefined) {
        query += ` AND est_lu = $${paramIndex}`;
        params.push(est_lu === 'true' || est_lu === '1');
        paramIndex++;
      }

      query += ` ORDER BY date_creation DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await pool.query(query, params);

      // Compter les non lues
      const countResult = await pool.query(
        'SELECT COUNT(*) as count FROM aro_assurance_db.notifications WHERE destinataire_type = $1 AND destinataire_id = $2 AND est_lu = false',
        ['admin', admin_id]
      );

      const nonLues = parseInt(countResult.rows[0].count);

      return res.status(200).json({
        success: true,
        data: result.rows,
        total: result.rowCount,
        nonLues
      });

    } catch (error) {
      console.error('❌ Erreur getAllNotifications:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des notifications'
      });
    }
  }

  /**
   * ✅ PUT /api/admin/notifications/:id/lire
   */
  static async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const admin_id = req.user.id;

      await pool.query(
        'UPDATE aro_assurance_db.notifications SET est_lu = true WHERE id = $1 AND destinataire_id = $2',
        [id, admin_id]
      );

      return res.status(200).json({
        success: true,
        message: 'Notification marquée comme lue'
      });

    } catch (error) {
      console.error('❌ Erreur markAsRead:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour'
      });
    }
  }

  /**
   * ✅ PUT /api/admin/notifications/lire-tout
   */
  static async markAllAsRead(req, res) {
    try {
      const admin_id = req.user.id;

      const result = await pool.query(
        'UPDATE aro_assurance_db.notifications SET est_lu = true WHERE destinataire_type = $1 AND destinataire_id = $2 AND est_lu = false',
        ['admin', admin_id]
      );

      return res.status(200).json({
        success: true,
        message: `${result.rowCount} notifications marquées comme lues`
      });

    } catch (error) {
      console.error('❌ Erreur markAllAsRead:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour'
      });
    }
  }
}

export default NotificationController;
