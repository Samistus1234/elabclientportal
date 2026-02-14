import { Link } from 'react-router-dom'

const LAST_UPDATED = 'February 14, 2026'

export default function RefundPolicy() {
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
            <h1 className="text-3xl font-bold text-slate-900">Refund Policy</h1>
            <p className="text-sm text-slate-500 mt-2">Last updated: {LAST_UPDATED}</p>
          </header>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">General Rule</h2>
            <p>
              Refunds are assessed case-by-case based on service stage, work already completed,
              third-party processing costs, payment processor fees, and applicable taxes.
            </p>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">Non-Refundable Charges</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Payment gateway and transfer charges (for example card processing fees).</li>
              <li>Government, licensing, courier, exam, and other third-party pass-through fees.</li>
              <li>Taxes and statutory deductions already remitted where not legally reversible.</li>
            </ul>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">Eligibility</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Requests must be submitted in writing with invoice and payment details.</li>
              <li>No refund is issued for completed milestones or delivered services.</li>
              <li>If cancellation happens before material processing starts, partial refund may apply.</li>
            </ul>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">How Refund Amount Is Calculated</h2>
            <p>
              Net refund = Amount paid minus completed service value, non-refundable third-party costs,
              transfer/processor charges, and applicable tax adjustments.
            </p>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">Timeline</h2>
            <p>
              Refund reviews are typically completed within 5-10 business days after receiving complete
              documentation. Approved refunds are returned to the original payment channel where possible.
            </p>
          </section>

          <section className="space-y-2 text-slate-700">
            <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
            <p>
              Submit refund requests to{' '}
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
