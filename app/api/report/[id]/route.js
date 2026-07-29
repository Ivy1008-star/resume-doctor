import { NextResponse } from 'next/server'
import { getReport } from '../../../../lib/store'
import { getSession } from '../../../../lib/session'

export const runtime = 'edge'

export async function GET(req, { params }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  const report = await getReport(params.id)
  if (!report) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  // A report with no owner is claimable by the first authed viewer (analyze-then-login flow).
  if (report.user_id && report.user_id !== session.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  return NextResponse.json({
    id: report.id,
    score: report.score,
    analysis: report.analysis,
    paid_rewrite: report.paid_rewrite,
    paid_premium: report.paid_premium,
    created_at: report.created_at,
    purged: report.purged || false,
  })
}
