/**
 * Instollar Bot — PostgreSQL DB Layer (Production Ready)
 */

const { Pool } = require('pg');
require('dotenv').config();

let pool;

/* ─────────────────────────────
   INIT DB
───────────────────────────── */
async function initDb() {
  if (pool) return;

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();

  try {
    /* INSTALLATIONS */
    await client.query(`
      CREATE TABLE IF NOT EXISTS installations (
        id SERIAL PRIMARY KEY,
        location TEXT,
        client_name TEXT,
        system_size TEXT,
        battery TEXT,
        panels INTEGER,
        posted_by BIGINT,
        message_id BIGINT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    /* GIGS */
    await client.query(`
      CREATE TABLE IF NOT EXISTS gigs (
        id SERIAL PRIMARY KEY,
        gig_type TEXT,
        location TEXT,
        timeline TEXT,
        scope TEXT,
        posted_by BIGINT,
        message_id BIGINT,
        status TEXT DEFAULT 'open',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    /* APPLICATIONS */
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        gig_id INTEGER,
        full_name TEXT,
        phone TEXT,
        email TEXT,
        telegram_id BIGINT,
        username TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    /* ANNOUNCEMENTS (HISTORY) */
    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        announcement_type TEXT DEFAULT 'ANNOUNCEMENT',
        content TEXT NOT NULL,
        posted_by BIGINT NOT NULL,
        message_id BIGINT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    /* SCHEDULED POSTS (QUEUE SYSTEM) */
    await client.query(`
      CREATE TABLE IF NOT EXISTS scheduled_posts (
        id SERIAL PRIMARY KEY,
        post_type TEXT,
        post_data JSONB,
        scheduled_at TIMESTAMP,
        posted_by BIGINT,
        published BOOLEAN DEFAULT FALSE,
        message_id BIGINT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('[DB] PostgreSQL ready');
  } finally {
    client.release();
  }
}

/* ─────────────────────────────
   INSTALLATIONS
───────────────────────────── */
const insertInstallation = (d) =>
  pool.query(
    `INSERT INTO installations(location, client_name, system_size, battery, panels, posted_by)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
    [d.location, d.client_name, d.system_size, d.battery, d.panels, d.posted_by]
  );

/* ─────────────────────────────
   GIGS
───────────────────────────── */
const insertGig = (d) =>
  pool.query(
    `INSERT INTO gigs(gig_type, location, timeline, scope, posted_by)
     VALUES($1,$2,$3,$4,$5) RETURNING id`,
    [d.gig_type, d.location, d.timeline, d.scope, d.posted_by]
  );

/* ─────────────────────────────
   SCHEDULED POSTS
───────────────────────────── */
const insertScheduledPost = (d) =>
  pool.query(
    `INSERT INTO scheduled_posts(post_type, post_data, scheduled_at, posted_by)
     VALUES($1,$2,$3,$4) RETURNING id`,
    [d.post_type, d.post_data, d.scheduled_at, d.posted_by]
  );

const getScheduledPosts = async () => {
  const res = await pool.query(`
    SELECT * FROM scheduled_posts
    WHERE published = FALSE AND scheduled_at <= NOW()
    ORDER BY scheduled_at ASC
  `);
  return res.rows;
};

const markScheduledPostPublished = (id, message_id) =>
  pool.query(
    `UPDATE scheduled_posts
     SET published = TRUE,
         message_id = $1
     WHERE id = $2`,
    [message_id, id]
  );

/* ─────────────────────────────
   INSERT ANNOUNCEMENT
───────────────────────────── */
const insertAnnouncement = (d) =>
  pool.query(
    `INSERT INTO announcements
     (announcement_type, content, posted_by, message_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [
      d.announcement_type || 'ANNOUNCEMENT',
      d.content,
      d.posted_by,
      d.message_id || null
    ]
  );

/* ─────────────────────────────
   EXPORTS
───────────────────────────── */
module.exports = {
  initDb,

  insertInstallation,
  insertGig,

  insertScheduledPost,
  getScheduledPosts,
  markScheduledPostPublished,

  insertAnnouncement
};