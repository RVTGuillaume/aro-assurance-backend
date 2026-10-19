/**
 * Configuration PostgreSQL - Aiven (SSL Strict)
 */

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lecture du certificat CA d'Aiven
const caCert = fs.readFileSync(path.join(__dirname, '../../certs/ca.pem')).toString();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: caCert
  },
  max: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000,
  statement_timeout: 60000,
  query_timeout: 60000,
  application_name: 'aro_assurance_backend',
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

pool.on('connect', async (client) => {
  try {
    await client.query('SET search_path TO aro_assurance_db, public');
    await client.query("SET timezone TO 'Indian/Antananarivo'");
  } catch (err) {
    console.error('❌ Erreur configuration client:', err.message);
  }
});

export const testConnection = async () => {
  let retries = 3;
  while (retries > 0) {
    try {
      console.log(`🔌 Connexion PostgreSQL (tentative ${4 - retries}/3)...`);
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as now, current_database() as db, current_user as user');
      console.log('');
      console.log('✅ PostgreSQL connecté avec succès !');
      console.log('━'.repeat(60));
      console.log(`📅 Timestamp: ${result.rows[0].now}`);
      console.log(`📊 Base de données: ${result.rows[0].db}`);
      console.log(`👤 Utilisateur: ${result.rows[0].user}`);
      console.log(`🔒 SSL: Activé (Aiven CA)`);
      console.log(`🌐 Hôte: ${process.env.DB_HOST || 'Aiven'}`);
      console.log('━'.repeat(60));
      console.log('');
      client.release();
      return true;
    } catch (error) {
      retries--;
      console.error(`❌ Tentative ${3 - retries}/3 échouée: ${error.message}`);
      if (retries === 0) {
        console.error('');
        console.error('❌ ERREUR FATALE: Impossible de se connecter à PostgreSQL');
        console.error('━'.repeat(60));
        console.error(`Erreur: ${error.message}`);
        console.error(`Code: ${error.code || 'N/A'}`);
        console.error('━'.repeat(60));
        throw new Error(`PostgreSQL connection failed: ${error.message}`);
      }
      console.log(`⏳ Nouvelle tentative dans 3 secondes...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
};

pool.on('error', (error) => {
  console.error('❌ Erreur pool PostgreSQL:', error.message);
  if (error.code === 'ECONNREFUSED') console.error('→ Connexion refusée');
  if (error.code === 'ENOTFOUND') console.error('→ Hôte introuvable');
  if (error.code === 'ETIMEDOUT') console.error('→ Timeout');
  if (error.code === '28000') console.error('→ Auth échouée');
});

export const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.log(`⚠️ Requête lente (${duration}ms):`, text.substring(0, 100));
    }
    return result;
  } catch (error) {
    console.error('❌ Erreur requête PostgreSQL:', error.message);
    throw error;
  }
};

export const closePool = async () => {
  await pool.end();
  console.log('🔴 Pool PostgreSQL fermé');
};

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

export default pool;