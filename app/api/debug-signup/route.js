import { NextResponse } from 'next/server'

export const runtime = 'edge'

// TEMPORARY diagnostic for the signup D1_TYPE_ERROR. Uses only lazy imports so
// the edge build's static analysis never sees a top-level node:crypto import.
// Remove after use.
export async function GET() {
  const out = {}
  try {
    out.hasGlobalCrypto = typeof globalThis.crypto
    out.hasRandomUUID = typeof globalThis.crypto?.randomUUID
    try { out.uuid = globalThis.crypto.randomUUID() } catch (e) { out.uuidErr = String(e?.message || e) }
  } catch (e) { out.cryptoProbeErr = String(e?.message || e) }

  try {
    const mod = await import('node:crypto')
    const c = mod.default || mod
    out.nodeRandomBytes = typeof c.randomBytes
    out.nodeScryptSync = typeof c.scryptSync
    try { out.hash = (await (async () => { const s = c.randomBytes(16).toString('hex'); const d = c.scryptSync('pw', s, 64).toString('hex'); return 'scrypt$' + s + '$' + d })()).slice(0, 20) } catch (e) { out.hashErr = String(e?.message || e) }
  } catch (e) { out.nodeCryptoErr = String(e?.message || e) }

  // Try a direct D1 insert with fully-explicit values to see if D1 itself is ok.
  try {
    const { getRequestContext } = await import('@cloudflare/next-on-pages')
    const ctx = getRequestContext()
    const db = ctx?.env?.resume_doctor_db
    out.hasDb = Boolean(db)
    if (db) {
      const id = globalThis.crypto.randomUUID()
      const email = 'dbg_' + Date.now() + '@example.com'
      try {
        await db.prepare('INSERT INTO users(id,sub,email,name,picture,password_hash,created_at) VALUES(?,?,?,?,?,?,?)')
          .bind(id, null, email, 'Dbg', null, 'scrypt$deadbeef$cafe', Date.now())
          .run()
        out.directInsert = 'ok'
        const row = await db.prepare('SELECT id,email FROM users WHERE id=?').bind(id).first()
        out.directRow = row
        await db.prepare('DELETE FROM users WHERE id=?').bind(id).run()
        out.cleanup = 'ok'
      } catch (e) { out.directInsertErr = String(e?.message || e) }
    }
  } catch (e) { out.dbProbeErr = String(e?.message || e) }

  return NextResponse.json(out)
}
