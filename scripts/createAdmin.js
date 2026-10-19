import 'dotenv/config';
import bcrypt from 'bcrypt';
import pool from '../src/config/database.js';

const { ADMIN_NOM, ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;

try {
  if (!ADMIN_NOM || !ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
    throw new Error('Un des champs est vide');
  }
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const r = await pool.query(
    `INSERT INTO aro_assurance_db.administrateurs (nom_complet, email, username, mot_de_passe_hash, role, statut)
     VALUES ($1, $2, $3, $4, 'super_admin', 'actif')
     RETURNING id, email, username, role`,
    [ADMIN_NOM, ADMIN_EMAIL, ADMIN_USERNAME, hash]
  );
  console.log('Administrateur cree :', r.rows[0]);
} catch (e) {
  console.error('Erreur :', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}