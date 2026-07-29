import { NextResponse } from 'next/server'
import { clearSession } from '../../../../lib/session'

export const runtime = 'edge'

export async function POST() {
  clearSession()
  return NextResponse.json({ ok: true })
}
