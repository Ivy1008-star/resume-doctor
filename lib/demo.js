// Deterministic demo fallback used when no DEEPSEEK_API_KEY is present.
// It derives plausible output from the actual pasted text so the preview
// looks realistic. Replace by real AI automatically once keys are set.

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'our', 'are', 'was', 'were',
  'this', 'that', 'from', 'have', 'has', 'will', 'a', 'an', 'to', 'of', 'in',
  'on', 'at', 'by', 'is', 'as', 'or', 'be', 'we', 'us', 'it', 'they', 'their',
])

function words(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#. ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
}

function topKeywords(text, n) {
  const freq = {}
  for (const w of words(text)) freq[w] = (freq[w] || 0) + 1
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w)
}

function detectCity(text) {
  const cities = ['New York', 'San Francisco', 'Seattle', 'Austin', 'Boston',
    'Chicago', 'London', 'Toronto', 'Berlin', 'Singapore', 'Remote']
  const found = cities.find((c) => new RegExp(c, 'i').test(text || ''))
  return found || 'the target market'
}

function hash(text) {
  let h = 0
  for (let i = 0; i < (text || '').length; i++) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0
  }
  return h
}

export function demoDiagnosis(resume, jd) {
  const resumeKw = topKeywords(resume, 40)
  const jdKw = jd ? topKeywords(jd, 20) : []
  const city = detectCity(jd || resume)
  const hasNumbers = /\d+%|\$\d|\d{2,}/.test(resume || '')
  const hasLinkedin = /linkedin\.com/i.test(resume || '')
  const hasTable = /\t|\|/.test(resume || '')
  const wordCount = (resume || '').split(/\s+/).filter(Boolean).length

  const matched = []
  const partial = []
  const missing = []
  const source = jdKw.length ? jdKw : resumeKw.slice(0, 15)
  source.forEach((kw, i) => {
    const inResume = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(resume || '')
    if (inResume) matched.push({ keyword: kw, priority: i < 5 ? 'high' : 'medium' })
    else if (i % 3 === 0) partial.push({ keyword: kw, note: 'Mentioned but not emphasized' })
    else missing.push({ keyword: kw, priority: i < 6 ? 'high' : 'low' })
  })

  const base = 55 + (hash(resume) % 20)
  const kwScore = Math.min(95, 40 + matched.length * 5)
  const atsScore = (hasTable ? 60 : 82) - (hasLinkedin ? 0 : 8)
  const contentScore = hasNumbers ? 78 : 58
  const fmtScore = hasTable ? 62 : 80
  const overall = Math.round((kwScore + atsScore + contentScore + fmtScore) / 4)

  return {
    overall_score: overall || base,
    sub_scores: {
      keyword_match: kwScore,
      ats_compatibility: atsScore,
      content_quality: contentScore,
      formatting: fmtScore,
    },
    keyword_analysis: { matched, partial, missing },
    ats_checks: [
      { label: 'File / text format', status: hasTable ? 'warn' : 'ok', detail: hasTable ? 'Table or column separators detected; many ATS cannot parse tables reliably.' : 'Plain text parses cleanly for most ATS.' },
      { label: 'LinkedIn / profile link', status: hasLinkedin ? 'ok' : 'fail', detail: hasLinkedin ? 'Profile link found.' : 'No LinkedIn URL found. Recruiters expect one.' },
      { label: 'Standard section headers', status: /experience|education|skills/i.test(resume || '') ? 'ok' : 'warn', detail: 'Use Summary, Experience, Education, Skills, Certifications.' },
      { label: 'Contact info clarity', status: /@/.test(resume || '') ? 'ok' : 'warn', detail: /@/.test(resume || '') ? 'Email detected.' : 'Add a clearly parseable email on its own line.' },
    ],
    content_quality: [
      { label: 'Quantifiable metrics', status: hasNumbers ? 'ok' : 'warn', detail: hasNumbers ? 'Some bullet points include numbers.' : 'Most bullet points lack quantifiable data (%, $, counts).' },
      { label: 'Verb strength', status: /led|built|drove|launched|optimized|implemented/i.test(resume || '') ? 'ok' : 'warn', detail: 'Prefer strong action verbs over "was / did / made".' },
      { label: 'Length', status: wordCount > 900 ? 'warn' : 'ok', detail: `~${wordCount} words. Aim for one page (450-700 words) for <10 years experience.` },
    ],
    improvements: [
      { title: 'Add quantifiable metrics to your top 3 bullet points', severity: hasNumbers ? 'Minor' : 'Critical', detail: 'Recruiters and ATS reward measurable outcomes. Convert duties into results with numbers.' },
      { title: missing.length ? `Add missing keywords: ${missing.slice(0, 3).map((m) => m.keyword).join(', ')}` : 'Reinforce priority keywords', severity: 'Major', detail: 'Weave the JD\'s required terms naturally into your experience and skills.' },
      { title: hasTable ? 'Remove table/column formatting' : 'Keep formatting ATS-safe', severity: hasTable ? 'Major' : 'Minor', detail: 'Single-column plain layout parses most reliably.' },
      { title: hasLinkedin ? 'Polish your profile link placement' : 'Add a LinkedIn URL', severity: hasLinkedin ? 'Minor' : 'Major', detail: 'Put contact links each on their own line near the top.' },
    ],
    market_insight: {
      city,
      industry_overview: `Roles like this in ${city} skew toward fast-moving tech and services employers who screen heavily with ATS before any human review.`,
      salary_benchmark: `Typical comparable roles in ${city} pay roughly $70k-$130k depending on seniority; tailor your headline to the band you target.`,
      policy_and_trends: 'Remote-friendly hiring and skills-based screening continue to rise; explicit skills sections increasingly outperform prose-only resumes.',
      localized_resume_tips: [
        `Mirror the exact job title used by ${city} employers in your summary.`,
        'Front-load the 6-8 skills the JD repeats most.',
        'Keep to one page unless you have 10+ years of experience.',
      ],
    },
    summary: `Your resume scores ${overall || base}/100. The biggest lever is ${hasNumbers ? 'keyword alignment with the JD' : 'adding quantifiable results'}. Fix the top 3 items to move past ATS filters.`,
  }
}

export function demoRewrite(resume, jd, diagnosis) {
  const missing = diagnosis?.keyword_analysis?.missing?.map((m) => m.keyword) || topKeywords(jd, 6)
  const before = diagnosis?.overall_score || 62
  const after = Math.min(94, before + 22)
  const lines = (resume || '').split(/\n+/).filter(Boolean)
  const firstBullet = lines.find((l) => /^[-*•]/.test(l.trim())) || lines[0] || 'Managed team projects and daily operations.'

  const optimized = [
    'JANE CANDIDATE',
    'City, Country | email@example.com | (555) 555-5555 | linkedin.com/in/username',
    '',
    'SUMMARY',
    `Results-driven professional aligned to the target role, with strengths in ${missing.slice(0, 4).join(', ') || 'core competencies'}.`,
    '',
    'EXPERIENCE',
    'Company — Job Title (2021 - Present)',
    '- Led initiatives that improved key metrics by 30%, reducing cost by $120k annually.',
    `- Implemented ${missing[0] || 'process improvements'} across the team, increasing throughput by 25%.`,
    '- Optimized reporting workflow, cutting turnaround from 5 days to 2 days.',
    '',
    'SKILLS',
    (diagnosis?.keyword_analysis?.matched?.map((m) => m.keyword).concat(missing).slice(0, 12).join(', ')) || missing.join(', '),
    '',
    'EDUCATION',
    'Degree, Institution (Year)',
  ].join('\n')

  return {
    optimized_resume: optimized,
    changes: [
      { section: 'Summary', original: '(missing or generic summary)', optimized: `Added a targeted summary featuring ${missing.slice(0, 3).join(', ')}.`, reason: `Add required keywords: ${missing.slice(0, 3).join(', ')}`, impact: 'Raises ATS keyword match ~15%' },
      { section: 'Experience', original: firstBullet.slice(0, 80), optimized: 'Led initiatives that improved key metrics by 30%, reducing cost by $120k annually.', reason: 'Quantify outcomes + strong verb', impact: 'Improves content score ~12%' },
      { section: 'Formatting', original: 'Table / multi-column layout', optimized: 'Single-column plain layout with standard headers', reason: 'Remove table format', impact: 'Prevents ATS parsing failure' },
      { section: 'Contact', original: '(link missing)', optimized: 'Added LinkedIn on its own line', reason: 'Add LinkedIn URL', impact: 'Recruiter expectation met' },
    ],
    ats_score_before: before,
    ats_score_after: after,
    keyword_coverage_before: { matched: diagnosis?.keyword_analysis?.matched?.length || 12, partial: diagnosis?.keyword_analysis?.partial?.length || 5, missing: diagnosis?.keyword_analysis?.missing?.length || 8 },
    keyword_coverage_after: { matched: (diagnosis?.keyword_analysis?.matched?.length || 12) + 6, partial: 3, missing: 2 },
    format_issues_fixed: ['Removed table/column formatting', 'Moved contact info out of header', 'Standardized section headers'],
    quantification_added: 4,
    weak_verbs_replaced: 3,
  }
}

export function demoInterview(resume, jd) {
  const kw = (jd ? topKeywords(jd, 5) : topKeywords(resume, 5))
  const city = detectCity(jd || resume)
  return {
    questions: [
      { question: `You mention experience with ${kw[0] || 'your key skill'} — walk me through a concrete project.`, why_asked: 'Verifies depth behind a headline skill.', assesses: 'Hands-on competence and ownership.', answer_tip: 'Use STAR: Situation, Task, Action, Result with a metric.' },
      { question: 'Describe a time you improved a metric by a specific number.', why_asked: 'Recruiters probe quantified claims.', assesses: 'Impact orientation.', answer_tip: 'Have 2-3 quantified stories ready.' },
      { question: `Why this role, and why ${city}?`, why_asked: 'Checks motivation and fit.', assesses: 'Alignment and retention risk.', answer_tip: 'Tie your goals to the company mission.' },
      { question: 'Tell me about a conflict on a team and how you handled it.', why_asked: 'Behavioral standard.', assesses: 'Collaboration and maturity.', answer_tip: 'Show resolution and lessons learned.' },
      { question: `What is a gap in your background for a role needing ${kw[1] || 'this skill'}?`, why_asked: 'Tests self-awareness.', assesses: 'Growth mindset.', answer_tip: 'Name a real gap plus your plan to close it.' },
    ],
    red_flags: [
      { flag: 'Unquantified achievements', detail: 'Claims without numbers invite skeptical follow-ups.' },
      { flag: 'Employment gap or short tenures', detail: 'Prepare a clear, honest narrative.' },
      { flag: 'Keyword-only skills', detail: 'Be ready to demonstrate any skill you list.' },
    ],
    local_interview_style: `${city} employers often mix behavioral and role-specific rounds; expect at least one metrics-focused conversation.`,
    special_process_notes: /san francisco|seattle|new york/i.test(city) ? 'Tech hubs frequently add a technical/case round before onsite.' : 'Expect a screening call followed by 1-2 focused interviews.',
  }
}
