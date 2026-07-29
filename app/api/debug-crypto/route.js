import { NextResponse } from 'next/server'
import * as crypto from 'node:crypto'

export const runtime = 'edge'

// TEMPORARY diagnostic: reports whether node:crypto primitives used by the
// email-signup path resolve on the Cloudflare edge runtime. Remove after use.
export async function GET() {
  const out = {}
  out.typeofRandomUUID = typeof crypto.randomUUID
  out.typeofRandomBytes = typeof crypto.randomBytes
  out.typeofScryptSync = typeof crypto.scryptSync
  out.typeofCreateHmac = typeof crypto.createHmac
  try { out.randomUUID = crypto.randomUUID() } catch (e) { out.randomUUIDErr = String(e?.message || e) }
  try { out.randomBytesHex = crypto.randomBytes(4).toString('hex') } catch (e) { out.randomBytesErr = String(e?.message || e) }
  try { out.scrypt = crypto.scryptSync('pw', 'salt', 8).toString('hex') } catch (e) { out.scryptErr = String(e?.message || e) }
  return NextResponse.json(out)
}
