import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/database.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(dir, 'schema.sql'), 'utf8');

try {
  await pool.query(sql);
  const r = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'aro_assurance_db' ORDER BY table_name");
  console.log('Tables presentes :', r.rows.map(x => x.table_name).join(', '));
} catch (e) {
  console.error('Erreur :', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}