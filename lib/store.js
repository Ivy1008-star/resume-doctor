// Store facade: auto-detects Cloudflare (D1) vs local (sql.js) and delegates.
// Routes import from this file unchanged.
// NOTE: local-store.js pulls in fs + sql.js (Node-only). It is loaded lazily
// so it never enters the Cloudflare Edge bundle.
let cf = null
let local = null
let loaded = false

async function getLocal() {
  if (!local) local = await import(/* webpackIgnore: true */ "./local-store.js")
  return local
}

async function pick() {
  if (loaded) return cf || (await getLocal())
  loaded = true
  try {
    const { getRequestContext } = await import("@cloudflare/next-on-pages")
    const ctx = getRequestContext()
    if (ctx?.env?.resume_doctor_db) {
      const { setDB, ...d1 } = await import("./d1-store.js")
      setDB(ctx.env.resume_doctor_db)
      cf = d1
      return cf
    }
    return await getLocal()
  } catch {
    return await getLocal()
  }
}

function wrap(name) {
  return async (...args) => { const m = await pick(); return m[name](...args) }
}

export const upsertUser = wrap("upsertUser")
export const createEmailUser = wrap("createEmailUser")
export const verifyEmailUser = wrap("verifyEmailUser")
export const createReport = wrap("createReport")
export const getReport = wrap("getReport")
export const attachUser = wrap("attachUser")
export const updateReport = wrap("updateReport")
export const listReportsByUser = wrap("listReportsByUser")
export const deleteUserData = wrap("deleteUserData")
export const recordPayment = wrap("recordPayment")
export const checkAndConsumeQuota = wrap("checkAndConsumeQuota")
export const upsertSubscription = wrap("upsertSubscription")
export const getSubscription = wrap("getSubscription")
export const isProUser = wrap("isProUser")
export const setSubscriptionStatus = wrap("setSubscriptionStatus")