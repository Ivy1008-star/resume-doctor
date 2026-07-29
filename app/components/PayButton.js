'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Lock } from 'lucide-react'
import { loadPayPal } from './paypalLoader'

// Renders PayPal Smart Buttons when configured, otherwise a simulated pay button.
export default function PayButton({ cfg, tier, amount, label, onPaid }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const loadedRef = useRef(false)

  async function settle(orderId) {
    setBusy(true)
    setErr('')
    try {
      await onPaid(orderId, tier)
    } catch (e) {
      setErr(e.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!cfg || !cfg.paypal || !cfg.paypalClientId || loadedRef.current) return
    loadedRef.current = true
    loadPayPal({ clientId: cfg.paypalClientId, mode: 'capture' })
      .then((paypal) => {
        if (!paypal || !ref.current) return
        paypal.Buttons({
          style: { layout: 'horizontal', color: 'blue', shape: 'rect', label: 'pay', height: 44 },
          createOrder: (data, actions) => actions.order.create({
            purchase_units: [{ amount: { value: String(amount) }, description: `Resume Doctor — ${tier}` }],
          }),
          onApprove: async (data, actions) => {
            await actions.order.capture()
            await settle(data.orderID)
          },
          onError: () => setErr('PayPal error. Please try again.'),
        }).render(ref.current)
      })
      .catch(() => setErr('Could not load PayPal. Please refresh and try again.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg])

  if (busy) {
    return <button className="btn btn-primary btn-block" disabled><Loader2 size={16} className="spin" /> Processing...</button>
  }

  if (cfg && cfg.paypal) {
    return (
      <div>
        <div ref={ref} />
        {err ? <div className="alert alert-error mt-2">{err}</div> : null}
      </div>
    )
  }

  // Demo / simulated payment
  return (
    <div>
      <button className="btn btn-primary btn-block" onClick={() => settle(`DEMO-${Date.now()}`)}>
        <Lock size={16} /> {label} (${amount})
      </button>
      {err ? <div className="alert alert-error mt-2">{err}</div> : null}
    </div>
  )
}
