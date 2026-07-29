import { NextResponse } from 'next/server'
import { verifyGoogleCredential } from '../../../../lib/google'
import { upsertUser } from '../../../../lib/store'
import { createSessionCookie } from '../../../../lib/session'
import { attachUser } from '../../../../lib/store'

export const runtime = 'edge'

export async function POST(req) {
  try {
    const { credential, reportId } = await req.json()
    if (!credential) return NextResponse.json({ error: 'Missing credential' }, { status: 400 })
    const profile = await verifyGoogleCredential(credential)
    const user = await upsertUser(profile)
    await createSessionCookie(user)
    if (reportId) await attachUser(reportId, user.id)
    return NextResponse.json({ ok: true, user: { name: user.name, email: user.email, picture: user.picture } })
  } catch (err) {
    console.error('[auth/google] failed:', err?.message, err?.stack)
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 401 })
  }
}
