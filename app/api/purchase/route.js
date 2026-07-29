import { NextResponse } from 'next/server'
import { getReport, updateReport, recordPayment, isProUser } from '../../../lib/store'
import { getSession } from '../../../lib/session'
import { verifyOrder } from '../../../lib/paypal'
import { runRewrite, runInterview } from '../../../lib/deepseek'

export const runtime = 'edge'

const PRICE_REWRITE = Number(process.env.PRICE_REWRITE || 5)
const PRICE_PREMIUM = Number(process.env.PRICE_PREMIUM || 10)

export async function POST(req) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    const { reportId, tier, orderId } = await req.json()
    if (!['rewrite', 'premium'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }
    const report = await getReport(reportId)
    if (!report) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (report.user_id && report.user_id !== session.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Pro subscribers unlock rewrite + interview at no extra charge.
    const pro = await isProUser(session.id)
    let demo = false
    if (pro) {
      await recordPayment({
        user_id: session.id,
        report_id: reportId,
        amount: 0,
        currency: 'USD',
        paypal_order_id: 'PRO-SUBSCRIPTION',
        status: 'pro_unlock',
        tier,
        demo: false,
      })
    } else {
      const amount = tier === 'premium' ? PRICE_PREMIUM : PRICE_REWRITE
      const check = await verifyOrder(orderId, amount)
      if (!check.ok) {
        return NextResponse.json({ error: check.error || 'Payment not verified' }, { status: 402 })
      }
      demo = Boolean(check.demo)
      await recordPayment({
        user_id: session.id,
        report_id: reportId,
        amount,
        currency: 'USD',
        paypal_order_id: orderId,
        status: 'completed',
        tier,
        demo,
      })
    }

    const rewrite = await runRewrite(report.raw_resume, report.raw_jd, report.analysis)
    const patch = { paid_rewrite: rewrite.data }
    let interview = null
    if (tier === 'premium') {
      interview = await runInterview(report.raw_resume, report.raw_jd)
      patch.paid_premium = interview.data
    }
    await updateReport(reportId, patch)

    return NextResponse.json({
      ok: true,
      demo,
      pro,
      rewrite: rewrite.data,
      premium: interview ? interview.data : null,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Purchase failed' }, { status: 500 })
  }
}
