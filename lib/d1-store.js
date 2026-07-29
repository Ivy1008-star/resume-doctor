// node:crypto is imported LAZILY (see getCrypto) rather than at the top level.
// A top-level `import * as crypto from 'node:crypto'` gets rewritten by the
// edge build so its members (randomUUID/randomBytes/scryptSync) resolve to
// `undefined` at runtime on Cloudflare, which silently produced `id=undefined`
// on INSERT and failed with `D1_TYPE_ERROR: Type 'undefined' not supported`.
// The lazy `await import('node:crypto')` pattern (same as lib/session.js) works
// under nodejs_compat. UUIDs use the always-present Web Crypto global.
let _crypto = null
async function getCrypto() {
  if (!_crypto) {
    const mod = await import('node:crypto')
    _crypto = mod.default || mod
  }
  return _crypto
}
function uuid() {
  // Web Crypto is available on the edge runtime and in modern Node globals.
  return globalThis.crypto.randomUUID()
}

let DB = null
export function setDB(binding) { DB = binding }

function first(sql, p = []) { return DB.prepare(sql).bind(...p).first() }
function all(sql, p = []) { const r = DB.prepare(sql).bind(...p).all(); return r.results || [] }
function run(sql, p = []) { DB.prepare(sql).bind(...p).run() }
function parseRow(r, jf = []) { if (!r) return r; for (const f of jf) { if (r[f] != null && typeof r[f] === 'string') { try { r[f] = JSON.parse(r[f]) } catch {} } else if (r[f] === undefined) r[f] = null }; return r }
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000
function purgeExpired() { const c = Date.now() - RETENTION_MS; run('UPDATE reports SET raw_resume=NULL,raw_jd=NULL,purged=1 WHERE created_at<? AND raw_resume IS NOT NULL', [c]) }
async function hashPassword(pw) { const crypto = await getCrypto(); const s = crypto.randomBytes(16).toString('hex'); const d = crypto.scryptSync(String(pw), s, 64).toString('hex'); return 'scrypt$'+s+'$'+d }
async function checkPassword(pw, st) { if (!st||!st.startsWith('scrypt$')) return false; const crypto = await getCrypto(); const [,s,h]=st.split('$'); const d=crypto.scryptSync(String(pw),s,64).toString('hex'); const a=Buffer.from(h,'hex'),b=Buffer.from(d,'hex'); return a.length===b.length&&crypto.timingSafeEqual(a,b) }
function getRow(id) { return parseRow(first('SELECT * FROM reports WHERE id=?',[id]),['analysis','paid_rewrite','paid_premium']) }
function todayKey() { return new Date().toISOString().slice(0,10) }

export async function upsertUser({sub,email,name,picture}) { let u=null; if (sub) u=first('SELECT * FROM users WHERE sub=?',[sub]); if (!u&&email) u=first('SELECT * FROM users WHERE email=?',[email]); if (!u) { const id=uuid(); run('INSERT INTO users(id,sub,email,name,picture,password_hash,created_at) VALUES(?,?,?,?,?,NULL,?)',[id,sub||null,email||null,name||null,picture||null,Date.now()]); return first('SELECT * FROM users WHERE id=?',[id]) } const n2=name&&u.name!==name?name:u.name; const p2=picture&&u.picture!==picture?picture:u.picture; if (n2!==u.name||p2!==u.picture) run('UPDATE users SET name=?,picture=? WHERE id=?',[n2,p2,u.id]); return first('SELECT * FROM users WHERE id=?',[u.id]) }
export async function createEmailUser({email,name,password}) { const e=String(email).trim().toLowerCase(); const x=first('SELECT * FROM users WHERE email=?',[e]); if (x) { if (x.password_hash) return {error:'email_taken'}; run('UPDATE users SET password_hash=?,name=COALESCE(?,name) WHERE id=?',[await hashPassword(password),name||null,x.id]); return {user:first('SELECT * FROM users WHERE id=?',[x.id])} } const id=uuid(); run('INSERT INTO users(id,sub,email,name,picture,password_hash,created_at) VALUES(?,NULL,?,?,NULL,?,?)',[id,e,name||null,await hashPassword(password),Date.now()]); return {user:first('SELECT * FROM users WHERE id=?',[id])} }
export async function verifyEmailUser({email,password}) { const e=String(email).trim().toLowerCase(); const u=first('SELECT * FROM users WHERE email=?',[e]); if (!u||!u.password_hash) return null; return (await checkPassword(password,u.password_hash))?u:null }
export async function createReport({userId,resume,jd,analysis}) { purgeExpired(); const id=uuid(); run('INSERT INTO reports(id,user_id,score,raw_resume,raw_jd,analysis,paid_rewrite,paid_premium,purged,created_at) VALUES(?,?,?,?,?,?,NULL,NULL,0,?)',[id,userId||null,analysis?.overall_score??null,resume||'',jd||'',JSON.stringify(analysis||{}),Date.now()]); return getRow(id) }
export async function getReport(id) { purgeExpired(); const r=getRow(id); if (r) r.purged=Boolean(r.purged); return r||null }
export async function attachUser(reportId,userId) { const r=first('SELECT * FROM reports WHERE id=?',[reportId]); if (r&&!r.user_id) run('UPDATE reports SET user_id=? WHERE id=?',[userId,reportId]); return getRow(reportId) }
export async function updateReport(id,patch) { const f=[],p=[]; for (const [k,v] of Object.entries(patch)) { f.push(k+'=?'); p.push(k==='paid_rewrite'||k==='paid_premium'||k==='analysis'?JSON.stringify(v):v) }; if (!f.length) return getRow(id); p.push(id); run('UPDATE reports SET '+f.join(', ')+' WHERE id=?',p); return getRow(id) }
export async function listReportsByUser(userId) { purgeExpired(); return all('SELECT id,score,analysis,created_at FROM reports WHERE user_id=? ORDER BY created_at DESC',[userId]).map(r=>{const a=(()=>{try{return JSON.parse(r.analysis||'{}')}catch{return{}}})();return{id:r.id,score:r.score,created_at:r.created_at,summary:a?.summary||'',city:a?.market_insight?.city||''}}) }
export async function deleteUserData(userId) { run('DELETE FROM reports WHERE user_id=?',[userId]); run('DELETE FROM payments WHERE user_id=?',[userId]); run('DELETE FROM subscriptions WHERE user_id=?',[userId]); run('DELETE FROM users WHERE id=?',[userId]); return true }
export async function recordPayment(pay) { run('INSERT INTO payments(id,user_id,report_id,amount,currency,paypal_order_id,status,tier,demo,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',[uuid(),pay.user_id||null,pay.report_id||null,pay.amount??null,pay.currency||'USD',pay.paypal_order_id||null,pay.status||null,pay.tier||null,pay.demo?1:0,Date.now()]) }
export async function checkAndConsumeQuota(identity,limit) { const d=todayKey(); const r=first('SELECT count FROM usage WHERE identity=? AND day=?',[identity,d]); const u=r?r.count:0; if (u>=limit) return {ok:false,used:u,limit,remaining:0}; if (r) run('UPDATE usage SET count=count+1 WHERE identity=? AND day=?',[identity,d]); else run('INSERT INTO usage(identity,day,count) VALUES(?,?,1)',[identity,d]); return {ok:true,used:u+1,limit,remaining:Math.max(0,limit-u-1)} }
export async function upsertSubscription({userId,paypalSubscriptionId,planId,status}) { const x=first('SELECT * FROM subscriptions WHERE user_id=?',[userId]); const n=Date.now(); if (!x) { run('INSERT INTO subscriptions(id,user_id,paypal_subscription_id,plan_id,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',[uuid(),userId,paypalSubscriptionId,planId,status,n,n]) } else { run('UPDATE subscriptions SET paypal_subscription_id=?,plan_id=?,status=?,updated_at=? WHERE user_id=?',[paypalSubscriptionId,planId,status,n,userId]) }; return first('SELECT * FROM subscriptions WHERE user_id=?',[userId]) }
export async function getSubscription(userId) { return first('SELECT * FROM subscriptions WHERE user_id=?',[userId])||null }
export async function isProUser(userId) { const s=first('SELECT status FROM subscriptions WHERE user_id=?',[userId]); return Boolean(s&&['ACTIVE','APPROVAL_PENDING','APPROVED'].includes(s.status)) }
export async function setSubscriptionStatus(userId,status) { const s=first('SELECT * FROM subscriptions WHERE user_id=?',[userId]); if (!s) return null; run('UPDATE subscriptions SET status=?,updated_at=? WHERE user_id=?',[status,Date.now(),userId]); return first('SELECT * FROM subscriptions WHERE user_id=?',[userId]) }
