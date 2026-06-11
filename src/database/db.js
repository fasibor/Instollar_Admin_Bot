/**
 * Instollar Bot — PostgreSQL Database Layer
 *
 * Migrated from SQLite to PostgreSQL for Railway compatibility
 * and persistent data across restarts
 */

const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('error', (err) => {
  console.error('[DB] Pool error:', err);
});

let _initialized = false;

// ─────────────────────────────────────────────
// DB INIT
// ─────────────────────────────────────────────

async function initDb() {
  if (_initialized) return;

  const client = await pool.connect();

  try {
    // Create installations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS installations (
        id SERIAL PRIMARY KEY,
        location TEXT NOT NULL,
        client_name TEXT NOT NULL,
        system_size TEXT NOT NULL,
        battery TEXT NOT NULL,
        panels INTEGER NOT NULL,
        posted_by BIGINT NOT NULL,
        message_id BIGINT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create gigs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS gigs (
        id SERIAL PRIMARY KEY,
        location TEXT NOT NULL,
        timeline TEXT NOT NULL,
        system_size TEXT NOT NULL,
        battery TEXT NOT NULL,
        panels INTEGER NOT NULL,
        posted_by BIGINT NOT NULL,
        message_id BIGINT,
        status TEXT DEFAULT 'open',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create applications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        gig_id INTEGER NOT NULL REFERENCES gigs(id),
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        telegram_id BIGINT,
        username TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create announcements table
    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        posted_by BIGINT NOT NULL,
        message_id BIGINT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    _initialized = true;
    console.log('[DB] PostgreSQL initialised and ready');
  } catch (err) {
    console.error('[DB] Initialisation error:', err);
    throw err;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────
// INSTALLATIONS
// ─────────────────────────────────────────────

async function insertInstallation(data) {
  const result = await pool.query(
    `INSERT INTO installations (location, client_name, system_size, battery, panels, posted_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [data.location, data.client_name, data.system_size, data.battery, data.panels, data.posted_by]
  );
  return result.rows[0];
}

async function updateInstallationMessageId(id, message_id) {
  await pool.query(
    'UPDATE installations SET message_id = $1 WHERE id = $2',
    [message_id, id]
  );
}

// ─────────────────────────────────────────────
// GIGS
// ─────────────────────────────────────────────

async function insertGig(data) {
  const result = await pool.query(
    `INSERT INTO gigs (location, timeline, system_size, battery, panels, posted_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [data.location, data.timeline, data.system_size, data.battery, data.panels, data.posted_by]
  );
  return result.rows[0];
}

async function updateGigMessageId(id, message_id) {
  await pool.query(
    'UPDATE gigs SET message_id = $1 WHERE id = $2',
    [message_id, id]
  );
}

async function getGigById(id) {
  const result = await pool.query(
    'SELECT * FROM gigs WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

// ─────────────────────────────────────────────
// APPLICATIONS
// ─────────────────────────────────────────────

async function insertApplication(data) {
  const result = await pool.query(
    `INSERT INTO applications (gig_id, full_name, phone, email, telegram_id, username)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [data.gig_id, data.full_name, data.phone, data.email, data.telegram_id, data.username]
  );
  return result.rows[0];
}

async function hasApplied(gig_id, telegram_id) {
  const result = await pool.query(
    'SELECT id FROM applications WHERE gig_id = $1 AND telegram_id = $2',
    [gig_id, telegram_id]
  );
  return result.rows.length > 0;
}

// ─────────────────────────────────────────────
// STATS (WEEKLY / MONTHLY)
// ─────────────────────────────────────────────

async function getWeeklyStats() {
  const result = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'installation' THEN 1 ELSE 0 END), 0) AS installations,
      COALESCE(SUM(CASE WHEN type = 'gig' THEN 1 ELSE 0 END), 0) AS gigs,
      COALESCE(SUM(CASE WHEN type = 'application' THEN 1 ELSE 0 END), 0) AS applications
    FROM (
      SELECT 'installation' AS type, created_at FROM installations
      UNION ALL
      SELECT 'gig' AS type, created_at FROM gigs
      UNION ALL
      SELECT 'application' AS type, created_at FROM applications
    ) AS stats
    WHERE created_at >= NOW() - INTERVAL '7 days'
  `);

  const row = result.rows[0];
  return {
    installations: parseInt(row.installations) || 0,
    gigs: parseInt(row.gigs) || 0,
    applications: parseInt(row.applications) || 0,
  };
}

async function getMonthlyStats() {
  const result = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'installation' THEN 1 ELSE 0 END), 0) AS installations,
      COALESCE(SUM(CASE WHEN type = 'gig' THEN 1 ELSE 0 END), 0) AS gigs,
      COALESCE(SUM(CASE WHEN type = 'application' THEN 1 ELSE 0 END), 0) AS applications
    FROM (
      SELECT 'installation' AS type, created_at FROM installations
      UNION ALL
      SELECT 'gig' AS type, created_at FROM gigs
      UNION ALL
      SELECT 'application' AS type, created_at FROM applications
    ) AS stats
    WHERE created_at >= NOW() - INTERVAL '30 days'
  `);

  const row = result.rows[0];
  return {
    installations: parseInt(row.installations) || 0,
    gigs: parseInt(row.gigs) || 0,
    applications: parseInt(row.applications) || 0,
  };
}

// ─────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────

async function flushSync() {
  try {
    await pool.end();
    console.log('[DB] Connection pool closed');
  } catch (err) {
    console.error('[DB] Error closing pool:', err);
  }
}

process.on('SIGINT', flushSync);
process.on('SIGTERM', flushSync);
process.on('exit', flushSync);

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────

module.exports = {
  initDb,
  flushSync,

  insertInstallation,
  updateInstallationMessageId,

  insertGig,
  updateGigMessageId,
  getGigById,

  insertApplication,
  hasApplied,

  insertAnnouncement: async (data) => {
    const result = await pool.query(
      'INSERT INTO announcements (content, posted_by) VALUES ($1, $2) RETURNING id',
      [data.content, data.posted_by]
    );
    return result.rows[0];
  },

  getWeeklyStats,
  getMonthlyStats,
};