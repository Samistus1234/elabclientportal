import { Link } from 'react-router-dom'

const LAST_UPDATED = 'February 14, 2026'

export default function TermsOfService() {
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
            <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
            <p className="text-sm text-slate-500 mt-2">Last updated: {LAST_UPDATED}</p>
          </header>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">1. Scope</h2>
            <p>
              These Terms govern use of the ELAB client portal and related services. By accessing or
              using the portal, you agree to these Terms.
            </p>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">2. Accounts and Access</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are responsible for accurate information and account security.</li>
              <li>You must not misuse the platform, bypass controls, or submit unlawful content.</li>
              <li>We may suspend access where required for security, abuse prevention, or compliance.</li>
            </ul>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">3. Services and Deliverables</h2>
            <p>
              ELAB provides credentialing, advisory, documentation, and support workflows as described
              in your service package, invoice, or engagement communication.
            </p>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">4. Payments</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Invoices are due by the due date shown on the invoice.</li>
              <li>Payment processor charges and bank fees may apply.</li>
              <li>Late payments may affect processing timelines and service continuity.</li>
            </ul>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">5. Refunds</h2>
            <p>
              Refund handling is governed by our Refund Policy. See{' '}
              <Link to="/support/refund-policy" className="text-indigo-600 hover:underline">
                Refund Policy
              </Link>
              .
            </p>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">6. Liability</h2>
            <p>
              To the maximum extent permitted by law, ELAB is not liable for indirect, incidental, or
              consequential damages arising from portal use or third-party platform dependencies.
            </p>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">7. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Updates become effective when published in
              the portal unless otherwise stated.
            </p>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">8. Contact</h2>
            <p>
              For terms-related questions, contact{' '}
              <a href="mailto:headoffice@elabsolution.org" className="text-indigo-600 hover:underline">
                headoffice@elabsolution.org
              </a>.
            </p>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">Related Policies</h2>
            <p>
              See also{' '}
              <Link to="/privacy" className="text-indigo-600 hover:underline">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link to="/support/refund-policy" className="text-indigo-600 hover:underline">
                Refund Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
