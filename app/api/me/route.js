import { NextResponse } from 'next/server'
import { getSession } from '../../../lib/session'
import { listReportsByUser, deleteUserData, getSubscription, isProUser } from '../../../lib/store'

export const runtime = 'nodejs'

export async function GET() {
  const session = getSession()
  if (!session) return NextResponse.json({ user: null })
  const sub = await getSubscription(session.id)
  return NextResponse.json({
    user: { name: session.name, email: session.email, picture: session.picture },
    reports: await listReportsByUser(session.id),
    isPro: await isProUser(session.id),
    subscription: sub
      ? { status: sub.status, planId: sub.plan_id, since: sub.created_at, updatedAt: sub.updated_at }
      : null,
  })
}

export async function DELETE() {
  const session = getSession()
  if (!session) return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  await deleteUserData(session.id)
  return NextResponse.json({ ok: true })
}
