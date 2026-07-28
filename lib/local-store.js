// Local SQLite-backed store (via lib/db.js). Same API as d1-store.js.
// Used by the facade (lib/store.js) when running locally, not on Cloudflare.

import crypto from 'node:crypto'
import { getDb, run, get, all } from './db.js'

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000

function parse(row, jsonFields = []) {
  if (!row) return row
  for (const f of jsonFields) {
    if (row[f] != null && typeof row[f] === 'string') {
      try { row[f] = JSON.parse(row[f]) } catch { }
    } else if (row[f] === undefined) { row[f] = null }
  }
  return row
}

async function ready() { await getDb() }

async function purgeExpired() {
  const cutoff = Date.now() - RETENTION_MS
  run('UPDATE reports SET raw_resume = NULL, raw_jd = NULL, purged = 1 WHERE created_at < ? AND raw_resume IS NOT NULL', [cutoff])
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return `scrypt$${salt}$${derived}`
}

function checkPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false
  const [, salt, hash] = stored.split('$')
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex')
  const a = Buffer.from(hash, 'hex')
  const b = Buffer.from(derived, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function upsertUser({ sub, email, name, picture }) {
  await ready()
  let user = null
  if (sub) user = get('SELECT * FROM users WHERE sub = ?', [sub])
  if (!user && email) user = get('SELECT * FROM users WHERE email = ?', [email])
  if (!user) {
    const id = crypto.randomUUID()
    run('INSERT INTO users (id, sub, email, name, picture, password_hash, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)', [id, sub || null, email || null, name || null, picture || null, Date.now()])
    return get('SELECT * FROM users WHERE id = ?', [id])
  }
  const name2 = name && user.name !== name ? name : user.name
  const pic2 = picture && user.picture !== picture ? picture : user.picture
  if (name2 !== user.name || pic2 !== user.picture) run('UPDATE users SET name = ?, picture = ? WHERE id = ?', [name2, pic2, user.id])
  return get('SELECT * FROM users WHERE id = ?', [user.id])
}

export async function createEmailUser({ email, name, password }) {
  await ready()
  const normalized = String(email).trim().toLowerCase()
  const existing = get('SELECT * FROM users WHERE email = ?', [normalized])
  if (existing) {
    if (existing.password_hash) return { error: 'email_taken' }
    run('UPDATE users SET password_hash = ?, name = COALESCE(?, name) WHERE id = ?', [hashPassword(password), name || null, existing.id])
    return { user: get('SELECT * FROM users WHERE id = ?', [existing.id]) }
  }
  const id = crypto.randomUUID()
  run('INSERT INTO users (id, sub, email, name, picture, password_hash, created_at) VALUES (?, NULL, ?, ?, NULL, ?, ?)', [id, normalized, name || null, hashPassword(password), Date.now()])
  return { user: get('SELECT * FROM users WHERE id = ?', [id]) }
}

export async function verifyEmailUser({ email, password }) {
  await ready()
  const normalized = String(email).trim().toLowerCase()
  const user = get('SELECT * FROM users WHERE email = ?', [normalized])
  if (!user || !user.password_hash) return null
  if (!checkPassword(password, user.password_hash)) return null
  return user
}

export async function createReport({ userId, resume, jd, analysis }) {
  await ready(); await purgeExpired()
  const id = crypto.randomUUID()
  run('INSERT INTO reports (id, user_id, score, raw_resume, raw_jd, analysis, paid_rewrite, paid_premium, purged, created_at) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 0, ?)', [id, userId || null, analysis?.overall_score ?? null, resume || '', jd || '', JSON.stringify(analysis || {}), Date.now()])
  return getRow(id)
}

function getRow(id) { return parse(get('SELECT * FROM reports WHERE id = ?', [id]), ['analysis', 'paid_rewrite', 'paid_premium']) }

export async function getReport(id) { await ready(); await purgeExpired(); const r = getRow(id); if (r) r.purged = Boolean(r.purged); return r || null }
export async function attachUser(reportId, userId) { await ready(); const r = get('SELECT * FROM reports WHERE id = ?', [reportId]); if (r && !r.user_id) run('UPDATE reports SET user_id = ? WHERE id = ?', [userId, reportId]); return getRow(reportId) }
export async function updateReport(id, patch) { await ready(); const fields = []; const params = []; for (const [k, v] of Object.entries(patch)) { fields.push(`${k} = ?`); params.push(k === 'paid_rewrite' || k === 'paid_premium' || k === 'analysis' ? JSON.stringify(v) : v) }; if (!fields.length) return getRow(id); params.push(id); run(`UPDATE reports SET ${fields.join(', ')} WHERE id = ?`, params); return getRow(id) }
export async function listReportsByUser(userId) { await ready(); await purgeExpired(); return all('SELECT id, score, analysis, created_at FROM reports WHERE user_id = ? ORDER BY created_at DESC', [userId]).map((r) => { const a = (() => { try { return JSON.parse(r.analysis || '{}') } catch { return {} } })(); return { id: r.id, score: r.score, created_at: r.created_at, summary: a?.summary || '', city: a?.market_insight?.city || '' } }) }
export async function deleteUserData(userId) { await ready(); run('DELETE FROM reports WHERE user_id = ?', [userId]); run('DELETE FROM payments WHERE user_id = ?', [userId]); run('DELETE FROM subscriptions WHERE user_id = ?', [userId]); run('DELETE FROM users WHERE id = ?', [userId]); return true }
export async function recordPayment(payment) { await ready(); run('INSERT INTO payments (id, user_id, report_id, amount, currency, paypal_order_id, status, tier, demo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [crypto.randomUUID(), payment.user_id || null, payment.report_id || null, payment.amount ?? null, payment.currency || 'USD', payment.paypal_order_id || null, payment.status || null, payment.tier || null, payment.demo ? 1 : 0, Date.now()]) }
function todayKey() { return new Date().toISOString().slice(0, 10) }
export async function checkAndConsumeQuota(identity, limit) { await ready(); const day = todayKey(); const row = get('SELECT count FROM usage WHERE identity = ? AND day = ?', [identity, day]); const used = row ? row.count : 0; if (used >= limit) return { ok: false, used, limit, remaining: 0 }; if (row) run('UPDATE usage SET count = count + 1 WHERE identity = ? AND day = ?', [identity, day]); else run('INSERT INTO usage (identity, day, count) VALUES (?, ?, 1)', [identity, day]); const next = used + 1; return { ok: true, used: next, limit, remaining: Math.max(0, limit - next) } }
export async function upsertSubscription({ userId, paypalSubscriptionId, planId, status }) { await ready(); const existing = get('SELECT * FROM subscriptions WHERE user_id = ?', [userId]); const now = Date.now(); if (!existing) { run('INSERT INTO subscriptions (id, user_id, paypal_subscription_id, plan_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [crypto.randomUUID(), userId, paypalSubscriptionId, planId, status, now, now]) } else { run('UPDATE subscriptions SET paypal_subscription_id = ?, plan_id = ?, status = ?, updated_at = ? WHERE user_id = ?', [paypalSubscriptionId, planId, status, now, userId]) }; return get('SELECT * FROM subscriptions WHERE user_id = ?', [userId]) }
export async function getSubscription(userId) { await ready(); return get('SELECT * FROM subscriptions WHERE user_id = ?', [userId]) || null }
export async function isProUser(userId) { await ready(); const sub = get('SELECT status FROM subscriptions WHERE user_id = ?', [userId]); return Boolean(sub && ['ACTIVE', 'APPROVAL_PENDING', 'APPROVED'].includes(sub.status)) }
export async function setSubscriptionStatus(userId, status) { await ready(); const sub = get('SELECT * FROM subscriptions WHERE user_id = ?', [userId]); if (!sub) return null; run('UPDATE subscriptions SET status = ?, updated_at = ? WHERE user_id = ?', [status, Date.now(), userId]); return get('SELECT * FROM subscriptions WHERE user_id = ?', [userId]) }
