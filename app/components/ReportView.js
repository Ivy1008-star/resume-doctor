'use client'

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

function StatusIcon({ status }) {
  if (status === 'ok') return <CheckCircle2 size={18} className="status ok" />
  if (status === 'fail') return <XCircle size={18} className="status fail" />
  return <AlertTriangle size={18} className="status warn" />
}

function SubScore({ label, value }) {
  return (
    <div className="subscore">
      <div className="bar-head"><span>{label}</span><span>{value ?? 0}</span></div>
      <div className="track"><div className="fill" style={{ width: `${value ?? 0}%` }} /></div>
    </div>
  )
}

export default function ReportView({ a }) {
  if (!a) return null
  const kw = a.keyword_analysis || { matched: [], partial: [], missing: [] }
  const sub = a.sub_scores || {}
  const mi = a.market_insight || {}

  return (
    <>
      <div className="report-head">
        <div className="score-ring" style={{ '--val': a.overall_score || 0 }}>
          <div className="inner">
            <div>
              <div className="num">{a.overall_score ?? '—'}</div>
              <div className="lbl">/ 100</div>
            </div>
          </div>
        </div>
        <div className="subscore-grid">
          <SubScore label="Keyword match" value={sub.keyword_match} />
          <SubScore label="ATS compatibility" value={sub.ats_compatibility} />
          <SubScore label="Content quality" value={sub.content_quality} />
          <SubScore label="Formatting" value={sub.formatting} />
        </div>
      </div>

      {a.summary ? <div className="card"><p style={{ margin: 0 }}>{a.summary}</p></div> : null}

      <div className="card">
        <h2>JD Keyword Match</h2>
        <div className="kw-legend">
          <span><b style={{ color: 'var(--green)' }}>{kw.matched?.length || 0}</b> matched</span>
          <span><b style={{ color: 'var(--amber)' }}>{kw.partial?.length || 0}</b> partial</span>
          <span><b style={{ color: 'var(--red)' }}>{kw.missing?.length || 0}</b> missing</span>
        </div>
        <div className="chip-row">
          {kw.matched?.map((k, i) => <span key={`m${i}`} className="chip ok">{k.keyword}</span>)}
          {kw.partial?.map((k, i) => <span key={`p${i}`} className="chip warn">{k.keyword}</span>)}
          {kw.missing?.map((k, i) => <span key={`x${i}`} className="chip fail">{k.keyword}</span>)}
        </div>
      </div>

      <div className="card">
        <h2>ATS Compatibility</h2>
        {a.ats_checks?.map((c, i) => (
          <div className="check-item" key={i}>
            <StatusIcon status={c.status} />
            <div className="body"><div className="lbl">{c.label}</div><div className="detail">{c.detail}</div></div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Content Quality</h2>
        {a.content_quality?.map((c, i) => (
          <div className="check-item" key={i}>
            <StatusIcon status={c.status} />
            <div className="body"><div className="lbl">{c.label}</div><div className="detail">{c.detail}</div></div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Top Improvements</h2>
        {a.improvements?.map((im, i) => (
          <div className="improve" key={i}>
            <span className={`sev ${im.severity}`}>{im.severity}</span>
            <div><div className="lbl" style={{ fontWeight: 600 }}>{im.title}</div><div className="detail" style={{ color: 'var(--ink-2)', fontSize: 13 }}>{im.detail}</div></div>
          </div>
        ))}
      </div>

      {(mi.industry_overview || mi.salary_benchmark) ? (
        <div className="card">
          <h2>Market Insight{mi.city ? ` — ${mi.city}` : ''}</h2>
          <div className="insight-grid">
            {mi.industry_overview ? <div className="insight-box"><h4>Industry overview</h4><p>{mi.industry_overview}</p></div> : null}
            {mi.salary_benchmark ? <div className="insight-box"><h4>Salary benchmark</h4><p>{mi.salary_benchmark}</p></div> : null}
            {mi.policy_and_trends ? <div className="insight-box"><h4>Policy &amp; trends</h4><p>{mi.policy_and_trends}</p></div> : null}
            {mi.localized_resume_tips?.length ? (
              <div className="insight-box"><h4>Localized tips</h4><p>{mi.localized_resume_tips.join(' • ')}</p></div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
