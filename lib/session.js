// Signed-cookie sessions (HMAC). No external dependency.
import crypto from 'crypto'
import { cookies } from 'next/headers'

const SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me'
const COOKIE = 'rd_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const mac = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  return `${body}.${mac}`
}

function verify(token) {
  if (!token || !token.includes('.')) return null
  const [body, mac] = token.split('.')
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (data.exp && Date.now() > data.exp) return null
    return data
  } catch {
    return null
  }
}

export function createSessionCookie(user) {
  const token = sign({ id: user.id, email: user.email, name: user.name, picture: user.picture, exp: Date.now() + MAX_AGE * 1000 })
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export function getSession() {
  const token = cookies().get(COOKIE)?.value
  return verify(token)
}

export function clearSession() {
  cookies().delete(COOKIE)
}
