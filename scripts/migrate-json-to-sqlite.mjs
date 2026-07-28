// One-time migration: import legacy .data/*.json (users, reports, payments,
// subscriptions, usage) into the SQLite database created by lib/db.js.
// Safe to re-run: uses INSERT OR IGNORE on primary keys.
//
// Usage:  node scripts/migrate-json-to-sqlite.mjs
import fs from 'fs'
import path from 'path'
import initSqlJs from 'sql.js'

const DATA_DIR = path.join(process.cwd(), '.data')
const DB_FILE = path.join(DATA_DIR, 'resume-doctor.db')

function readJson(name) {
  const p = path.join(DATA_DIR, name)
  if (!fs.existsSync(p)) return []
  try { return JSON.parse(fs.readFileSync(p, 'utf8') || '[]') } catch { return [] }
}

const SCHEMA = fs.readFileSync(new URL('./_schema.sql', import.meta.url), 'utf8')

const SQL = await initSqlJs()
const db = fs.existsSync(DB_FILE) ? new SQL.Database(fs.readFileSync(DB_FILE)) : new SQL.Database()
db.run(SCHEMA)

let counts = { users: 0, reports: 0, payments: 0, subscriptions: 0, usage: 0 }

for (const u of readJson('users.json')) {
  db.run(`INSERT OR IGNORE INTO users (id, sub, email, name, picture, password_hash, created_at) VALUES (?,?,?,?,?,?,?)`,
    [u.id, u.sub || null, u.email || null, u.name || null, u.picture || null, u.password_hash || null, u.created_at || Date.now()])
  counts.users++
}

for (const r of readJson('reports.json')) {
  db.run(`INSERT OR IGNORE INTO reports (id, user_id, score, raw_resume, raw_jd, analysis, paid_rewrite, paid_premium, purged, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [r.id, r.user_id || null, r.score ?? null, r.raw_resume ?? null, r.raw_jd ?? null,
     JSON.stringify(r.analysis || {}), r.paid_rewrite ? JSON.stringify(r.paid_rewrite) : null,
     r.paid_premium ? JSON.stringify(r.paid_premium) : null, r.purged ? 1 : 0, r.created_at || Date.now()])
  counts.reports++
}

for (const p of readJson('payments.json')) {
  db.run(`INSERT OR IGNORE INTO payments (id, user_id, report_id, amount, currency, paypal_order_id, status, tier, demo, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [p.id, p.user_id || null, p.report_id || null, p.amount ?? null, p.currency || 'USD',
     p.paypal_order_id || null, p.status || null, p.tier || null, p.demo ? 1 : 0, p.created_at || Date.now()])
  counts.payments++
}

for (const s of readJson('subscriptions.json')) {
  db.run(`INSERT OR IGNORE INTO subscriptions (id, user_id, paypal_subscription_id, plan_id, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)`,
    [s.id, s.user_id || null, s.paypal_subscription_id || null, s.plan_id || null, s.status || null, s.created_at || Date.now(), s.updated_at || Date.now()])
  counts.subscriptions++
}

for (const row of readJson('usage.json')) {
  if (!row.identity || !row.day) continue
  db.run(`INSERT OR IGNORE INTO usage (identity, day, count) VALUES (?,?,?)`, [row.identity, row.day, row.count || 0])
  counts.usage++
}

fs.writeFileSync(DB_FILE, Buffer.from(db.export()))
console.log('Migration complete:', counts)
console.log('SQLite DB written to', DB_FILE)
