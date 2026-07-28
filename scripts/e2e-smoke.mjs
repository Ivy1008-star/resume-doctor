// Self-contained end-to-end smoke test: boots the built Next server on a random
// port, exercises the full flow over HTTP (register -> analyze -> report ->
// purchase -> subscribe), asserts the SQLite store persisted, then exits.
import { spawn } from 'child_process'
import path from 'path'

const PORT = 3311
const BASE = `http://localhost:${PORT}`

function wait(ms) { return new Promise((r) => setTimeout(r, ms)) }

// simple cookie jar
let cookie = ''
async function api(pathname, { method = 'GET', body, noCookie = false } = {}) {
  const res = await fetch(BASE + pathname, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie && !noCookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  })
  const setc = res.headers.get('set-cookie')
  if (setc) cookie = setc.split(';')[0]
  let data = null
  try { data = await res.json() } catch { data = null }
  return { status: res.status, data }
}

const server = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
  cwd: process.cwd(),
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  stdio: 'ignore',
})

let failures = 0
function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`)
  if (!cond) failures++
}

try {
  // wait for server ready
  let up = false
  for (let i = 0; i < 40; i++) {
    await wait(500)
    try { const r = await fetch(BASE + '/api/config'); if (r.ok) { up = true; break } } catch {}
  }
  if (!up) throw new Error('server did not start')

  const cfg = await api('/api/config')
  check('config loads', cfg.status === 200)
  console.log('   config:', JSON.stringify({ ai: cfg.data.ai, google: cfg.data.google, paypal: cfg.data.paypal, planId: Boolean(cfg.data.paypalPlanId) }))

  const email = `smoke+${Date.now()}@example.com`
  const reg = await api('/api/auth/email', { method: 'POST', body: { mode: 'register', email, password: 'supersecret1', name: 'Smoke Test' } })
  check('email register', reg.status === 200 && reg.data.ok, `status=${reg.status}`)

  const me1 = await api('/api/me')
  check('session after register', me1.data.user?.email === email)

  const resume = 'Experienced software engineer with 5 years building Python and SQL data pipelines. Led a team that improved throughput by 30%. Email: test@example.com. Skills: Python, SQL, AWS, Docker. Education: BS Computer Science.'
  const jd = 'Looking for a data engineer skilled in Python, SQL, Airflow, and AWS to build ETL pipelines in New York.'
  const an = await api('/api/analyze', { method: 'POST', body: { resume, jd } })
  check('analyze creates report', an.status === 200 && an.data.id, `status=${an.status}`)
  const reportId = an.data.id

  const rep = await api('/api/report/' + reportId)
  check('report fetch', rep.status === 200 && typeof rep.data.score === 'number', `score=${rep.data?.score}`)

  const buy = await api('/api/purchase', { method: 'POST', body: { reportId, tier: 'premium', orderId: 'DEMO-SMOKE-1' } })
  const paypalLive = Boolean(cfg.data.paypal)
  if (paypalLive) {
    // With real PayPal creds, a fake/demo order id must be rejected server-side.
    check('purchase rejects fake order (live PayPal)', buy.status === 402, `status=${buy.status}`)
  } else {
    check('purchase (demo premium)', buy.status === 200 && buy.data.ok && buy.data.rewrite, `status=${buy.status}`)
    check('purchase returns premium', Boolean(buy.data.premium))
  }

  const sub = await api('/api/subscription', { method: 'POST', body: { subscriptionId: 'DEMO-SUB-SMOKE' } })
  if (paypalLive) {
    check('subscribe rejects fake sub (live PayPal)', sub.status === 402, `status=${sub.status}`)
  } else {
    check('subscribe (demo)', sub.status === 200 && sub.data.ok, `status=${sub.status}`)
    const me2 = await api('/api/me')
    check('isPro after subscribe', me2.data.isPro === true)
    check('subscription persisted', me2.data.subscription?.status === 'ACTIVE', JSON.stringify(me2.data.subscription))
  }

  const me2 = await api('/api/me')
  check('reports listed for user', Array.isArray(me2.data.reports) && me2.data.reports.length >= 1, `count=${me2.data.reports?.length}`)

  // login with wrong then right password (fresh, no cookie)
  cookie = ''
  const badLogin = await api('/api/auth/email', { method: 'POST', body: { mode: 'login', email, password: 'nope12345' }, noCookie: true })
  check('login wrong password rejected', badLogin.status === 401)
  const goodLogin = await api('/api/auth/email', { method: 'POST', body: { mode: 'login', email, password: 'supersecret1' } })
  check('login correct password', goodLogin.status === 200 && goodLogin.data.ok)
} catch (e) {
  console.error('ERROR', e.message)
  failures++
} finally {
  server.kill()
  await wait(300)
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nALL CHECKS PASSED')
  process.exit(failures ? 1 : 0)
}
