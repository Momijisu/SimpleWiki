// SQLite storage, through Node's built-in node:sqlite (Node 22.13+).
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_TEMPLATES } from './default-templates.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY,
  username    TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_hash   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user',      -- user | mod | admin
  status      TEXT NOT NULL DEFAULT 'active',    -- active | pending | banned
  ban_reason  TEXT,
  bio         TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL,
  last_seen   INTEGER,
  discord_id     TEXT,                          -- set when the account is linked to Discord
  discord_name   TEXT,
  discord_avatar TEXT,
  role_source    TEXT NOT NULL DEFAULT 'manual' -- manual | discord: who set the role last
);
CREATE UNIQUE INDEX IF NOT EXISTS users_discord ON users(discord_id) WHERE discord_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS namespaces (
  id          INTEGER PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  tagline     TEXT NOT NULL DEFAULT '',
  theme       TEXT NOT NULL DEFAULT 'gta',
  sort        INTEGER NOT NULL DEFAULT 0,
  archived    INTEGER NOT NULL DEFAULT 0,          -- read-only for everyone but mods
  hidden      INTEGER NOT NULL DEFAULT 0,          -- only mods can see it
  created_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS templates (
  key         TEXT PRIMARY KEY,
  sort        INTEGER NOT NULL DEFAULT 0,
  data        TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS articles (
  id          INTEGER PRIMARY KEY,
  ns_id       INTEGER NOT NULL REFERENCES namespaces(id),
  slug        TEXT NOT NULL,
  title       TEXT NOT NULL,
  template    TEXT NOT NULL,
  fields      TEXT NOT NULL DEFAULT '{}',
  body        TEXT NOT NULL DEFAULT '',
  image       TEXT NOT NULL DEFAULT '',
  protection  TEXT NOT NULL DEFAULT 'none',       -- none | mods | admins
  deleted     INTEGER NOT NULL DEFAULT 0,
  rev_id      INTEGER,
  created_by  INTEGER REFERENCES users(id),
  created_at  INTEGER NOT NULL,
  updated_by  INTEGER REFERENCES users(id),
  updated_at  INTEGER NOT NULL,
  UNIQUE (ns_id, slug)
);
CREATE INDEX IF NOT EXISTS articles_template ON articles(ns_id, template, deleted);
CREATE INDEX IF NOT EXISTS articles_updated ON articles(updated_at);
CREATE TABLE IF NOT EXISTS redirects (
  ns_id       INTEGER NOT NULL,
  slug        TEXT NOT NULL,
  article_id  INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  PRIMARY KEY (ns_id, slug)
);
CREATE TABLE IF NOT EXISTS revisions (
  id          INTEGER PRIMARY KEY,
  article_id  INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id),
  title       TEXT NOT NULL,
  template    TEXT NOT NULL,
  fields      TEXT NOT NULL,
  body        TEXT NOT NULL,
  image       TEXT NOT NULL,
  comment     TEXT NOT NULL DEFAULT '',
  size        INTEGER NOT NULL DEFAULT 0,
  hidden      INTEGER NOT NULL DEFAULT 0,          -- content hidden from non-mods
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS revisions_article ON revisions(article_id, id);
CREATE INDEX IF NOT EXISTS revisions_user ON revisions(user_id, id);
CREATE INDEX IF NOT EXISTS revisions_time ON revisions(created_at);
CREATE TABLE IF NOT EXISTS links (
  from_id     INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  to_ns       TEXT NOT NULL,
  to_slug     TEXT NOT NULL,
  to_title    TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (from_id, to_ns, to_slug)
);
CREATE INDEX IF NOT EXISTS links_to ON links(to_ns, to_slug);
CREATE TABLE IF NOT EXISTS reports (
  id          INTEGER PRIMARY KEY,
  article_id  INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id),
  reason      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',        -- open | resolved | dismissed
  note        TEXT NOT NULL DEFAULT '',
  resolved_by INTEGER REFERENCES users(id),
  created_at  INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE TABLE IF NOT EXISTS audit (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id),
  action      TEXT NOT NULL,
  target      TEXT NOT NULL DEFAULT '',
  detail      TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS uploads (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  user_id     INTEGER REFERENCES users(id),
  mime        TEXT NOT NULL,
  size        INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL
);
CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(title, body, tokenize = 'unicode61 remove_diacritics 2');
`;

export const DEFAULT_SETTINGS = {
  siteName: 'RP Wiki',
  tagline: 'The story of our city, written by the people who live it.',
  registration: 'open',      // open | approval | closed
  readAccess: 'public',      // public | members
  defaultTheme: 'gta',
  passwordSignup: true,      // false: new accounts only through Discord (when it's set up)
  welcome: 'Welcome! Pick a version of the server below to start reading. Anyone with an account can write and edit articles.',
};

export function openDb(dataDir) {
  fs.mkdirSync(path.join(dataDir, 'uploads'), { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'wiki.db'));
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  const existed = !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
  // Older databases get new columns from MIGRATIONS before the schema's indexes refer to them.
  if (existed) migrate(db);
  db.exec(SCHEMA);
  if (!existed) db.exec(`PRAGMA user_version = ${MIGRATIONS.length}`);
  seed(db);
  return db;
}

// Changes to an existing database, applied once each, in order. Add new ones
// at the end; never edit or remove old ones. (A fresh database gets the
// current SCHEMA above and is then marked as fully migrated.)
const MIGRATIONS = [
  // 1: Discord sign-in
  (db) => db.exec(`ALTER TABLE users ADD COLUMN discord_id TEXT;
    ALTER TABLE users ADD COLUMN discord_name TEXT;
    ALTER TABLE users ADD COLUMN discord_avatar TEXT;
    ALTER TABLE users ADD COLUMN role_source TEXT NOT NULL DEFAULT 'manual';`),
];

function migrate(db) {
  let version = db.prepare('PRAGMA user_version').get().user_version;
  for (; version < MIGRATIONS.length; version++) {
    tx(db, () => MIGRATIONS[version](db));
    db.exec(`PRAGMA user_version = ${version + 1}`);
  }
}

function seed(db) {
  const now = Date.now();
  const hasTemplates = db.prepare('SELECT COUNT(*) AS n FROM templates').get().n;
  if (!hasTemplates) {
    const ins = db.prepare('INSERT INTO templates (key, sort, data) VALUES (?, ?, ?)');
    DEFAULT_TEMPLATES.forEach((t, i) => ins.run(t.key, i, JSON.stringify(t)));
  }
  const ins = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) ins.run(k, JSON.stringify(v));
  const hasNs = db.prepare('SELECT COUNT(*) AS n FROM namespaces').get().n;
  if (!hasNs) {
    const n = db.prepare('INSERT INTO namespaces (slug, name, tagline, theme, sort, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    n.run('gta', 'Los Santos', 'The current city.', 'gta', 0, now);
    n.run('rdr', 'Frontier', 'The Wild West server.', 'rdr', 1, now);
  }
}

// Run fn inside a transaction; rolls back if it throws.
export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
