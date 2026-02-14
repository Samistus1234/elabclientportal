import { Link } from 'react-router-dom'

const LAST_UPDATED = 'February 14, 2026'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6">
          <Link to="/" className="text-sm text-indigo-600 hover:underline">
            Return to Home
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
          <header>
            <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
            <p className="text-sm text-slate-500 mt-2">Last updated: {LAST_UPDATED}</p>
          </header>

          <section className="space-y-3 text-slate-700">
            <p>
              ELAB Solutions International LLC ("ELAB", "we", "our", "us") respects your privacy.
              This policy explains what information we collect in the client portal, how we use it,
              and your rights.
            </p>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Identity and contact details you provide (name, email, phone).</li>
              <li>Case and service information submitted in forms and document uploads.</li>
              <li>Payment and invoice metadata (amount, status, references, timestamps).</li>
              <li>Technical data (IP address, browser/device data, logs, and security events).</li>
            </ul>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">How We Use Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To deliver our services, process requests, and support your account.</li>
              <li>To process payments, issue invoices/receipts, and maintain records.</li>
              <li>To communicate updates, support responses, and compliance notices.</li>
              <li>To protect the platform against fraud, abuse, and unauthorized activity.</li>
              <li>To comply with legal, tax, audit, and regulatory obligations.</li>
            </ul>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">Sharing of Information</h2>
            <p>
              We may share information with vetted service providers (for example payment processors,
              cloud hosting, document delivery, and communication tools) only as needed to run the
              portal and fulfill legal obligations. We do not sell personal data.
            </p>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">Retention and Security</h2>
            <p>
              We retain records for as long as reasonably required for service delivery, dispute
              management, legal compliance, and financial reporting. We use administrative, technical,
              and organizational safeguards appropriate to the sensitivity of the data.
            </p>
          </section>

          <section id="cookies" className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">Cookies</h2>
            <p>
              We use cookies and similar technologies for session security, portal functionality,
              analytics, and user experience improvements. You can control cookies through your browser
              settings, but some portal features may not function correctly if essential cookies are
              disabled.
            </p>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">Your Rights</h2>
            <p>
              You may request access, correction, or deletion of personal data where applicable by law.
              You may also request details about how your data is processed.
            </p>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
            <p>
              For privacy questions, contact us at{' '}
              <a href="mailto:headoffice@elabsolution.org" className="text-indigo-600 hover:underline">
                headoffice@elabsolution.org
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
