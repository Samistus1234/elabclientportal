import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import Brand from '@/components/Brand'
import { useTheme } from '@/contexts/ThemeContext'
import {
    DESTINATION_OPTIONS,
    fetchReferralLanding,
    PROFESSION_OPTIONS,
    SERVICE_OPTIONS,
    submitReferralLead,
    type PublicReferral,
    type ReferralLeadResult,
} from '@/lib/referralApi'

/**
 * /r/:code — where a referrer's link lands.
 *
 * The referred person sends a short form; the Command Centre opens the case with
 * cases.referrer_id already set, so the referral is never lost and no member of
 * staff has to tag it by hand.
 */
export default function ReferralLanding() {
    const { code = '' } = useParams()
    const { isDark } = useTheme()
    const [referrer, setReferrer] = useState<PublicReferral | null>(null)
    const [checking, setChecking] = useState(true)
    const [form, setForm] = useState({
        fullName: '', phone: '', email: '', profession: '', service: '', destination: '', note: '', hp: '',
    })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<ReferralLeadResult | null>(null)

    useEffect(() => { document.title = 'Get started with ELAB' }, [])

    useEffect(() => {
        let mounted = true
        fetchReferralLanding(code)
            .then((data) => { if (mounted) setReferrer(data) })
            .catch(() => { if (mounted) setReferrer(null) })
            .finally(() => { if (mounted) setChecking(false) })
        return () => { mounted = false }
    }, [code])

    const set = (key: keyof typeof form) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => setForm((current) => ({ ...current, [key]: event.target.value }))

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setError(null)
        setSubmitting(true)
        try {
            const payload = await submitReferralLead({ code, ...form })
            setResult(payload)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    const shell = (children: React.ReactNode) => (
        <div className={`portal-inner inner-referral ${isDark ? 'inner-dark' : ''}`}>
            <header className="referral-header">
                <div className="referral-header-inner">
                    <Link to="/" aria-label="ELAB home"><Brand /></Link>
                    <nav aria-label="Referral navigation">
                        <Link to="/login" className="referral-quiet-link">Sign in</Link>
                    </nav>
                </div>
            </header>
            <main className="referral-main referral-narrow">{children}</main>
        </div>
    )

    if (checking) return shell(<div className="referral-loading">Checking this referral link…</div>)

    if (!referrer) {
        return shell(
            <section className="referral-panel referral-done">
                <h2>This referral link is not active</h2>
                <p>
                    The link may have been mistyped, or the referrer may not be enrolled any more. You can still
                    start with eLab directly — our team will help you work out what your destination requires.
                </p>
                <div className="referral-link-actions">
                    <Link className="referral-button" to="/support">Contact the team</Link>
                    <a className="referral-button referral-button-quiet" href="https://wa.me/2348165634195">Message on WhatsApp</a>
                </div>
            </section>,
        )
    }

    if (result) {
        return shell(
            <section className="referral-panel referral-done">
                <CheckCircle2 size={26} />
                <h2>Thank you — your details are with eLab</h2>
                <p>
                    {result.outcome === 'case_created'
                        ? 'We have opened your case and a member of our team will contact you on the number you gave us.'
                        : 'We already have an open application for you, so nothing has been duplicated — your details are with the team handling it.'}
                </p>
                <p className="referral-reference">
                    Your case reference: <strong>{result.case_reference}</strong>
                </p>
                <p>
                    Keep that reference: your welcome email uses it, and it is how you activate your ELAB client portal
                    account to follow your application.
                </p>
                <div className="referral-link-actions">
                    <Link className="referral-button" to="/register">Activate your portal account</Link>
                    <a className="referral-button referral-button-quiet" href="https://wa.me/2348165634195">Message the team</a>
                </div>
            </section>,
        )
    }

    return shell(
        <>
            <div className="referral-join-intro">
                <p className="referral-kicker">
                    {referrer.referrer_first_name ? `Referred by ${referrer.referrer_first_name}` : 'Referred to eLab'}
                </p>
                <h1 className="referral-join-title">Let's start your application.</h1>
                <p className="referral-lede">
                    Tell us who you are and what you need. A member of the eLab team will contact you about the
                    requirements for your destination — there is no charge for the enquiry.
                </p>
            </div>

            <form className="referral-panel referral-form" onSubmit={submit}>
                <div className="referral-form-grid">
                    <label><span>Your full name *</span>
                        <input value={form.fullName} onChange={set('fullName')} required placeholder="As it appears on your passport" />
                    </label>
                    <label><span>Phone / WhatsApp *</span>
                        <input value={form.phone} onChange={set('phone')} required placeholder="+234 800 000 0000" />
                    </label>
                    <label><span>Email</span>
                        <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
                    </label>
                    <label><span>Profession *</span>
                        <select value={form.profession} onChange={set('profession')} required>
                            <option value="">Select…</option>
                            {PROFESSION_OPTIONS.filter((option) => option !== 'Not a healthcare professional').map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </label>
                    <label><span>What do you need? *</span>
                        <select value={form.service} onChange={set('service')} required>
                            <option value="">Select…</option>
                            {SERVICE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </label>
                    <label><span>Where do you want to practise?</span>
                        <select value={form.destination} onChange={set('destination')}>
                            <option value="">Select…</option>
                            {DESTINATION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                    </label>
                </div>

                <label className="referral-block"><span>Anything we should know?</span>
                    <textarea value={form.note} onChange={set('note')} rows={3} placeholder="Where you are in the process, deadlines, questions…" />
                </label>

                <input className="referral-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.hp} onChange={set('hp')} />

                {error && <p className="referral-error" role="alert">{error}</p>}

                <div className="referral-form-footer">
                    <button type="submit" className="referral-button" disabled={submitting}>
                        {submitting ? 'Sending…' : 'Send my details'}
                    </button>
                    <p className="referral-fineprint">
                        We reply on WhatsApp or by phone. Your details are used only to advise you on your application.
                    </p>
                </div>
            </form>

            <p className="referral-fineprint referral-join-foot">
                <Link to="/"><ArrowLeft size={13} /> Back to ELAB</Link>
            </p>
        </>,
    )
}
