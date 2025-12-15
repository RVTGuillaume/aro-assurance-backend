/**
 * Configuration PostgreSQL - Render.com
 * AVEC SSL OBLIGATOIRE + RETRY + TIMEOUT ÉTENDU
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

dotenv.config();

/**
 * Pool de connexions PostgreSQL avec SSL FORCÉ
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  
  // ✅ SSL TOUJOURS ACTIVÉ pour Render
  ssl: {
    rejectUnauthorized: false
  },
  
  // Pool settings optimisés
  max: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000,  // ✅ 60 secondes
  statement_timeout: 60000,
  query_timeout: 60000,
  
  // PostgreSQL specific
  application_name: 'aro_assurance_backend',
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

/**
 * Configurer le search_path
 */
pool.on('connect', async (client) => {
  try {
    await client.query('SET search_path TO aro_assurance_db, public');
    await client.query("SET timezone TO 'Indian/Antananarivo'");
  } catch (err) {
    console.error('❌ Erreur configuration client:', err.message);
  }
});

/**
 * Test de connexion avec RETRY
 */
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
      console.log(`🔒 SSL: Activé (Render)`);
      console.log(`🌐 Hôte: ${process.env.DB_HOST || 'Render'}`);
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
        console.error('');
        console.error('🔍 Vérifications recommandées:');
        console.error('');
        console.error('1. Vérifiez DATABASE_URL dans .env');
        console.error('2. Vérifiez que la base Render n\'est pas suspendue (Free Tier)');
        console.error('3. Vérifiez votre connexion Internet');
        console.error('4. Essayez de vous connecter via psql en ligne de commande');
        console.error('');
        
        throw new Error(`PostgreSQL connection failed: ${error.message}`);
      }
      
      console.log(`⏳ Nouvelle tentative dans 3 secondes...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
};

/**
 * Gestion des erreurs de pool
 */
pool.on('error', (error, client) => {
  console.error('❌ Erreur pool PostgreSQL:', error.message);
  
  if (error.code === 'ECONNREFUSED') {
    console.error('→ Connexion refusée par PostgreSQL');
  } else if (error.code === 'ENOTFOUND') {
    console.error('→ Hôte PostgreSQL introuvable');
  } else if (error.code === 'ETIMEDOUT') {
    console.error('→ Timeout de connexion PostgreSQL');
  } else if (error.code === '28000') {
    console.error('→ Erreur d\'authentification PostgreSQL');
  }
});

/**
 * Helper pour exécuter des requêtes
 */
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

/**
 * Fermeture propre du pool
 */
export const closePool = async () => {
  await pool.end();
  console.log('🔴 Pool PostgreSQL fermé');
};

// Gérer la fermeture propre
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

export default pool;
