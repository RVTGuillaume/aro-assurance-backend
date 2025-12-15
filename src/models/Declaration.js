/**
 * Modèle Déclaration - VERSION POSTGRESQL ✅
 */

import pool from '../config/database.js';

class Declaration {
  /**
   * Créer une nouvelle déclaration
   */
  static async create(data) {
    try {
      const result = await pool.query(
        `INSERT INTO aro_assurance_db.declarations (
          assure_id,
          adresse_assure,
          numero_declaration,
          personne_soignee_nom,
          personne_soignee_profession,
          personne_soignee_age,
          personne_soignee_parente,
          autre_garantie_couvre,
          type_sinistre,
          accident_date,
          accident_lieu,
          accident_constate_par,
          accident_circonstances,
          accident_blessures,
          accident_soigne_par,
          maladie_soignee_par,
          maladie_date_debut,
          hospitalisation_etablissement,
          hospitalisation_date_debut,
          hospitalisation_date_fin,
          hospitalisation_operation_par,
          hospitalisation_description,
          soins_dentaires_date_debut,
          soins_dentaires_date_fin,
          soins_dentaires_effectues_par,
          soins_dentaires_codes_actes,
          lieu_declaration,
          statut_declaration
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
        RETURNING id`,
        [
          data.assure_id,
          data.adresse_assure,
          data.numero_declaration,
          data.personne_soignee_nom,
          data.personne_soignee_profession,
          data.personne_soignee_age,
          data.personne_soignee_parente,
          data.autre_garantie_couvre || null,
          data.type_sinistre,
          data.accident_date || null,
          data.accident_lieu || null,
          data.accident_constate_par || null,
          data.accident_circonstances || null,
          data.accident_blessures || null,
          data.accident_soigne_par || null,
          data.maladie_soignee_par || null,
          data.maladie_date_debut || null,
          data.hospitalisation_etablissement || null,
          data.hospitalisation_date_debut || null,
          data.hospitalisation_date_fin || null,
          data.hospitalisation_operation_par || null,
          data.hospitalisation_description || null,
          data.soins_dentaires_date_debut || null,
          data.soins_dentaires_date_fin || null,
          data.soins_dentaires_effectues_par || null,
          data.soins_dentaires_codes_actes || null,
          data.lieu_declaration,
          'en_attente'
        ]
      );
      return result.rows[0].id;
    } catch (error) {
      console.error('❌ Erreur create declaration:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les déclarations d'un assuré
   */
  static async getByAssureId(assureId, filters = {}) {
    try {
      const { page = 1, limit = 10, statut = '' } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE d.assure_id = $1';
      const params = [assureId];
      let paramIndex = 2;

      if (statut) {
        whereClause += ` AND d.statut_declaration = $${paramIndex}`;
        params.push(statut);
        paramIndex++;
      }

      const query = `
        SELECT 
          d.*,
          a.nom_complet as assure_nom,
          a.numero_dossier
        FROM aro_assurance_db.declarations d
        INNER JOIN aro_assurance_db.assures a ON d.assure_id = a.id
        ${whereClause}
        ORDER BY d.date_declaration DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);
      const result = await pool.query(query, params);

      // Count total
      const countQuery = `SELECT COUNT(*) as total FROM aro_assurance_db.declarations d ${whereClause}`;
      const countResult = await pool.query(countQuery, params.slice(0, statut ? 2 : 1));

      return {
        data: result.rows,
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      };
    } catch (error) {
      console.error('❌ Erreur getByAssureId:', error);
      throw error;
    }
  }

  /**
   * Récupérer une déclaration par ID
   */
  static async getById(id) {
    try {
      const result = await pool.query(
        `SELECT 
          d.*,
          a.nom_complet as assure_nom,
          a.numero_dossier,
          a.email,
          a.telephone
        FROM aro_assurance_db.declarations d
        INNER JOIN aro_assurance_db.assures a ON d.assure_id = a.id
        WHERE d.id = $1`,
        [id]
      );
      return result.rowCount > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('❌ Erreur getById declaration:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour une déclaration
   */
  static async update(id, data) {
    try {
      const fields = Object.keys(data).filter(key => data[key] !== undefined);
      const values = fields.map(key => data[key]);
      const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');

      if (fields.length === 0) {
        throw new Error('Aucune donnée à mettre à jour');
      }

      values.push(id);

      const query = `UPDATE aro_assurance_db.declarations SET ${setClause} WHERE id = $${values.length}`;
      const result = await pool.query(query, values);
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Erreur update declaration:', error);
      throw error;
    }
  }

  /**
   * Supprimer une déclaration
   */
  static async delete(id) {
    try {
      const result = await pool.query('DELETE FROM aro_assurance_db.declarations WHERE id = $1', [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Erreur delete declaration:', error);
      throw error;
    }
  }

  /**
   * Statistiques des déclarations d'un assuré
   */
  static async getStatsByAssure(assureId) {
    try {
      const result = await pool.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN statut_declaration = 'en_attente' THEN 1 ELSE 0 END) as en_attente,
          SUM(CASE WHEN statut_declaration = 'en_traitement' THEN 1 ELSE 0 END) as en_traitement,
          SUM(CASE WHEN statut_declaration = 'validee' THEN 1 ELSE 0 END) as validees,
          SUM(CASE WHEN statut_declaration = 'refusee' THEN 1 ELSE 0 END) as refusees
        FROM aro_assurance_db.declarations
        WHERE assure_id = $1`,
        [assureId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('❌ Erreur getStatsByAssure:', error);
      throw error;
    }
  }
}

export default Declaration;
