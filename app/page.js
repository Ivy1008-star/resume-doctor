'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Stethoscope, FileText, Briefcase, Search, Loader2, ShieldCheck,
  Target, ScanLine, MessageSquareText, ClipboardList, Sparkles,
  Rocket, Gauge, MapPin, ListChecks, ArrowRight,
} from 'lucide-react'
import { TopBar, Footer } from './components/SiteChrome'
import ResumeUploader from './components/ResumeUploader'

export default function Home() {
  const router = useRouter()
  const [resume, setResume] = useState('')
  const [jd, setJd] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function analyze() {
    setError('')
    if (resume.trim().length < 40) {
      setError('Please paste a resume with at least 40 characters.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      router.push(`/auth?next=${encodeURIComponent(`/report/${data.id}`)}&report=${data.id}`)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <>
      <TopBar />
      <main>
        <section className="hero">
          <div className="container-narrow center">
            <span className="eyebrow"><Stethoscope size={14} /> Free AI resume review</span>
            <h1>Get an instant <span className="accent">resume review</span></h1>
            <p className="sub">
              Paste your resume and a job description for a free AI resume review. In
              seconds, get your ATS score, keyword match, and the exact, recruiter-grade
              fixes standing between you and the interview.
            </p>
          </div>
          <div className="container-narrow mt-6" id="analyze">
            <div className="tool-card">
              {error ? <div className="alert alert-error">{error}</div> : null}
              <div className="field">
                <div className="field-head">
                  <label><FileText size={16} /> Your resume</label>
                  <span className="count">{resume.length} chars</span>
                </div>
                <ResumeUploader onText={(t) => setResume(t)} />
                <div className="dz-divider"><span>or paste below</span></div>
                <textarea
                  rows={10}
                  placeholder="Paste your resume as plain text (copy from your PDF, Word, or LinkedIn)..."
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                />
              </div>
              <div className="field">
                <div className="field-head">
                  <label><Briefcase size={16} /> Target job description <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
                  <span className="count">{jd.length} chars</span>
                </div>
                <ResumeUploader onText={(t) => setJd(t)} label="Upload job description file" />
                <div className="dz-divider"><span>or paste below</span></div>
                <textarea
                  rows={6}
                  placeholder="Paste the job description to get JD-specific keyword matching..."
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                />
              </div>
              <button className="btn btn-primary btn-lg btn-block" onClick={analyze} disabled={loading}>
                {loading ? <><Loader2 size={18} className="spin" /> Analyzing...</> : <><Search size={18} /> Analyze My Resume — Free</>}
              </button>
              <div className="trust-row">
                <span><ShieldCheck size={15} /> Free, no credit card</span>
                <span><ShieldCheck size={15} /> Files parsed locally, never uploaded</span>
                <span><ShieldCheck size={15} /> Powered by AI</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <div className="eyebrow-line">What you get</div>
              <h2 className="section-title">A recruiter&apos;s read on your resume</h2>
              <p className="section-lead">Resume Doctor evaluates the same signals an applicant tracking system and a hiring manager use, then tells you precisely what to change.</p>
            </div>
            <div className="features">
              <div className="feature">
                <div className="ic"><Target size={20} /></div>
                <h3>JD keyword match</h3>
                <p>See which required skills you cover, partially cover, or miss entirely — each prioritized by importance to the role.</p>
              </div>
              <div className="feature">
                <div className="ic"><ScanLine size={20} /></div>
                <h3>ATS compatibility</h3>
                <p>Catch the formatting traps — tables, missing links, headers — that quietly make parsers drop your resume.</p>
              </div>
              <div className="feature">
                <div className="ic"><MessageSquareText size={20} /></div>
                <h3>Content quality</h3>
                <p>Quantify weak bullet points, strengthen verbs, and get city- and industry-specific guidance.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section alt">
          <div className="container">
            <div className="section-head">
              <div className="eyebrow-line">How it works</div>
              <h2 className="section-title">From paste to plan in three steps</h2>
            </div>
            <div className="steps">
              <div className="step">
                <div className="step-no">1</div>
                <h3>Paste your materials</h3>
                <p>Drop in your resume text and, optionally, the job description you&apos;re targeting. No upload, no formatting required.</p>
              </div>
              <div className="step">
                <div className="step-no">2</div>
                <h3>Get your diagnosis</h3>
                <p>AI scores your resume across keywords, ATS parsing, and content quality, with a market read on your target city.</p>
              </div>
              <div className="step">
                <div className="step-no">3</div>
                <h3>Fix &amp; rewrite</h3>
                <p>Apply the prioritized fixes yourself, or unlock a full ATS-optimized rewrite with every change explained.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <div className="eyebrow-line">Inside the report</div>
              <h2 className="section-title">Detailed, professional, and specific</h2>
              <p className="section-lead">Every diagnosis is written to feel like a paid consultation, not a generic checklist.</p>
            </div>
            <div className="includes">
              <div className="include">
                <div className="ic"><Gauge size={20} /></div>
                <div><h3>Overall &amp; sub-scores</h3><p>A 0–100 score broken down into keyword match, ATS compatibility, content quality, and formatting.</p></div>
              </div>
              <div className="include">
                <div className="ic"><ListChecks size={20} /></div>
                <div><h3>Keyword heat map</h3><p>Matched, partial, and missing skills pulled straight from the job description you paste.</p></div>
              </div>
              <div className="include">
                <div className="ic"><ClipboardList size={20} /></div>
                <div><h3>Prioritized fixes</h3><p>The handful of changes that matter most, each tagged Critical, Major, or Minor.</p></div>
              </div>
              <div className="include">
                <div className="ic"><MapPin size={20} /></div>
                <div><h3>Market insight</h3><p>City and industry context — salary benchmarks, hiring trends, and localized resume tips.</p></div>
              </div>
              <div className="include">
                <div className="ic"><Sparkles size={20} /></div>
                <div><h3>ATS-optimized rewrite</h3><p>A rebuilt resume with before/after keyword coverage and every edit explained.</p></div>
              </div>
              <div className="include">
                <div className="ic"><Rocket size={20} /></div>
                <div><h3>Interview prediction</h3><p>Five questions HR is likely to ask, resume red flags, and local interview style notes.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section alt">
          <div className="container">
            <div className="why-grid">
              <div className="why"><div className="num">75%</div><div className="lbl">of resumes are filtered by ATS before a human reads them</div></div>
              <div className="why"><div className="num">6s</div><div className="lbl">average time a recruiter spends on a first resume scan</div></div>
              <div className="why"><div className="num">0–100</div><div className="lbl">clear score so you know exactly where you stand</div></div>
              <div className="why"><div className="num">30-day</div><div className="lbl">auto-deletion of your raw resume text for privacy</div></div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <div className="eyebrow-line">Questions</div>
              <h2 className="section-title">Frequently asked</h2>
            </div>
            <div className="faq">
              <details>
                <summary>Is the diagnosis really free?</summary>
                <p>Yes. The full diagnostic report — score, keyword match, ATS checks, content quality, and market insight — is free. You only pay if you choose the AI rewrite ($5) or the premium report with interview prep ($10).</p>
              </details>
              <details>
                <summary>Do you store my resume?</summary>
                <p>Your raw resume and job-description text are used to generate the report and are automatically deleted after 30 days. You can delete your account and all data at any time from your dashboard.</p>
              </details>
              <details>
                <summary>What is an ATS and why does it matter?</summary>
                <p>An Applicant Tracking System is the software most employers use to filter resumes before a person sees them. If your resume isn&apos;t parseable or misses key terms, it can be rejected automatically — which is exactly what we help you catch.</p>
              </details>
              <details>
                <summary>Will the rewrite invent experience for me?</summary>
                <p>Never. The AI optimizes wording, structure, and keyword placement based only on what you provide. It does not fabricate employers, titles, credentials, or metrics.</p>
              </details>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container-narrow">
            <div className="cta-band">
              <h2>See what recruiters see</h2>
              <p>Run a free diagnosis now — no account needed to start.</p>
              <a href="#analyze" className="btn btn-primary btn-lg">Analyze my resume <ArrowRight size={18} /></a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
