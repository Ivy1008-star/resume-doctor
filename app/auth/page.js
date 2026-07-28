'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Stethoscope, Loader2 } from 'lucide-react'
import { TopBar, Footer } from '../components/SiteChrome'

function AuthInner() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/dashboard'
  const reportId = params.get('report') || null
  const [cfg, setCfg] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const gbtn = useRef(null)
  const [mode, setMode] = useState('login') // login | register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  async function finishLogin(credential) {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, reportId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      router.push(next)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  async function submitEmail(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/auth/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, email, password, name, reportId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Authentication failed')
      router.push(next)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  useEffect(() => {
    fetch('/api/config').then((r) => r.json()).then(setCfg).catch(() => setCfg({ google: false }))
  }, [])

  useEffect(() => {
    if (!cfg || !cfg.google || !cfg.googleClientId) return
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      if (!window.google) return
      window.google.accounts.id.initialize({
        client_id: cfg.googleClientId,
        callback: (resp) => finishLogin(resp.credential),
      })
      if (gbtn.current) {
        window.google.accounts.id.renderButton(gbtn.current, { theme: 'outline', size: 'large', width: 320 })
      }
    }
    document.body.appendChild(script)
    return () => { document.body.removeChild(script) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg])

  function demoLogin() {
    const profile = {
      sub: 'demo-user',
      email: 'demo.user@example.com',
      name: 'Demo User',
      picture: null,
    }
    const token = btoa(JSON.stringify(profile)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    finishLogin(token)
  }

  return (
    <>
      <TopBar />
      <main className="container">
        <div className="auth-wrap">
          <div className="auth-card">
            <div style={{ color: 'var(--teal)', marginBottom: 10 }}><Stethoscope size={34} /></div>
            <h1>Sign in to view your report</h1>
            <p>Your diagnosis is ready. Sign in to unlock the full report and keep your history.</p>
            {error ? <div className="alert alert-error">{error}</div> : null}

            <form className="email-auth" onSubmit={submitEmail}>
              {mode === 'register' ? (
                <div className="fld">
                  <label htmlFor="name">Name <span className="opt">(optional)</span></label>
                  <input id="name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Candidate" />
                </div>
              ) : null}
              <div className="fld">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="fld">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} />
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
                {busy ? <><Loader2 size={16} className="spin" /> Please wait...</> : (mode === 'register' ? 'Create account' : 'Sign in')}
              </button>
            </form>
            <div className="auth-switch">
              {mode === 'register' ? (
                <span>Already have an account? <button type="button" className="linklike" onClick={() => { setMode('login'); setError('') }}>Sign in</button></span>
              ) : (
                <span>New here? <button type="button" className="linklike" onClick={() => { setMode('register'); setError('') }}>Create an account</button></span>
              )}
            </div>

            {(cfg && cfg.google) || (cfg && !cfg.google) ? <div className="auth-or"><span>or</span></div> : null}

            {cfg && cfg.google ? (
              <div className="gbtn-wrap" ref={gbtn} />
            ) : null}

            {cfg && !cfg.google ? (
              <>
                <div className="alert alert-info">
                  Google Sign-In isn&apos;t configured yet. Use the demo login to preview the full flow,
                  then add <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to enable real Google login.
                </div>
                <button className="btn btn-primary btn-block demo-login" onClick={demoLogin} disabled={busy}>
                  {busy ? <><Loader2 size={16} className="spin" /> Signing in...</> : 'Continue with Demo Account'}
                </button>
              </>
            ) : null}

            {!cfg ? <div className="gbtn-wrap"><Loader2 className="spin" /></div> : null}

            <p className="disclaimer mt-4">
              By continuing you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
              You must not use this tool to fabricate experience or credentials.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="loading-screen"><Loader2 className="spin" /></div>}>
      <AuthInner />
    </Suspense>
  )
}
