import { NextResponse } from 'next/server'
import { hasRealAi } from '../../../lib/deepseek'
import { googleConfigured } from '../../../lib/google'
import { paypalConfigured } from '../../../lib/paypal'

export const runtime = 'edge'

export async function GET() {
  return NextResponse.json({
    ai: hasRealAi(),
    google: googleConfigured(),
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    paypal: paypalConfigured(),
    paypalClientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
    priceRewrite: Number(process.env.PRICE_REWRITE || 5),
    pricePremium: Number(process.env.PRICE_PREMIUM || 10),
    priceMonthly: Number(process.env.PRICE_MONTHLY || 12),
    paypalPlanId: process.env.PAYPAL_PLAN_ID || '',
    dailyLimitPro: Number(process.env.DAILY_ANALYSIS_LIMIT_PRO || 30),
  })
}
