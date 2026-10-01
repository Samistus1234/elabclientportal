import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, MessageCircle, AlertCircle, Clock } from 'lucide-react'
import {
    fetchReferrerProfile,
    formatNaira,
    formatDate,
    type ReferrerProfile,
} from '@/lib/referralApi'

/**
 * Overview — the one screen a referrer needs: their link, what it has produced
 * so far, what eLab owes them, and what happens next.
 */
export default function ReferralOverview() {
    const [profile, setProfile] = useState<ReferrerProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        let mounted = true
        fetchReferrerProfile()
            .then((data) => { if (mounted) setProfile(data) })
            .catch((err: Error) => { if (mounted) setError(err.message) })
            .finally(() => { if (mounted) setLoading(false) })
        return () => { mounted = false }
    }, [])

    if (loading) {
        return <div className="referral-loading">Loading your referral dashboard…</div>
    }
    if (error) {
        return (
            <div className="referral-notice referral-notice-error">
                <AlertCircle size={18} />
                <div><strong>We could not load your dashboard.</strong><p>{error}</p></div>
            </div>
        )
    }
    if (!profile) {
        return (
            <div className="referral-notice">
                <AlertCircle size={18} />
                <div>
                    <strong>This account is not set up for referrals.</strong>
                    <p>If you would like to introduce people to eLab, <Link to="/referral/join">apply to join the programme</Link>.</p>
                </div>
            </div>
        )
    }
    if (profile.status === 'pending') {
        return (
            <div className="referral-notice referral-notice-wait">
                <Clock size={18} />
                <div>
                    <strong>Your application is with our team.</strong>
                    <p>
                        We are reviewing it and will email your personal referral link as soon as it is approved.
                        Nothing more is needed from you — we will be in touch on {profile.email}.
                    </p>
                </div>
            </div>
        )
    }
    if (profile.status === 'rejected' || profile.status === 'suspended') {
        return (
            <div className="referral-notice">
                <AlertCircle size={18} />
                <div>
                    <strong>Your referrer account is not active.</strong>
                    <p>Please contact <a href="mailto:support@elabsolution.org">support@elabsolution.org</a> if you think this is a mistake.</p>
                </div>
            </div>
        )
    }

    const link = profile.referral_code ? `https://portal.elabsolution.org/r/${profile.referral_code}` : ''
    const stats = profile.stats
    const message =
        `Hello! I'd like to introduce you to eLab Solutions — they handle healthcare licensing and ` +
        `verification (DataFlow, Mumaris, exams, licensing). Apply through my link and they will take ` +
        `it from there: ${link}`

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link)
            setCopied(true)
            setTimeout(() => setCopied(false), 2500)
        } catch {
            setCopied(false)
        }
    }

    return (
        <div className="referral-page">
            <header className="referral-page-head">
                <p className="referral-kicker">Referral programme</p>
                <h1>Hello {profile.first_name}</h1>
                <p className="referral-lede">
                    Share your link with healthcare professionals you know. Every person who applies through it is
                    recorded against your name, and you earn commission when they pay for their service.
                </p>
            </header>

            <section className="referral-link-panel" aria-label="Your referral link">
                <div className="referral-link-row">
                    <code>{link || 'Your code is being issued'}</code>
                    <button type="button" className="referral-button" onClick={copy} disabled={!link}>
                        {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy link</>}
                    </button>
                </div>
                <div className="referral-link-actions">
                    <a
                        className="referral-button referral-button-quiet"
                        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <MessageCircle size={15} /> Share on WhatsApp
                    </a>
                    <a
                        className="referral-button referral-button-quiet"
                        href={`mailto:?subject=${encodeURIComponent('eLab Solutions — healthcare licensing')}&body=${encodeURIComponent(message)}`}
                    >
                        Share by email
                    </a>
                    <Link className="referral-button referral-button-quiet" to="/referral/invite">More ways to share</Link>
                </div>
                <p className="referral-link-note">
                    Your code is <strong>{profile.referral_code}</strong>. Anyone who applies through your link is
                    marked as yours automatically — there is nothing to chase or forward.
                </p>
            </section>

            <section className="referral-figures" aria-label="Your numbers">
                <div><span>People referred</span><strong>{stats.referred}</strong></div>
                <div><span>In progress</span><strong>{stats.in_progress}</strong></div>
                <div><span>Completed</span><strong>{stats.completed}</strong></div>
                <div><span>Earned to date</span><strong>{formatNaira(stats.earned_ngn)}</strong></div>
                <div className={stats.available_ngn > 0 ? 'is-accent' : ''}>
                    <span>Available to request</span><strong>{formatNaira(stats.available_ngn)}</strong>
                </div>
                <div><span>Paid to you</span><strong>{formatNaira(stats.paid_ngn)}</strong></div>
            </section>

            <div className="referral-columns">
                <section className="referral-panel">
                    <h2>How it works</h2>
                    <ol className="referral-steps">
                        <li><span>1</span><div><strong>Share your link</strong><p>Send it to nurses, doctors or colleagues who are looking to work abroad.</p></div></li>
                        <li><span>2</span><div><strong>They apply</strong><p>They fill a short form. The case opens in our system already marked as your referral.</p></div></li>
                        <li><span>3</span><div><strong>You earn</strong><p>Commission is earned when they pay for their service, and shows up here straight away.</p></div></li>
                        <li><span>4</span><div><strong>Request a payout</strong><p>Ask for what you have earned from the Earnings page; we pay to your bank account.</p></div></li>
                    </ol>
                </section>

                <section className="referral-panel">
                    <h2>What you earn</h2>
                    <table className="referral-rate-table">
                        <tbody>
                            {Object.entries(profile.rates ?? {}).map(([slug, rate]) => (
                                <tr key={slug}>
                                    <td>{RATE_LABELS[slug] ?? slug}</td>
                                    <td>{formatNaira(rate)}</td>
                                </tr>
                            ))}
                            {Object.keys(profile.rates ?? {}).length === 0 && (
                                <tr><td colSpan={2}>Rates are being set — contact the team.</td></tr>
                            )}
                        </tbody>
                    </table>
                    <p className="referral-fineprint">
                        Per referred client, once their service has been paid for. There are no tiers and no caps on how
                        many people you may introduce.
                    </p>
                    {stats.pending_rate > 0 && (
                        <p className="referral-fineprint">
                            {stats.pending_rate} completed {stats.pending_rate === 1 ? 'service is' : 'services are'} awaiting a
                            rate from the team.
                        </p>
                    )}
                </section>
            </div>

            <p className="referral-fineprint">
                Referrer since {formatDate(profile.approved_at ?? null)}. Questions about your earnings?{' '}
                <Link to="/support">Contact the team</Link>.
            </p>
        </div>
    )
}

const RATE_LABELS: Record<string, string> = {
    dataflow: 'DataFlow verification',
    mumaris: 'Mumaris / SCFHS licensing',
    exam_booking: 'Exam booking',
    academy: 'Academy programmes',
}
