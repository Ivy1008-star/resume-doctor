'use client'

export const runtime = 'edge'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, Rocket, Info } from 'lucide-react'
import { TopBar, Footer } from '../../components/SiteChrome'
import ReportView from '../../components/ReportView'
import { RewriteView, PremiumView } from '../../components/RewriteView'
import PayButton from '../../components/PayButton'
import SubscribeButton from '../../components/SubscribeButton'

export default function ReportPage({ params }) {
  const router = useRouter()
  const id = params.id
  const [report, setReport] = useState(null)
  const [cfg, setCfg] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ok | auth | error
  const [rewrite, setRewrite] = useState(null)
  const [premium, setPremium] = useState(null)
  const [notice, setNotice] = useState('')
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then(setCfg).catch(() => {})
    fetch(`/api/report/${id}`)
      .then(async (r) => {
        if (r.status === 401) { setStatus('auth'); return null }
        const d = await r.json()
        if (!r.ok) { setStatus('error'); setNotice(d.error || 'Could not load report'); return null }
        setReport(d)
        setRewrite(d.paid_rewrite || null)
        setPremium(d.paid_premium || null)
        setStatus('ok')
      })
      .catch(() => setStatus('error'))
  }, [id])

  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((d) => setIsPro(Boolean(d?.isPro))).catch(() => {})
  }, [])

  useEffect(() => {
    if (status === 'auth') {
      router.push(`/auth?next=${encodeURIComponent(`/report/${id}`)}&report=${id}`)
    }
  }, [status, id, router])

  async function handlePaid(orderId, tier) {
    const res = await fetch('/api/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: id, tier, orderId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Purchase failed')
    setRewrite(data.rewrite)
    if (data.premium) setPremium(data.premium)
    if (data.demo) setNotice('Demo payment: unlocked without a real charge. Add PayPal credentials to enable live payments.')
  }

  async function handleSubscribed(subscriptionId) {
    const res = await fetch('/api/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Subscription failed')
    setIsPro(true)
    await handlePaid('PRO-SUBSCRIPTION', 'premium')
    if (data.demo) setNotice('Demo subscription: activated without a real charge. Add PayPal credentials + plan id to enable live billing.')
  }

  if (status === 'loading' || status === 'auth') {
    return <div className="loading-screen"><Loader2 className="spin" size={28} /><div>Loading your report...</div></div>
  }
  if (status === 'error') {
    return (
      <>
        <TopBar />
        <main className="container"><div className="empty">{notice || 'Report not found.'} <div className="mt-4"><a href="/" className="btn btn-primary">Start a new diagnosis</a></div></div></main>
        <Footer />
      </>
    )
  }

  const a = report.analysis
  const priceRewrite = cfg?.priceRewrite ?? 5
  const pricePremium = cfg?.pricePremium ?? 10
  const priceMonthly = cfg?.priceMonthly ?? 12
  const paid = Boolean(rewrite)

  return (
    <>
      <TopBar />
      <main className="container">
        <div className="section" style={{ paddingBottom: 8 }}>
          <h1 className="section-title">Your Resume Review</h1>
          <p className="section-lead">Here&apos;s exactly what recruiters&apos; systems see — and how to fix it.</p>
          {report.purged ? <div className="alert alert-info"><Info size={15} /> The raw text for this report was auto-deleted after 30 days. The analysis summary remains.</div> : null}
          {notice ? <div className="alert alert-info">{notice}</div> : null}

          <ReportView a={a} />

          {!paid ? (
            <div className="paywall mt-6">
              <h3>Unlock your ATS-optimized rewrite</h3>
              <p>Turn this diagnosis into a resume built to pass the filter — with every change explained. Rewrite and Premium are <strong>one-time payments</strong> for this report; Pro is a <strong>monthly subscription</strong> that unlocks every report.</p>
              <div className="price-row">
                <div className="price-card">
                  <div className="tag">REWRITE</div>
                  <div className="amt">${priceRewrite}<span style={{ fontSize: 14, fontWeight: 500 }}>&nbsp;one-time</span></div>
                  <div className="price-note">Pay once for this report</div>
                  <ul>
                    <li>Full ATS-optimized resume</li>
                    <li>Before/after keyword coverage</li>
                    <li>Every change explained + impact</li>
                    <li>Format fixes applied</li>
                  </ul>
                  <PayButton cfg={cfg} tier="rewrite" amount={priceRewrite} label="Rewrite my resume" onPaid={handlePaid} />
                </div>
                <div className="price-card pop">
                  <div className="tag">PREMIUM</div>
                  <div className="amt">${pricePremium}<span style={{ fontSize: 14, fontWeight: 500 }}>&nbsp;one-time</span></div>
                  <div className="price-note">Pay once for this report</div>
                  <ul>
                    <li>Everything in Rewrite</li>
                    <li>5 predicted interview questions</li>
                    <li>Resume red-flag analysis</li>
                    <li>Localized interview guidance</li>
                  </ul>
                  <PayButton cfg={cfg} tier="premium" amount={pricePremium} label="Get premium report" onPaid={handlePaid} />
                </div>
                <div className="price-card">
                  <div className="tag">PRO / MONTHLY</div>
                  <div className="amt">${priceMonthly}<span style={{ fontSize: 14, fontWeight: 500 }}>/mo</span></div>
                  <div className="price-note">Recurring monthly · cancel anytime</div>
                  <ul>
                    <li>Everything in Premium</li>
                    <li>Unlimited rewrites on every report</li>
                    <li>Up to {cfg?.dailyLimitPro ?? 30} diagnoses per day</li>
                    <li>Cancel anytime</li>
                  </ul>
                  <SubscribeButton cfg={cfg} onActive={handleSubscribed} />
                </div>
              </div>
              {isPro ? (
                <div className="alert alert-info mt-2">
                  You&apos;re a Pro subscriber &mdash; unlock this report at no extra charge.
                  <div className="mt-2" style={{ maxWidth: 320 }}>
                    <PayButton cfg={{ ...cfg, paypal: false }} tier="premium" amount={0} label="Unlock with Pro" onPaid={handlePaid} />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6">
              <h2 className="section-title"><Sparkles size={20} style={{ verticalAlign: -3 }} /> Your Optimized Rewrite</h2>
              <RewriteView rewrite={rewrite} />
              {premium ? (
                <>
                  <h2 className="section-title mt-6"><Rocket size={20} style={{ verticalAlign: -3 }} /> Premium: Interview Prep</h2>
                  <PremiumView premium={premium} />
                </>
              ) : (
                <div className="paywall mt-4">
                  <h3>Add interview prep — ${pricePremium - priceRewrite} one-time upgrade</h3>
                  <p>A single one-time payment to predict the 5 questions HR will likely ask, plus your resume&apos;s red flags.</p>
                  <div style={{ maxWidth: 320, margin: '0 auto' }}>
                    <PayButton cfg={cfg} tier="premium" amount={pricePremium} label="Upgrade to premium" onPaid={handlePaid} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
