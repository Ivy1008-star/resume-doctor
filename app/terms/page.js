import { TopBar, Footer } from '../components/SiteChrome'

export const metadata = { title: 'Terms of Service — Resume Doctor' }

export default function Terms() {
  return (
    <>
      <TopBar />
      <main className="container">
        <div className="section prose">
          <h1>Terms of Service</h1>
          <p>Last updated: {new Date().getFullYear()}. By using Resume Doctor you agree to these terms.</p>

          <h2>The service</h2>
          <p>Resume Doctor provides AI-generated resume analysis, rewriting, and interview preparation for informational purposes only. It does not constitute professional career, legal, or hiring advice.</p>

          <h2>No guarantees</h2>
          <p>We do not guarantee interviews, job offers, or any specific outcome. AI output may contain inaccuracies; review everything before use.</p>

          <h2>Acceptable use</h2>
          <p>You must not use this tool to fabricate work experience, education, credentials, or any false information, or for any unlawful purpose. You are responsible for the accuracy of the content you submit and the resume you ultimately use.</p>

          <h2>Payments &amp; refunds</h2>
          <p>Paid features are charged per use via PayPal. If a paid result fails to generate, contact us for a refund. Payment disputes are handled through PayPal&apos;s resolution process.</p>

          <h2>Complaints</h2>
        <p>To report a problem or request human review of AI content, email <a href="mailto:Aokaibo1008@gmail.com">Aokaibo1008@gmail.com</a>. We respond within 48 hours.</p>

          <h2>Eligibility</h2>
          <p>You must be at least 16 years old to use Resume Doctor.</p>
        </div>
      </main>
      <Footer />
    </>
  )
}
