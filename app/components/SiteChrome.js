'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Stethoscope, LogOut } from 'lucide-react'

export function TopBar() {
  const [user, setUser] = useState(null)
  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {})
  }, [])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link href="/" className="brand">
          <span className="brand-mark"><Stethoscope size={19} /></span>
          Resume Doctor
        </Link>
        <nav className="nav-links">
          <Link href="/" className="hide-sm">Analyze</Link>
          {user ? (
            <>
              <Link href="/dashboard">My Reports</Link>
              <span className="usermenu">
                {user.picture ? <img src={user.picture} alt="" className="avatar" /> : null}
                <button className="btn btn-ghost" onClick={logout} title="Log out">
                  <LogOut size={16} /> Log out
                </button>
              </span>
            </>
          ) : (
            <Link href="/auth" className="btn btn-ghost">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <div>© {new Date().getFullYear()} Resume Doctor</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <a href="mailto:Aokaibo1008@gmail.com">Contact / Complaints</a>
          </div>
        </div>
        <p className="disclaimer">
          Disclaimer: Resume Doctor provides AI-generated analysis for informational purposes only.
          It does not constitute professional career, legal, or hiring advice, and does not guarantee
          interviews or job offers. All AI output is based solely on the text you provide; do not use
          this tool to fabricate experience or credentials. Not intended for users under 16.
        </p>
      </div>
    </footer>
  )
}
