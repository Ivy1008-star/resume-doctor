'use client'

import { useState } from 'react'
import { Copy, Check, TrendingUp } from 'lucide-react'

export function RewriteView({ rewrite }) {
  const [copied, setCopied] = useState(false)
  if (!rewrite) return null
  const before = rewrite.keyword_coverage_before || {}
  const after = rewrite.keyword_coverage_after || {}

  function copy() {
    navigator.clipboard?.writeText(rewrite.optimized_resume || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <div className="card">
        <h2><TrendingUp size={18} /> ATS Optimization Result</h2>
        <div className="metric-row">
          <div className="metric">
            <div className="k">ATS score</div>
            <div className="v">{rewrite.ats_score_before} <span className="up">→ {rewrite.ats_score_after}</span></div>
          </div>
          <div className="metric">
            <div className="k">Keywords matched</div>
            <div className="v">{before.matched ?? 0} <span className="up">→ {after.matched ?? 0}</span></div>
          </div>
          <div className="metric">
            <div className="k">Metrics added</div>
            <div className="v">{rewrite.quantification_added ?? 0}</div>
          </div>
          <div className="metric">
            <div className="k">Weak verbs replaced</div>
            <div className="v">{rewrite.weak_verbs_replaced ?? 0}</div>
          </div>
        </div>
        {rewrite.format_issues_fixed?.length ? (
          <div className="chip-row">
            {rewrite.format_issues_fixed.map((f, i) => <span key={i} className="chip ok">{f}</span>)}
          </div>
        ) : null}
      </div>

      <div className="card">
        <h2>Optimized Resume</h2>
        <div className="diff-col after">
          <div className="head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>ATS-optimized version</span>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={copy}>
              {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
          </div>
          <pre>{rewrite.optimized_resume}</pre>
        </div>
      </div>

      <div className="card">
        <h2>What changed &amp; why</h2>
        {rewrite.changes?.map((c, i) => (
          <div className="change-item" key={i}>
            <div className="meta">
              <span className="sec">{c.section}</span>
              {c.impact ? <span className="impact">{c.impact}</span> : null}
            </div>
            <div className="reason"><b>Reason:</b> {c.reason}</div>
            {c.optimized ? (
              <div className="diff-grid mt-2">
                <div className="diff-col before"><div className="head">Before</div><pre>{c.original || '(none)'}</pre></div>
                <div className="diff-col after"><div className="head">After</div><pre>{c.optimized}</pre></div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </>
  )
}

export function PremiumView({ premium }) {
  if (!premium) return null
  return (
    <>
      <div className="card">
        <h2>Predicted Interview Questions</h2>
        {premium.questions?.map((q, i) => (
          <div className="improve" key={i} style={{ display: 'block' }}>
            <div className="lbl" style={{ fontWeight: 600 }}>{i + 1}. {q.question}</div>
            <div className="detail" style={{ color: 'var(--ink-2)', fontSize: 13, marginTop: 4 }}>
              <div><b>Why asked:</b> {q.why_asked}</div>
              <div><b>Assesses:</b> {q.assesses}</div>
              <div><b>Tip:</b> {q.answer_tip}</div>
            </div>
          </div>
        ))}
      </div>
      {premium.red_flags?.length ? (
        <div className="card">
          <h2>Resume Red Flags</h2>
          {premium.red_flags.map((r, i) => (
            <div className="check-item" key={i}>
              <span className="status warn">⚑</span>
              <div className="body"><div className="lbl">{r.flag}</div><div className="detail">{r.detail}</div></div>
            </div>
          ))}
        </div>
      ) : null}
      {(premium.local_interview_style || premium.special_process_notes) ? (
        <div className="card">
          <h2>Local Interview Style</h2>
          {premium.local_interview_style ? <p>{premium.local_interview_style}</p> : null}
          {premium.special_process_notes ? <p style={{ color: 'var(--ink-2)' }}>{premium.special_process_notes}</p> : null}
        </div>
      ) : null}
    </>
  )
}
