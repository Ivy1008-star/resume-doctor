// PayPal REST helpers. Falls back to demo (simulated capture) when no creds.

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
const SECRET = process.env.PAYPAL_CLIENT_SECRET
const ENV = process.env.PAYPAL_ENV || 'sandbox'
const BASE = ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
// Optional outbound proxy for reaching PayPal (local dev networks that can't
// connect directly). Reuses GOOGLE_PROXY / HTTPS_PROXY. Blank in production.
const PROXY_URL = process.env.PAYPAL_PROXY || process.env.GOOGLE_PROXY || process.env.HTTPS_PROXY || ''
let proxyDispatcher = null

export function paypalConfigured() {
  return Boolean(CLIENT_ID && SECRET && !CLIENT_ID.startsWith('your_') && !SECRET.startsWith('your_'))
}

async function ppFetch(url, options = {}) {
  if (PROXY_URL) {
    if (!proxyDispatcher) {
      // Specifier read from globalThis (always undefined -> 'undici') so neither
      // webpack nor next-on-pages' esbuild statically resolves/bundles undici.
      // Only runs when a proxy is configured (local dev), never on Cloudflare.
      const undiciSpec = globalThis.__RD_UNDICI__ || 'undici'
      const { ProxyAgent } = await import(/* webpackIgnore: true */ undiciSpec)
      proxyDispatcher = new ProxyAgent(PROXY_URL)
    }
    return fetch(url, { ...options, dispatcher: proxyDispatcher })
  }
  return fetch(url, options)
}

async function accessToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64')
  const res = await ppFetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`PayPal token error ${res.status}`)
  const data = await res.json()
  return data.access_token
}

// Verify a captured order server-side to prevent client-side spoofing.
export async function verifyOrder(orderId, expectedAmount) {
  if (!paypalConfigured()) {
    // Demo mode: accept simulated order ids.
    if (String(orderId).startsWith('DEMO-')) return { ok: true, demo: true }
    return { ok: false, demo: true, error: 'PayPal not configured' }
  }
  const token = await accessToken()
  const res = await ppFetch(`${BASE}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return { ok: false, error: `Order lookup ${res.status}` }
  const order = await res.json()
  const completed = order.status === 'COMPLETED' || order.status === 'APPROVED'
  const amount = order?.purchase_units?.[0]?.amount?.value
  const amountOk = !expectedAmount || Number(amount) >= Number(expectedAmount)
  return { ok: completed && amountOk, order, demo: false }
}

// Verify a subscription server-side (called after buyer approves in the UI).
export async function verifySubscription(subscriptionId) {
  if (!paypalConfigured()) {
    if (String(subscriptionId).startsWith('DEMO-')) {
      return { ok: true, demo: true, status: 'ACTIVE', planId: 'DEMO-PLAN' }
    }
    return { ok: false, demo: true, error: 'PayPal not configured' }
  }
  const token = await accessToken()
  const res = await ppFetch(`${BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return { ok: false, error: `Subscription lookup ${res.status}` }
  const sub = await res.json()
  const active = ['ACTIVE', 'APPROVED'].includes(sub.status)
  return { ok: active, status: sub.status, planId: sub.plan_id, sub, demo: false }
}

// Cancel an active subscription.
export async function cancelSubscription(subscriptionId, reason = 'User requested cancellation') {
  if (!paypalConfigured()) return { ok: true, demo: true }
  const token = await accessToken()
  const res = await ppFetch(`${BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  return { ok: res.status === 204, status: res.status }
}

// ---- one-time setup: create a product + monthly plan, returns plan id ----
export async function createMonthlyPlan({ name, price, currency = 'USD' }) {
  const token = await accessToken()
  const prodRes = await ppFetch(`${BASE}/v1/catalogs/products`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name || 'Resume Doctor Pro', type: 'SERVICE', category: 'SOFTWARE' }),
  })
  if (!prodRes.ok) throw new Error(`Create product failed ${prodRes.status}: ${await prodRes.text()}`)
  const product = await prodRes.json()
  const planRes = await ppFetch(`${BASE}/v1/billing/plans`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: product.id,
      name: `${name || 'Resume Doctor Pro'} Monthly`,
      status: 'ACTIVE',
      billing_cycles: [{
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: String(price), currency_code: currency } },
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 1,
      },
    }),
  })
  if (!planRes.ok) throw new Error(`Create plan failed ${planRes.status}: ${await planRes.text()}`)
  const plan = await planRes.json()
  return { productId: product.id, planId: plan.id }
}
