import './globals.css'

export const metadata = {
  title: 'Free Resume Review — See Why Your Resume Isn\'t Getting Interviews',
  description: 'Get an instant AI resume review. Paste your resume and a job description to see your ATS score, keyword match, and the exact fixes that get you past the filter.',
  keywords: 'resume review, free resume review, AI resume review, resume checker, ATS resume checker, resume analyzer, resume feedback',
  openGraph: {
    title: 'Free Resume Review — Instant AI Feedback on Your Resume',
    description: 'Get a free AI resume review in seconds. Find out why your resume isn\'t getting interviews.',
    type: 'website',
  },
  robots: 'index, follow',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
