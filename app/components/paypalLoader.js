'use client'

// Loads the PayPal JS SDK once per "mode" and hands back the namespaced global.
//
// PayPal does not allow the one-time-capture SDK (intent=capture) and the
// subscription SDK (intent=subscription&vault=true) to share the same
// `window.paypal` object on one page: whichever script loads last wins and the
// other button never renders. The official fix is to give each SDK its own
// `data-namespace`, so they live on separate globals and can coexist.

const NS = {
  capture: 'paypalCapture',
  subscription: 'paypalSubscription',
}

const loaders = {}

export function loadPayPal({ clientId, mode }) {
  const namespace = NS[mode]
  if (!namespace) return Promise.reject(new Error(`Unknown PayPal mode: ${mode}`))

  // Already available on the page (e.g. component remounted): reuse it.
  if (typeof window !== 'undefined' && window[namespace]) {
    return Promise.resolve(window[namespace])
  }
  // A load is already in flight for this mode: share the same promise.
  if (loaders[namespace]) return loaders[namespace]

  const params = new URLSearchParams({ 'client-id': clientId, currency: 'USD' })
  if (mode === 'subscription') {
    params.set('vault', 'true')
    params.set('intent', 'subscription')
  } else {
    params.set('intent', 'capture')
  }

  loaders[namespace] = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`
    script.async = true
    script.setAttribute('data-namespace', namespace)
    script.onload = () => {
      if (window[namespace]) resolve(window[namespace])
      else reject(new Error('PayPal SDK loaded but namespace is missing'))
    }
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'))
    document.body.appendChild(script)
  })

  return loaders[namespace]
}
