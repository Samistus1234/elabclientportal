import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Search } from 'lucide-react'
import {
    fetchMyReferrals,
    formatDate,
    formatNaira,
    SERVICE_LABELS,
    STEP_LABELS,
    type ReferralRow,
} from '@/lib/referralApi'

/**
 * Referrals — one row per person introduced, with the real stage their case has
 * reached in the Command Centre. No invented statuses.
 */
export default function ReferralList() {
    const [rows, setRows] = useState<ReferralRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [query, setQuery] = useState('')
    const [filter, setFilter] = useState<'all' | 'active' | 'earned'>('all')

    useEffect(() => {
        let mounted = true
        fetchMyReferrals()
            .then((data) => { if (mounted) setRows(data) })
            .catch((err: Error) => { if (mounted) setError(err.message) })
            .finally(() => { if (mounted) setLoading(false) })
        return () => { mounted = false }
    }, [])

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase()
        return rows.filter((row) => {
            const matchesQuery =
                !needle ||
                row.client_name.toLowerCase().includes(needle) ||
                (row.case_reference ?? '').toLowerCase().includes(needle) ||
                (row.service ?? '').toLowerCase().includes(needle)
            const matchesFilter =
                filter === 'all' ||
                (filter === 'active' && row.case_status === 'active') ||
                (filter === 'earned' && ['earned', 'requested', 'paid'].includes(row.commission_status ?? ''))
            return matchesQuery && matchesFilter
        })
    }, [rows, query, filter])

    if (loading) return <div className="referral-loading">Loading your referrals…</div>
    if (error) {
        return (
            <div className="referral-notice referral-notice-error">
                <AlertCircle size={18} />
                <div><strong>We could not load your referrals.</strong><p>{error}</p></div>
            </div>
        )
    }

    return (
        <div className="referral-page">
            <header className="referral-page-head">
                <p className="referral-kicker">Referral programme</p>
                <h1>People you referred</h1>
                <p className="referral-lede">
                    Each person you introduced, the stage their application has reached, and what it has earned you.
                </p>
            </header>

            {rows.length === 0 ? (
                <div className="referral-empty">
                    <p>No one has applied through your link yet.</p>
                    <Link className="referral-button" to="/referral/invite">Get your link and share it</Link>
                </div>
            ) : (
                <>
                    <div className="referral-toolbar">
                        <label className="referral-search">
                            <Search size={15} />
                            <input
                                type="search"
                                value={query}
                                placeholder="Search by name, reference or service"
                                onChange={(event) => setQuery(event.target.value)}
                            />
                        </label>
                        <div className="referral-filter" role="group" aria-label="Filter referrals">
                            {(['all', 'active', 'earned'] as const).map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    className={filter === value ? 'is-active' : ''}
                                    onClick={() => setFilter(value)}
                                >
                                    {value === 'all' ? 'All' : value === 'active' ? 'In progress' : 'Earned'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="referral-table-wrap">
                        <table className="referral-table">
                            <thead>
                                <tr>
                                    <th>Person</th>
                                    <th>Service</th>
                                    <th>Stage</th>
                                    <th>Referred</th>
                                    <th>Commission</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((row) => (
                                    <tr key={row.case_id}>
                                        <td>
                                            <strong>{row.client_name || 'Name withheld'}</strong>
                                            <span className="referral-sub">{row.case_reference}</span>
                                        </td>
                                        <td>{SERVICE_LABELS[row.service_slug] ?? row.service ?? '—'}</td>
                                        <td>
                                            {row.case_status === 'cancelled' ? (
                                                <span className="referral-stage referral-stage-0">Not proceeding</span>
                                            ) : (
                                                <span className={`referral-stage referral-stage-${row.step}`}>
                                                    {STEP_LABELS[Math.min(Math.max(row.step, 1), 5) - 1]}
                                                </span>
                                            )}
                                            {row.stage_label && <span className="referral-sub">{row.stage_label}</span>}
                                        </td>
                                        <td>{formatDate(row.referred_at)}</td>
                                        <td>
                                            {row.commission_ngn != null
                                                ? formatNaira(row.commission_ngn)
                                                : row.commission_status === 'pending_rate'
                                                    ? 'Rate pending'
                                                    : '—'}
                                            {row.commission_status === 'earned' && <span className="referral-sub">Ready to request</span>}
                                            {row.commission_status === 'requested' && <span className="referral-sub">Payout requested</span>}
                                            {row.commission_status === 'paid' && <span className="referral-sub">Paid</span>}
                                        </td>
                                    </tr>
                                ))}
                                {visible.length === 0 && (
                                    <tr><td colSpan={5} className="referral-none">Nothing matches that search.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    )
}
