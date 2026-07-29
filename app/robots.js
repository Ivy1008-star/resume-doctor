export const runtime = 'edge'

const BASE = 'https://resume-doctor.co'

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard', '/auth', '/report/'],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  }
}
