import { TopBar, Footer } from '../components/SiteChrome'

export const metadata = { title: 'Privacy Policy — Resume Doctor' }

export default function Privacy() {
  return (
    <>
      <TopBar />
      <main className="container">
        <div className="section prose">
          <h1>Privacy Policy</h1>
          <p>Last updated: {new Date().getFullYear()}. This policy explains what Resume Doctor collects and how we use it.</p>

          <h2>What we collect</h2>
          <p>When you run a diagnosis we process the resume text and optional job description you paste. When you sign in with Google we receive your name, email, and profile picture.</p>

          <h2>How we use it</h2>
          <p>Your resume and job description are sent to our AI provider (DeepSeek) solely to generate your diagnosis and, if you pay, your rewrite and interview prediction. By pasting content and clicking Analyze, you consent to this processing.</p>

          <h2>Retention</h2>
          <p>Raw resume and job-description text is automatically deleted 30 days after analysis. Your report scores and summaries remain in your account until you delete them.</p>

          <h2>Your rights (GDPR / CCPA)</h2>
          <p>You can delete your account and all associated data at any time from your dashboard. We do not sell your personal data to third parties. EU and California residents may request access, deletion, or opt-out by contacting us.</p>

          <h2>Payments</h2>
          <p>Payments are processed by PayPal. We never receive or store your card or bank details.</p>

          <h2>Children</h2>
          <p>Resume Doctor is not intended for and may not be used by anyone under 16.</p>

          <h2>Contact</h2>
        <p>Questions or complaints: <a href="mailto:Aokaibo1008@gmail.com">Aokaibo1008@gmail.com</a>. We respond to complaints within 48 hours.</p>
        </div>
      </main>
      <Footer />
    </>
  )
}
