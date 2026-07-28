// One-time helper: creates a PayPal product + monthly billing plan and prints
// the plan id to paste into .env.local as PAYPAL_PLAN_ID.
//
// Usage (after filling PayPal creds in .env.local):
//   node scripts/create-plan.mjs
import fs from 'fs'
import path from 'path'

// Minimal .env.local loader (no dependency on dotenv).
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

const { createMonthlyPlan } = await import('../lib/paypal.js')

const price = process.env.PRICE_MONTHLY || '12'
try {
  const { productId, planId } = await createMonthlyPlan({ name: 'Resume Doctor Pro', price })
  console.log('\nProduct ID:', productId)
  console.log('Plan ID   :', planId)
  console.log('\nPaste this into .env.local:\n  PAYPAL_PLAN_ID=' + planId + '\n')
} catch (err) {
  console.error('Failed to create plan:', err.message)
  process.exit(1)
}
