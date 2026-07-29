import { NextResponse } from 'next/server'
import { getSession } from '../../../lib/session'
import { verifySubscription, cancelSubscription } from '../../../lib/paypal'
import { upsertSubscription, getSubscription, setSubscriptionStatus, recordPayment } from '../../../lib/store'

export const runtime = 'edge'

const PLAN_ID = process.env.PAYPAL_PLAN_ID || ''
const PRICE_MONTHLY = Number(process.env.PRICE_MONTHLY || 12)

// Activate a subscription after the buyer approves it in the PayPal button.
export async function POST(req) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    const { subscriptionId } = await req.json()
    if (!subscriptionId) return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 })

    const check = await verifySubscription(subscriptionId)
    if (!check.ok) {
      return NextResponse.json({ error: check.error || 'Subscription not active' }, { status: 402 })
    }
    const sub = await upsertSubscription({
      userId: session.id,
      paypalSubscriptionId: subscriptionId,
      planId: check.planId || PLAN_ID,
      status: check.status || 'ACTIVE',
    })
    await recordPayment({
      user_id: session.id,
      amount: PRICE_MONTHLY,
      currency: 'USD',
      paypal_order_id: subscriptionId,
      status: 'subscription_active',
      tier: 'subscription',
      demo: Boolean(check.demo),
    })
    return NextResponse.json({ ok: true, demo: Boolean(check.demo), status: sub.status })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Subscription failed' }, { status: 500 })
  }
}

// Cancel the current user's subscription.
export async function DELETE() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    const sub = await getSubscription(session.id)
    if (!sub) return NextResponse.json({ error: 'No subscription' }, { status: 404 })
    await cancelSubscription(sub.paypal_subscription_id)
    await setSubscriptionStatus(session.id, 'CANCELLED')
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Cancel failed' }, { status: 500 })
  }
}
