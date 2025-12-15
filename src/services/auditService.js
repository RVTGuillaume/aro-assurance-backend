/**
 * Service d'audit et de traçabilité
 * Enregistrement de toutes les actions importantes
 * Assurances ARO Madagascar
 */

import pool from '../config/database.js';

class AuditService {
  /**
   * Enregistrer une action dans les logs d'audit
   */
  static async log({
    acteur_type,
    acteur_id,
    action,
    table_affectee = null,
    enregistrement_id = null,
    resultat,
    message_erreur = null,
    details_json = null,
    ip_address,
    user_agent
  }) {
    try {
      await pool.query(
        `INSERT INTO audit_logs (
          acteur_type, acteur_id, action, table_affectee, enregistrement_id,
          resultat, message_erreur, details_json, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          acteur_type,
          acteur_id || null,
          action,
          table_affectee,
          enregistrement_id,
          resultat,
          message_erreur,
          details_json ? JSON.stringify(details_json) : null,
          ip_address,
          user_agent
        ]
      );

      return true;
    } catch (error) {
      console.error('Erreur enregistrement audit:', error);
      return false;
    }
  }

  /**
   * Récupérer les logs d'audit avec filtres
   */
  static async getLogs(filters = {}) {
    try {
      const {
        acteur_type,
        acteur_id,
        action,
        date_debut,
        date_fin,
        page = 1,
        limit = 50
      } = filters;

      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params = [];

      if (acteur_type) {
        query += ' AND acteur_type = ?';
        params.push(acteur_type);
      }

      if (acteur_id) {
        query += ' AND acteur_id = ?';
        params.push(acteur_id);
      }

      if (action) {
        query += ' AND action = ?';
        params.push(action);
      }

      if (date_debut) {
        query += ' AND timestamp_action >= ?';
        params.push(date_debut);
      }

      if (date_fin) {
        query += ' AND timestamp_action <= ?';
        params.push(date_fin);
      }

      query += ' ORDER BY timestamp_action DESC LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);

      const [logs] = await pool.query(query, params);

      return logs;
    } catch (error) {
      throw new Error(`Erreur récupération logs: ${error.message}`);
    }
  }

  /**
   * Nettoyer les anciens logs (garder 1 an)
   */
  static async cleanOldLogs(daysToKeep = 365) {
    try {
      const [result] = await pool.query(
        'DELETE FROM audit_logs WHERE timestamp_action < DATE_SUB(NOW(), INTERVAL ? DAY)',
        [daysToKeep]
      );

      console.log(`🧹 ${result.affectedRows} logs d'audit supprimés`);
      return result.affectedRows;
    } catch (error) {
      console.error('Erreur nettoyage logs:', error);
      return 0;
    }
  }
}

export default AuditService;
