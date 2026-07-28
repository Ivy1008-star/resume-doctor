import { NextResponse } from 'next/server'
import { runDiagnosis } from '../../../lib/deepseek'
import { createReport, checkAndConsumeQuota, isProUser } from '../../../lib/store'
import { getSession } from '../../../lib/session'

export const runtime = 'nodejs'

const MAX_LEN = 20000
const DAILY_LIMIT = Number(process.env.DAILY_ANALYSIS_LIMIT || 3)
const DAILY_LIMIT_PRO = Number(process.env.DAILY_ANALYSIS_LIMIT_PRO || 30)

function clientIp(req) {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'anon'
}

export async function POST(req) {
  try {
    const { resume, jd } = await req.json()
    if (!resume || resume.trim().length < 40) {
      return NextResponse.json({ error: 'Please paste a resume with at least 40 characters.' }, { status: 400 })
    }
    const safeResume = String(resume).slice(0, MAX_LEN)
    const safeJd = jd ? String(jd).slice(0, MAX_LEN) : ''

    const session = getSession()
    const pro = session?.id ? await isProUser(session.id) : false
    const identity = session?.id ? `user:${session.id}` : `ip:${clientIp(req)}`
    const limit = pro ? DAILY_LIMIT_PRO : DAILY_LIMIT
    const quota = await checkAndConsumeQuota(identity, limit)
    if (!quota.ok) {
      return NextResponse.json({
        error: pro
          ? `You've reached your Pro limit of ${limit} analyses per day. Please come back tomorrow.`
          : `You've reached the free limit of ${limit} analyses per day. Please come back tomorrow.`,
        limit,
      }, { status: 429 })
    }

    const { data, demo } = await runDiagnosis(safeResume, safeJd)
    const report = await createReport({ userId: session?.id || null, resume: safeResume, jd: safeJd, analysis: data })
    return NextResponse.json({ id: report.id, demo, remaining: quota.remaining })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  }
}
