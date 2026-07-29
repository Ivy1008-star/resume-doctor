import './globals.css'

export const metadata = {
  metadataBase: new URL('https://resume-doctor.co'),
  title: {
    default: 'Free Resume Diagnosis & Review — AI ATS Checker | Resume Doctor',
    template: '%s | Resume Doctor',
  },
  description: 'Free AI resume diagnosis and review. Resume Doctor checks your resume like a recruiter and an ATS, then gives your ATS score, keyword match, and the exact fixes that get you past the filter and into interviews.',
  keywords: 'resume review, resume diagnosis, resume doctor, AI resume review, resume checker, ATS resume checker, resume analyzer, resume feedback, resume evaluation, resume review expert',
  alternates: {
    canonical: 'https://resume-doctor.co',
  },
  verification: {
    google: 'Ku3_il2U9jOvbBXHLO8z3SpPJEEQikmxvqREcm6kUhQ',
  },
  openGraph: {
    title: 'Free Resume Diagnosis & Review — Resume Doctor',
    description: 'Free AI resume diagnosis. Get your ATS score, keyword match, and prioritized fixes that get you interviews.',
    url: 'https://resume-doctor.co',
    siteName: 'Resume Doctor',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Resume Diagnosis & Review — Resume Doctor',
    description: 'Free AI resume diagnosis. Instant ATS score, keyword match, and recruiter-grade fixes.',
  },
  robots: 'index, follow',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Resume Doctor',
    url: 'https://resume-doctor.co',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'AI resume review and diagnosis tool. Get your ATS score, keyword match, and recruiter-grade fixes that get your resume past the filter.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free AI resume diagnosis; paid ATS-optimized rewrite and premium report available.',
    },
  }
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  )
}
