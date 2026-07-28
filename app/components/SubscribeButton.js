'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Crown } from 'lucide-react'

// Renders a PayPal subscription button when a plan id is configured, otherwise
// a simulated (demo) subscribe button so the flow is testable without creds.
export default function SubscribeButton({ cfg, onActive }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const loadedRef = useRef(false)

  const liveReady = Boolean(cfg && cfg.paypal && cfg.paypalClientId && cfg.paypalPlanId)

  async function settle(subscriptionId) {
    setBusy(true)
    setErr('')
    try {
      await onActive(subscriptionId)
    } catch (e) {
      setErr(e.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!liveReady || loadedRef.current) return
    loadedRef.current = true
    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${cfg.paypalClientId}&vault=true&intent=subscription`
    script.async = true
    script.onload = () => {
      if (!window.paypal || !ref.current) return
      window.paypal.Buttons({
        style: { layout: 'horizontal', color: 'gold', shape: 'rect', label: 'subscribe', height: 44 },
        createSubscription: (data, actions) => actions.subscription.create({ plan_id: cfg.paypalPlanId }),
        onApprove: async (data) => { await settle(data.subscriptionID) },
        onError: () => setErr('PayPal error. Please try again.'),
      }).render(ref.current)
    }
    document.body.appendChild(script)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveReady])

  if (busy) {
    return <button className="btn btn-primary btn-block" disabled><Loader2 size={16} className="spin" /> Activating...</button>
  }

  if (liveReady) {
    return (
      <div>
        <div ref={ref} />
        {err ? <div className="alert alert-error mt-2">{err}</div> : null}
      </div>
    )
  }

  // Demo / simulated subscription
  return (
    <div>
      <button className="btn btn-primary btn-block" onClick={() => settle(`DEMO-SUB-${Date.now()}`)}>
        <Crown size={16} /> Subscribe (${cfg?.priceMonthly ?? 12}/mo)
      </button>
      {err ? <div className="alert alert-error mt-2">{err}</div> : null}
    </div>
  )
}
