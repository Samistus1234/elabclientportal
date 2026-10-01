import { useEffect, useState } from 'react'
import { AlertCircle, Check, Wallet } from 'lucide-react'
import {
    fetchMyPayouts,
    fetchReferrerProfile,
    formatDate,
    formatNaira,
    requestPayout,
    savePayoutDetails,
    type PayoutRow,
    type ReferrerProfile,
} from '@/lib/referralApi'

/**
 * Earnings — what has been earned, one unfinished payout request at a time, and
 * the bank details we pay into. Merges the old "Earnings" and "Payouts" pages:
 * they were the same screen with different headings.
 */
export default function ReferralEarnings() {
    const [profile, setProfile] = useState<ReferrerProfile | null>(null)
    const [payouts, setPayouts] = useState<PayoutRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [notice, setNotice] = useState<string | null>(null)

    const [bankName, setBankName] = useState('')
    const [accountName, setAccountName] = useState('')
    const [accountNumber, setAccountNumber] = useState('')

    const load = async () => {
        const [profileData, payoutRows] = await Promise.all([fetchReferrerProfile(), fetchMyPayouts()])
        setProfile(profileData)
        setPayouts(payoutRows)
        setBankName(profileData?.bank_name ?? '')
        setAccountName(profileData?.account_name ?? '')
        setAccountNumber(profileData?.account_number ?? '')
    }

    useEffect(() => {
        let mounted = true
        load()
            .catch((err: Error) => { if (mounted) setError(err.message) })
            .finally(() => { if (mounted) setLoading(false) })
        return () => { mounted = false }
    }, [])

    if (loading) return <div className="referral-loading">Loading your earnings…</div>
    if (error) {
        return (
            <div className="referral-notice referral-notice-error">
                <AlertCircle size={18} />
                <div><strong>We could not load your earnings.</strong><p>{error}</p></div>
            </div>
        )
    }
    if (!profile) {
        return <div className="referral-notice"><AlertCircle size={18} /><div><strong>This account is not set up for referrals.</strong></div></div>
    }

    const stats = profile.stats
    const detailsMissing = !profile.bank_name || !profile.account_number || !profile.account_name

    const saveDetails = async () => {
        setBusy(true); setNotice(null)
        try {
            await savePayoutDetails({ bank_name: bankName, account_name: accountName, account_number: accountNumber })
            await load()
            setNotice('Your bank details are saved.')
        } catch (err) {
            setNotice(err instanceof Error ? err.message : 'Could not save your bank details.')
        } finally { setBusy(false) }
    }

    const askForPayout = async () => {
        setBusy(true); setNotice(null)
        try {
            const result = await requestPayout()
            await load()
            setNotice(`Payout of ${formatNaira(result.amount_ngn)} requested — we will pay it to your bank account.`)
        } catch (err) {
            setNotice(err instanceof Error ? err.message : 'Could not submit your payout request.')
        } finally { setBusy(false) }
    }

    return (
        <div className="referral-page">
            <header className="referral-page-head">
                <p className="referral-kicker">Referral programme</p>
                <h1>Earnings</h1>
                <p className="referral-lede">
                    Commission is earned when someone you referred pays for their service. Ask for what you have earned
                    whenever you like — there is no minimum and no schedule to wait for.
                </p>
            </header>

            <section className="referral-figures" aria-label="Earnings summary">
                <div><span>Earned to date</span><strong>{formatNaira(stats.earned_ngn)}</strong></div>
                <div className={stats.available_ngn > 0 ? 'is-accent' : ''}><span>Available to request</span><strong>{formatNaira(stats.available_ngn)}</strong></div>
                <div><span>Requested, not yet paid</span><strong>{formatNaira(stats.requested_ngn)}</strong></div>
                <div><span>Paid to you</span><strong>{formatNaira(stats.paid_ngn)}</strong></div>
            </section>

            <section className="referral-panel referral-payout-panel">
                <h2>Request a payout</h2>
                {stats.open_payout ? (
                    <p className="referral-fineprint">
                        You already have a payout request in progress. We will email you as soon as it is paid.
                    </p>
                ) : stats.available_ngn > 0 ? (
                    <>
                        <p className="referral-fineprint">
                            Available now: <strong>{formatNaira(stats.available_ngn)}</strong>
                            {detailsMissing ? ' — add your bank details below first.' : ''}
                        </p>
                        <button type="button" className="referral-button" onClick={askForPayout} disabled={busy || detailsMissing}>
                            <Wallet size={15} /> Request {formatNaira(stats.available_ngn)}
                        </button>
                    </>
                ) : (
                    <p className="referral-fineprint">Nothing to request yet. Earnings appear here the moment a referred client pays.</p>
                )}
            </section>

            <section className="referral-panel">
                <h2>Bank details</h2>
                <p className="referral-fineprint">The account we pay your commission into. We keep these on file; you only need to set them once.</p>
                <div className="referral-form-grid">
                    <label><span>Bank</span>
                        <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Access Bank" />
                    </label>
                    <label><span>Account name</span>
                        <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="As it appears on your account" />
                    </label>
                    <label><span>Account number</span>
                        <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} inputMode="numeric" placeholder="0123456789" />
                    </label>
                    <div className="referral-form-action">
                        <button type="button" className="referral-button" onClick={saveDetails} disabled={busy}>
                            {busy ? 'Saving…' : <><Check size={15} /> Save bank details</>}
                        </button>
                    </div>
                </div>
            </section>

            {notice && <p className="referral-notice-line" role="status">{notice}</p>}

            <section className="referral-panel">
                <h2>Payout history</h2>
                {payouts.length === 0 ? (
                    <p className="referral-fineprint">No payouts yet.</p>
                ) : (
                    <div className="referral-table-wrap">
                        <table className="referral-table">
                            <thead>
                                <tr><th>Requested</th><th>Amount</th><th>Status</th><th>Paid</th><th>Reference</th></tr>
                            </thead>
                            <tbody>
                                {payouts.map((payout) => (
                                    <tr key={payout.id}>
                                        <td>{formatDate(payout.requested_at)}</td>
                                        <td>{formatNaira(payout.amount_ngn)}</td>
                                        <td>{payout.status === 'requested' ? 'In progress' : payout.status === 'paid' ? 'Paid' : 'Rejected'}</td>
                                        <td>{formatDate(payout.paid_at)}</td>
                                        <td>{payout.payment_reference ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}
