'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Plus, Trash2, Crown, XCircle } from 'lucide-react'
import { TopBar, Footer } from '../components/SiteChrome'

export default function Dashboard() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((d) => {
      if (!d.user) { router.push('/auth?next=/dashboard'); return }
      setData(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [router])

  async function deleteAll() {
    if (!confirm('Delete your account and ALL reports permanently? This cannot be undone.')) return
    await fetch('/api/me', { method: 'DELETE' })
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  async function cancelSub() {
    if (!confirm('Cancel your Pro subscription? You keep access until the end of the current period.')) return
    const res = await fetch('/api/subscription', { method: 'DELETE' })
    if (res.ok) {
      const d = await fetch('/api/me').then((r) => r.json())
      setData(d)
    }
  }

  if (loading) return <div className="loading-screen"><Loader2 className="spin" size={28} /></div>

  const reports = data?.reports || []
  const sub = data?.subscription
  const isPro = Boolean(data?.isPro)
  return (
    <>
      <TopBar />
      <main className="container">
        <div className="section">
          <div className="dash-head">
            <div>
              <h1 className="section-title">My Reports</h1>
              <p className="section-lead" style={{ margin: 0 }}>Signed in as {data?.user?.email}</p>
            </div>
            <Link href="/" className="btn btn-primary"><Plus size={16} /> New diagnosis</Link>
          </div>

          <div className="card mt-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Crown size={20} style={{ color: isPro ? 'var(--gold, #b7892b)' : 'var(--muted, #888)' }} />
              <div>
                <div style={{ fontWeight: 600 }}>{isPro ? 'Pro subscriber' : 'Free plan'}</div>
                <div className="rdate">
                  {isPro
                    ? `Status: ${sub?.status || 'ACTIVE'} - unlimited rewrites + higher daily limit`
                    : 'Subscribe from any report to unlock unlimited rewrites.'}
                </div>
              </div>
            </div>
            {isPro && sub?.status !== 'CANCELLED' ? (
              <button className="btn btn-ghost" onClick={cancelSub}><XCircle size={16} /> Cancel subscription</button>
            ) : null}
          </div>

          {reports.length === 0 ? (
            <div className="empty">
              No reports yet.
              <div className="mt-4"><Link href="/" className="btn btn-primary">Analyze your resume</Link></div>
            </div>
          ) : (
            <div className="report-list">
              {reports.map((r) => (
                <Link href={`/report/${r.id}`} key={r.id} className="report-row" style={{ color: 'inherit' }}>
                  <div className="rscore">{r.score ?? '—'}</div>
                  <div className="rbody">
                    <div className="rsum">{r.summary || 'Diagnosis report'}</div>
                    <div className="rdate">{new Date(r.created_at).toLocaleString()}{r.city ? ` · ${r.city}` : ''}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-6">
            <button className="btn btn-ghost" onClick={deleteAll} style={{ color: 'var(--red)' }}>
              <Trash2 size={16} /> Delete my account &amp; all data
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
