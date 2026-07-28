import {
  DIAGNOSIS_SYSTEM,
  diagnosisUserPrompt,
  REWRITE_SYSTEM,
  rewriteUserPrompt,
  INTERVIEW_SYSTEM,
  interviewUserPrompt,
} from './prompts'
import { demoDiagnosis, demoRewrite, demoInterview } from './demo'

const API_KEY = process.env.DEEPSEEK_API_KEY
const BASE = process.env.DEEPSEEK_BASE || 'https://api.deepseek.com'
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'

export function hasRealAi() {
  return Boolean(API_KEY && !API_KEY.startsWith('your_'))
}

function extractJson(text) {
  if (!text) throw new Error('Empty AI response')
  // Strip code fences if the model wrapped output.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON found in AI response')
  return JSON.parse(candidate.slice(start, end + 1))
}

async function chatJson(system, user) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`DeepSeek API error ${res.status}: ${detail.slice(0, 300)}`)
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  return extractJson(content)
}

export async function runDiagnosis(resume, jd) {
  if (!hasRealAi()) return { data: demoDiagnosis(resume, jd), demo: true }
  const data = await chatJson(DIAGNOSIS_SYSTEM, diagnosisUserPrompt(resume, jd))
  return { data, demo: false }
}

export async function runRewrite(resume, jd, diagnosis) {
  if (!hasRealAi()) return { data: demoRewrite(resume, jd, diagnosis), demo: true }
  const data = await chatJson(REWRITE_SYSTEM, rewriteUserPrompt(resume, jd, diagnosis))
  return { data, demo: false }
}

export async function runInterview(resume, jd) {
  if (!hasRealAi()) return { data: demoInterview(resume, jd), demo: true }
  const data = await chatJson(INTERVIEW_SYSTEM, interviewUserPrompt(resume, jd))
  return { data, demo: false }
}
