// Verify a Google Identity Services ID token (JWT) against Google's JWKS.
// In demo mode (no client id configured) we accept a locally-minted demo token.

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
// Optional outbound proxy for reaching Google (some networks can't connect
// to googleapis.com directly). Set GOOGLE_PROXY or HTTPS_PROXY to e.g.
// http://127.0.0.1:12000
const PROXY_URL = process.env.GOOGLE_PROXY || process.env.HTTPS_PROXY || process.env.https_proxy || ''
let proxyDispatcher = null

async function fetchGoogle(url) {
  if (PROXY_URL) {
    if (!proxyDispatcher) {
      // Specifier read from globalThis (always undefined -> 'undici') so neither
      // webpack nor next-on-pages' esbuild statically resolves/bundles undici.
      // This branch only runs when a proxy is configured (local dev), never on
      // Cloudflare where PROXY_URL is blank.
      const undiciSpec = globalThis.__RD_UNDICI__ || 'undici'
      const { ProxyAgent } = await import(/* webpackIgnore: true */ undiciSpec)
      proxyDispatcher = new ProxyAgent(PROXY_URL)
    }
    return fetch(url, { dispatcher: proxyDispatcher })
  }
  return fetch(url)
}

export function googleConfigured() {
  return Boolean(GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('your_'))
}

let jwksCache = { keys: null, exp: 0 }

async function getKeys() {
  if (jwksCache.keys && Date.now() < jwksCache.exp) return jwksCache.keys
  const res = await fetchGoogle('https://www.googleapis.com/oauth2/v3/certs')
  const data = await res.json()
  jwksCache = { keys: data.keys, exp: Date.now() + 60 * 60 * 1000 }
  return data.keys
}

function b64urlToBuf(s) {
  return Buffer.from(s, 'base64url')
}

async function verifyJwt(token) {
  const crypto = await import('node:crypto')
  const [h, p, s] = token.split('.')
  if (!h || !p || !s) throw new Error('Malformed token')
  const header = JSON.parse(b64urlToBuf(h).toString('utf8'))
  const keys = await getKeys()
  const jwk = keys.find((k) => k.kid === header.kid)
  if (!jwk) throw new Error('Signing key not found')
  const pubKey = crypto.createPublicKey({ key: jwk, format: 'jwk' })
  const verifier = crypto.createVerify('RSA-SHA256')
  verifier.update(`${h}.${p}`)
  const ok = verifier.verify(pubKey, b64urlToBuf(s))
  if (!ok) throw new Error('Invalid signature')
  const payload = JSON.parse(b64urlToBuf(p).toString('utf8'))
  if (payload.aud !== GOOGLE_CLIENT_ID) throw new Error('Audience mismatch')
  if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') throw new Error('Issuer mismatch')
  if (payload.exp * 1000 < Date.now()) throw new Error('Token expired')
  return payload
}

export async function verifyGoogleCredential(token) {
  if (!googleConfigured()) {
    // Demo mode: token is a base64url JSON blob minted client-side.
    try {
      const data = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))
      return { sub: data.sub || `demo-${data.email}`, email: data.email, name: data.name, picture: data.picture || null, demo: true }
    } catch {
      throw new Error('Invalid demo credential')
    }
  }
  const payload = await verifyJwt(token)
  return { sub: payload.sub, email: payload.email, name: payload.name, picture: payload.picture, demo: false }
}
