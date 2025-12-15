/**
 * Modèle PieceJointe - VERSION POSTGRESQL ✅
 */

import pool from '../config/database.js';

class PieceJointeModel {
  /**
   * Créer une nouvelle pièce jointe
   */
  static async create(pieceData) {
    try {
      const result = await pool.query(
        `INSERT INTO aro_assurance_db.pieces_jointes (
          declaration_id,
          nom_fichier_original,
          nom_fichier_stocke,
          chemin_fichier,
          type_fichier,
          taille_fichier,
          categorie_document,
          hash_fichier
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          pieceData.declaration_id,
          pieceData.nom_fichier_original,
          pieceData.nom_fichier_stocke,
          pieceData.chemin_fichier,
          pieceData.type_fichier,
          pieceData.taille_fichier,
          pieceData.categorie_document || 'autre',
          pieceData.hash_fichier
        ]
      );

      return result.rows[0].id;
    } catch (error) {
      throw new Error(`Erreur création pièce jointe: ${error.message}`);
    }
  }

  /**
   * Trouver une pièce jointe par ID
   */
  static async findById(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM aro_assurance_db.pieces_jointes WHERE id = $1',
        [id]
      );

      return result.rowCount > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new Error(`Erreur recherche pièce jointe: ${error.message}`);
    }
  }

  /**
   * Obtenir toutes les pièces jointes d'une déclaration
   */
  static async findByDeclarationId(declaration_id) {
    try {
      const result = await pool.query(
        `SELECT * FROM aro_assurance_db.pieces_jointes 
         WHERE declaration_id = $1 
         ORDER BY date_upload ASC`,
        [declaration_id]
      );

      return result.rows;
    } catch (error) {
      throw new Error(`Erreur recherche pièces jointes: ${error.message}`);
    }
  }

  /**
   * Supprimer une pièce jointe
   */
  static async delete(id) {
    try {
      await pool.query('DELETE FROM aro_assurance_db.pieces_jointes WHERE id = $1', [id]);
      return true;
    } catch (error) {
      throw new Error(`Erreur suppression pièce jointe: ${error.message}`);
    }
  }

  /**
   * Vérifier si un fichier existe déjà (par hash)
   */
  static async existsByHash(hash, declaration_id) {
    try {
      const result = await pool.query(
        'SELECT id FROM aro_assurance_db.pieces_jointes WHERE hash_fichier = $1 AND declaration_id = $2',
        [hash, declaration_id]
      );

      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Erreur vérification hash: ${error.message}`);
    }
  }

  /**
   * Obtenir la taille totale des fichiers d'une déclaration
   */
  static async getTotalSize(declaration_id) {
    try {
      const result = await pool.query(
        'SELECT SUM(taille_fichier) as total FROM aro_assurance_db.pieces_jointes WHERE declaration_id = $1',
        [declaration_id]
      );

      return result.rows[0].total || 0;
    } catch (error) {
      throw new Error(`Erreur calcul taille totale: ${error.message}`);
    }
  }
}

export default PieceJointeModel;
