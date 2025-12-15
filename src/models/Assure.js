/**
 * Modèle Assuré - VERSION POSTGRESQL ✅
 * ARO Assurance Madagascar
 */

import pool from '../config/database.js';

class Assure {
  /**
   * Récupérer tous les assurés avec filtres
   */
  static async getAll(filters = {}) {
    try {
      const {
        search = '',
        statut = '',
        type = '',
        agence = '',
        page = 1,
        limit = 10
      } = filters;

      const offset = (page - 1) * limit;
      const conditions = [];
      const params = [];
      let paramIndex = 1;

      if (search) {
        conditions.push(`(
          a.nom_complet ILIKE $${paramIndex} OR 
          a.email ILIKE $${paramIndex + 1} OR 
          a.telephone ILIKE $${paramIndex + 2} OR 
          a.numero_dossier ILIKE $${paramIndex + 3}
        )`);
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam);
        paramIndex += 4;
      }

      if (statut) {
        conditions.push(`a.statut_contrat = $${paramIndex}`);
        params.push(statut);
        paramIndex++;
      }

      if (type) {
        conditions.push(`a.type_assure = $${paramIndex}`);
        params.push(type);
        paramIndex++;
      }

      if (agence) {
        conditions.push(`a.agence = $${paramIndex}`);
        params.push(agence);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 
        ? 'WHERE ' + conditions.join(' AND ') 
        : '';

      const query = `
        SELECT 
          a.*,
          t.nom_complet as titulaire_nom
        FROM aro_assurance_db.assures a
        LEFT JOIN aro_assurance_db.assures t ON a.titulaire_id = t.id
        ${whereClause}
        ORDER BY a.date_creation DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Count total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM aro_assurance_db.assures a
        ${whereClause}
      `;

      const countResult = await pool.query(countQuery, params.slice(0, -2));

      return {
        data: result.rows,
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      };
    } catch (error) {
      console.error('Erreur getAll assurés:', error);
      throw error;
    }
  }

  /**
   * Récupérer statistiques
   */
  static async getStats() {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN statut_contrat = 'actif' THEN 1 ELSE 0 END) as actifs,
          SUM(CASE WHEN statut_contrat = 'resilie' THEN 1 ELSE 0 END) as resilies,
          SUM(CASE WHEN DATE(date_creation) >= CURRENT_DATE - INTERVAL '30 days' THEN 1 ELSE 0 END) as nouveaux_ce_mois
        FROM aro_assurance_db.assures
      `);

      return result.rows[0];
    } catch (error) {
      console.error('Erreur getStats:', error);
      throw error;
    }
  }

  /**
   * Récupérer liste des agences
   */
  static async getAgences() {
    try {
      const result = await pool.query(`
        SELECT DISTINCT agence 
        FROM aro_assurance_db.assures 
        WHERE agence IS NOT NULL 
        ORDER BY agence
      `);

      return result.rows.map(row => row.agence);
    } catch (error) {
      console.error('Erreur getAgences:', error);
      throw error;
    }
  }

  /**
   * Récupérer liste des titulaires
   */
  static async getTitulaires() {
    try {
      const result = await pool.query(`
        SELECT id, nom_complet, numero_dossier, agence
        FROM aro_assurance_db.assures
        WHERE type_assure = 'titulaire'
        ORDER BY nom_complet
      `);

      return result.rows;
    } catch (error) {
      console.error('Erreur getTitulaires:', error);
      throw error;
    }
  }

  /**
   * Récupérer assuré par ID
   */
  static async getById(id) {
    try {
      const result = await pool.query(`
        SELECT 
          a.*,
          t.nom_complet as titulaire_nom
        FROM aro_assurance_db.assures a
        LEFT JOIN aro_assurance_db.assures t ON a.titulaire_id = t.id
        WHERE a.id = $1
      `, [id]);

      return result.rowCount > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Erreur getById:', error);
      throw error;
    }
  }

  /**
   * Créer un nouvel assuré
   */
  static async create(data) {
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

      const query = `
        INSERT INTO aro_assurance_db.assures (${fields.join(', ')})
        VALUES (${placeholders})
        RETURNING id
      `;

      const result = await pool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      console.error('Erreur create assuré:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un assuré
   */
  static async update(id, data) {
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');

      values.push(id);

      const query = `
        UPDATE aro_assurance_db.assures 
        SET ${setClause} 
        WHERE id = $${values.length}
      `;

      const result = await pool.query(query, values);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Erreur update assuré:', error);
      throw error;
    }
  }

  /**
   * Supprimer un assuré
   */
  static async delete(id) {
    try {
      const result = await pool.query(
        `DELETE FROM aro_assurance_db.assures WHERE id = $1`,
        [id]
      );

      return result.rowCount > 0;
    } catch (error) {
      console.error('Erreur delete assuré:', error);
      throw error;
    }
  }
}

export default Assure;
