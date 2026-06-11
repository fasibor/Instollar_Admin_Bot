/**
 * Instollar Bot — Database Migration
 * Creates all required tables in SQLite
 * Updated: Weekly + Monthly stats support (no daily stats)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './data/instollar.db';
const dir = path.dirname(DB_PATH);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const migrate = db.transaction(() => {

  // ─────────────────────────────────────────────
  // Installations table
  // ─────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS installations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      location    TEXT NOT NULL,
      client_name TEXT NOT NULL,
      system_size TEXT NOT NULL,
      battery     TEXT NOT NULL,
      panels      INTEGER NOT NULL,
      posted_by   INTEGER NOT NULL,
      message_id  INTEGER,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ─────────────────────────────────────────────
  // Gigs table
  // ─────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS gigs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      location    TEXT NOT NULL,
      timeline    TEXT NOT NULL,
      system_size TEXT NOT NULL,
      battery     TEXT NOT NULL,
      panels      INTEGER NOT NULL,
      posted_by   INTEGER NOT NULL,
      message_id  INTEGER,
      status      TEXT DEFAULT 'open',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ─────────────────────────────────────────────
  // Applications table
  // ─────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      gig_id       INTEGER NOT NULL,
      full_name    TEXT NOT NULL,
      phone        TEXT NOT NULL,
      email        TEXT NOT NULL,
      telegram_id  INTEGER,
      username     TEXT,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (gig_id) REFERENCES gigs(id)
    );
  `);

  // ─────────────────────────────────────────────
  // Announcements table
  // ─────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      content    TEXT NOT NULL,
      posted_by  INTEGER NOT NULL,
      message_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ─────────────────────────────────────────────
  // 🚨 REMOVED: daily_stats table (no longer needed)
  // ─────────────────────────────────────────────

  // NOTE:
  // Weekly and monthly stats are computed dynamically
  // from installations/gigs/applications tables using date filters.

});

migrate();

console.log('✅ Database migration complete:', DB_PATH);
db.close();