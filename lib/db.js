// Real SQLite database via sql.js (pure JS/WASM, no native build step).
// The whole DB lives in one file (.data/resume-doctor.db) and is persisted
// after every write. This keeps a genuine relational store while staying
// dependency-light and portable to any Node host.
//
// The public surface is a tiny synchronous-feeling helper set (run/get/all)
// plus lazy init. sql.js itself is synchronous once the WASM module is loaded,
// so we load it once at module init and block callers on that single promise.

import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const DATA_DIR = path.join(process.cwd(), '.data')
const DB_FILE = path.join(DATA_DIR, 'resume-doctor.db')

let dbPromise = null
let db = null
let saveTimer = null

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  sub TEXT,
  email TEXT,
  name TEXT,
  picture TEXT,
  password_hash TEXT,
  created_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  score INTEGER,
  raw_resume TEXT,
  raw_jd TEXT,
  analysis TEXT,
  paid_rewrite TEXT,
  paid_premium TEXT,
  purged INTEGER DEFAULT 0,
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  report_id TEXT,
  amount REAL,
  currency TEXT,
  paypal_order_id TEXT,
  status TEXT,
  tier TEXT,
  demo INTEGER DEFAULT 0,
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  paypal_subscription_id TEXT,
  plan_id TEXT,
  status TEXT,
  created_at INTEGER,
  updated_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);

CREATE TABLE IF NOT EXISTS usage (
  identity TEXT,
  day TEXT,
  count INTEGER,
  PRIMARY KEY (identity, day)
);
`

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

async function open() {
  // Load sql.js at runtime (not bundled by webpack; see next.config.js
  // serverComponentsExternalPackages). The wasm binary lives beside the
  // package's dist folder.
  const initSqlJs = require('sql.js')
  const distDir = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist')
  const SQL = await initSqlJs({ locateFile: (file) => path.join(distDir, file) })
  ensureDir()
  if (fs.existsSync(DB_FILE)) {
    db = new SQL.Database(fs.readFileSync(DB_FILE))
  } else {
    db = new SQL.Database()
  }
  db.run(SCHEMA)
  persist()
  return db
}

export async function getDb() {
  if (db) return db
  if (!dbPromise) dbPromise = open()
  return dbPromise
}

// Write the in-memory DB to disk. Debounced slightly so a burst of writes in
// one request doesn't hit the filesystem repeatedly.
function persist() {
  if (!db) return
  const data = Buffer.from(db.export())
  fs.writeFileSync(DB_FILE, data)
}

export function save() {
  if (saveTimer) clearTimeout(saveTimer)
  // Immediate synchronous save keeps things simple and correct for MVP scale.
  persist()
}

// --- query helpers (bind params with `?`) ---

export function run(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  stmt.step()
  stmt.free()
  save()
}

export function get(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  return row
}

export function all(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}
