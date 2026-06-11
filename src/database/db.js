/**
 * Instollar Bot — Database Layer v1.2
 *
 * Fixes applied:
 *  R5  — flushSync now also registered on process 'exit' (covers uncaught exceptions)
 *  R7  — debounce setTimeout is .unref()-ed so it never delays graceful shutdown
 */
/**
 * Instollar Bot — Database Layer v1.3
 *
 * Updates:
 *  - Removed daily stats system
 *  - Added weekly stats (7 days)
 *  - Added monthly stats (30 days)
 *  - Clean unified analytics using UNION ALL
 */

const initSqlJs = require('sql.js');
const path      = require('path');
const fs        = require('fs');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './data/instollar.db';
const dir     = path.dirname(path.resolve(DB_PATH));
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let _db        = null;
let _saveTimer = null;
const SAVE_DEBOUNCE_MS = 2000;

// ─────────────────────────────────────────────
// DB INIT
// ─────────────────────────────────────────────

function getDb() {
  if (_db) return _db;
  throw new Error('DB not initialised — call initDb() first');
}

async function initDb() {
  const SQL = await initSqlJs();

  _db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  _db.run('PRAGMA foreign_keys = ON;');

  _db.run(`CREATE TABLE IF NOT EXISTS installations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    location    TEXT NOT NULL,
    client_name TEXT NOT NULL,
    system_size TEXT NOT NULL,
    battery     TEXT NOT NULL,
    panels      INTEGER NOT NULL,
    posted_by   INTEGER NOT NULL,
    message_id  INTEGER,
    created_at  DATETIME DEFAULT (datetime('now'))
  );`);

  _db.run(`CREATE TABLE IF NOT EXISTS gigs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    location    TEXT NOT NULL,
    timeline    TEXT NOT NULL,
    system_size TEXT NOT NULL,
    battery     TEXT NOT NULL,
    panels      INTEGER NOT NULL,
    posted_by   INTEGER NOT NULL,
    message_id  INTEGER,
    status      TEXT DEFAULT 'open',
    created_at  DATETIME DEFAULT (datetime('now'))
  );`);

  _db.run(`CREATE TABLE IF NOT EXISTS applications (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    gig_id       INTEGER NOT NULL,
    full_name    TEXT NOT NULL,
    phone        TEXT NOT NULL,
    email        TEXT NOT NULL,
    telegram_id  INTEGER,
    username     TEXT,
    created_at   DATETIME DEFAULT (datetime('now'))
  );`);

  _db.run(`CREATE TABLE IF NOT EXISTS announcements (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    content    TEXT NOT NULL,
    posted_by  INTEGER NOT NULL,
    message_id INTEGER,
    created_at DATETIME DEFAULT (datetime('now'))
  );`);

  scheduleSave();
  console.log('[DB] Initialised:', DB_PATH);
  return _db;
}

// ─────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────

function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);

  _saveTimer = setTimeout(() => {
    if (!_db) return;
    try {
      fs.writeFileSync(DB_PATH, Buffer.from(_db.export()));
    } catch (err) {
      console.error('[DB] Save failed:', err.message);
    }
    _saveTimer = null;
  }, SAVE_DEBOUNCE_MS).unref();
}

function flushSync() {
  if (!_db) return;
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  try { fs.writeFileSync(DB_PATH, Buffer.from(_db.export())); } catch (_) {}
}

process.on('SIGINT',  flushSync);
process.on('SIGTERM', flushSync);
process.on('exit',    flushSync);

// ─────────────────────────────────────────────
// CORE HELPERS
// ─────────────────────────────────────────────

function run(sql, params = []) {
  const db = getDb();
  db.run(sql, params);

  const id = db.exec('SELECT last_insert_rowid() as id')[0];
  const lastId = id ? id.values[0][0] : null;

  scheduleSave();
  return { lastInsertRowid: lastId };
}

function get(sql, params = []) {
  const db  = getDb();
  const res = db.exec(sql, params);
  if (!res[0]) return null;

  const cols = res[0].columns;
  const vals = res[0].values[0];
  if (!vals) return null;

  return Object.fromEntries(cols.map((c, i) => [c, vals[i]]));
}

// ─────────────────────────────────────────────
// INSTALLATIONS
// ─────────────────────────────────────────────

function insertInstallation(data) {
  return run(
    'INSERT INTO installations (location,client_name,system_size,battery,panels,posted_by) VALUES (?,?,?,?,?,?)',
    [data.location, data.client_name, data.system_size, data.battery, data.panels, data.posted_by]
  );
}

function updateInstallationMessageId(id, message_id) {
  run('UPDATE installations SET message_id=? WHERE id=?', [message_id, id]);
}

// ─────────────────────────────────────────────
// GIGS
// ─────────────────────────────────────────────

function insertGig(data) {
  return run(
    'INSERT INTO gigs (location,timeline,system_size,battery,panels,posted_by) VALUES (?,?,?,?,?,?)',
    [data.location, data.timeline, data.system_size, data.battery, data.panels, data.posted_by]
  );
}

function updateGigMessageId(id, message_id) {
  run('UPDATE gigs SET message_id=? WHERE id=?', [message_id, id]);
}

function getGigById(id) {
  return get('SELECT * FROM gigs WHERE id=?', [id]);
}

// ─────────────────────────────────────────────
// APPLICATIONS
// ─────────────────────────────────────────────

function insertApplication(data) {
  return run(
    'INSERT INTO applications (gig_id,full_name,phone,email,telegram_id,username) VALUES (?,?,?,?,?,?)',
    [data.gig_id, data.full_name, data.phone, data.email, data.telegram_id, data.username]
  );
}

function hasApplied(gig_id, telegram_id) {
  return !!get('SELECT id FROM applications WHERE gig_id=? AND telegram_id=?', [gig_id, telegram_id]);
}

// ─────────────────────────────────────────────
// STATS (WEEKLY / MONTHLY ONLY)
// ─────────────────────────────────────────────

function getWeeklyStats() {
  const db = getDb();

  const res = db.exec(`
    SELECT
      SUM(CASE WHEN type = 'installation' THEN 1 ELSE 0 END) AS installations,
      SUM(CASE WHEN type = 'gig' THEN 1 ELSE 0 END) AS gigs,
      SUM(CASE WHEN type = 'application' THEN 1 ELSE 0 END) AS applications
    FROM (
      SELECT 'installation' AS type, created_at FROM installations
      UNION ALL
      SELECT 'gig' AS type, created_at FROM gigs
      UNION ALL
      SELECT 'application' AS type, created_at FROM applications
    )
    WHERE datetime(created_at) >= datetime('now', '-7 days')
  `);

  const row = res[0]?.values?.[0] || [];

  return {
    installations: row[0] || 0,
    gigs: row[1] || 0,
    applications: row[2] || 0,
  };
}

function getMonthlyStats() {
  const db = getDb();

  const res = db.exec(`
    SELECT
      SUM(CASE WHEN type = 'installation' THEN 1 ELSE 0 END) AS installations,
      SUM(CASE WHEN type = 'gig' THEN 1 ELSE 0 END) AS gigs,
      SUM(CASE WHEN type = 'application' THEN 1 ELSE 0 END) AS applications
    FROM (
      SELECT 'installation' AS type, created_at FROM installations
      UNION ALL
      SELECT 'gig' AS type, created_at FROM gigs
      UNION ALL
      SELECT 'application' AS type, created_at FROM applications
    )
    WHERE datetime(created_at) >= datetime('now', '-30 days')
  `);

  const row = res[0]?.values?.[0] || [];

  return {
    installations: row[0] || 0,
    gigs: row[1] || 0,
    applications: row[2] || 0,
  };
}

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

  insertAnnouncement: (data) =>
    run('INSERT INTO announcements (content,posted_by) VALUES (?,?)',
      [data.content, data.posted_by]
    ),

  getWeeklyStats,
  getMonthlyStats,
};