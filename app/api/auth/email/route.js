import { NextResponse } from 'next/server'
import { createEmailUser, verifyEmailUser, attachUser } from '../../../../lib/store'
import { createSessionCookie } from '../../../../lib/session'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req) {
  try {
    const { mode, email, password, name, reportId } = await req.json()
    if (!email || !EMAIL_RE.test(String(email))) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }
    if (!password || String(password).length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    let user
    if (mode === 'register') {
      const result = await createEmailUser({ email, name, password })
      if (result.error === 'email_taken') {
        return NextResponse.json({ error: 'An account with this email already exists. Try signing in.' }, { status: 409 })
      }
      user = result.user
    } else {
      user = await verifyEmailUser({ email, password })
      if (!user) {
        return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 })
      }
    }

    createSessionCookie(user)
    if (reportId) await attachUser(reportId, user.id)
    return NextResponse.json({ ok: true, user: { name: user.name, email: user.email, picture: user.picture } })
  } catch (err) {
    console.error('[auth/email] failed:', err?.message)
    return NextResponse.json({ error: err.message || 'Authentication failed' }, { status: 500 })
  }
}
