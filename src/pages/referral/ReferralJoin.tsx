import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import Brand from '@/components/Brand'
import { useTheme } from '@/contexts/ThemeContext'
import { PROFESSION_OPTIONS, submitReferrerApplication } from '@/lib/referralApi'

/**
 * /referral/join — public application form for the referral programme.
 *
 * Creates a real portal account on the Command Centre (pending approval), so the
 * applicant can sign in immediately and see their application status instead of
 * waiting on an email.
 */
export default function ReferralJoin() {
    const { isDark } = useTheme()
    const [form, setForm] = useState({
        firstName: '', lastName: '', email: '', phone: '', country: '', profession: '',
        audience: '', networkSize: '', note: '', password: '', confirm: '', hp: '',
    })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)

    useEffect(() => { document.title = 'Join the referral programme · ELAB' }, [])

    const set = (key: keyof typeof form) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => setForm((current) => ({ ...current, [key]: event.target.value }))

    const submit = async (event: React.FormEvent) => {
        event.preventDefault()
        setError(null)
        if (form.password.length < 8) {
            setError('Choose a password of at least 8 characters.')
            return
        }
        if (form.password !== form.confirm) {
            setError('The two passwords do not match.')
            return
        }
        setSubmitting(true)
        try {
            await submitReferrerApplication({
                firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone,
                country: form.country, profession: form.profession, audience: form.audience,
                networkSize: form.networkSize, note: form.note, password: form.password, hp: form.hp,
            })
            setDone(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className={`portal-inner inner-referral ${isDark ? 'inner-dark' : ''}`}>
            <header className="referral-header">
                <div className="referral-header-inner">
                    <Link to="/" aria-label="ELAB home"><Brand /></Link>
                    <nav aria-label="Referral navigation">
                        <Link to="/referral" className="referral-quiet-link">Already a referrer? Sign in</Link>
                    </nav>
                </div>
            </header>

            <main className="referral-main referral-narrow">
                <div className="referral-join-intro">
                    <p className="referral-kicker">Referral programme</p>
                    <h1 className="referral-join-title">Introduce healthcare professionals. Earn on every one.</h1>
                    <p className="referral-lede">
                        eLab Solutions handles credential verification and professional licensing for nurses, doctors
                        and other healthcare professionals — DataFlow, Mumaris Plus / SCFHS, Qatar DHP, UAE licensing,
                        CGFNS and exam bookings.
                    </p>
                </div>

                {done ? (
                    <section className="referral-panel referral-done">
                        <CheckCircle2 size={26} />
                        <h2>Application received</h2>
                        <p>
                            Your account is ready and your application is with our team. Sign in with your email address
                            and the password you just chose — your dashboard shows your status while we review it.
                        </p>
                        <p>Once you are approved we issue your personal referral link and email it to you.</p>
                        <Link className="referral-button" to="/login">Sign in to your dashboard</Link>
                    </section>
                ) : (
                    <form className="referral-panel referral-form" onSubmit={submit}>
                        <div className="referral-form-grid">
                            <label><span>First name *</span>
                                <input value={form.firstName} onChange={set('firstName')} required placeholder="Victoria" />
                            </label>
                            <label><span>Last name</span>
                                <input value={form.lastName} onChange={set('lastName')} placeholder="Adeyemi" />
                            </label>
                            <label><span>Email *</span>
                                <input type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
                            </label>
                            <label><span>Phone / WhatsApp</span>
                                <input value={form.phone} onChange={set('phone')} placeholder="+234 800 000 0000" />
                            </label>
                            <label><span>Country *</span>
                                <input value={form.country} onChange={set('country')} required placeholder="Nigeria" />
                            </label>
                            <label><span>You are a *</span>
                                <select value={form.profession} onChange={set('profession')} required>
                                    <option value="">Select…</option>
                                    {PROFESSION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                            </label>
                            <label><span>Who can you refer?</span>
                                <input value={form.audience} onChange={set('audience')} placeholder="Nurses in Lagos preparing for SNLE" />
                            </label>
                            <label><span>Approximate network size</span>
                                <select value={form.networkSize} onChange={set('networkSize')}>
                                    <option value="">Select…</option>
                                    <option value="1-5">1–5 people</option>
                                    <option value="6-20">6–20 people</option>
                                    <option value="21-50">21–50 people</option>
                                    <option value="50+">More than 50</option>
                                </select>
                            </label>
                            <label><span>Choose a password *</span>
                                <input type="password" value={form.password} onChange={set('password')} required autoComplete="new-password" placeholder="At least 8 characters" />
                            </label>
                            <label><span>Confirm password *</span>
                                <input type="password" value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" />
                            </label>
                        </div>

                        <label className="referral-block"><span>Anything we should know?</span>
                            <textarea value={form.note} onChange={set('note')} rows={3} placeholder="Optional" />
                        </label>

                        {/* honeypot */}
                        <input className="referral-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.hp} onChange={set('hp')} />

                        {error && <p className="referral-error" role="alert">{error}</p>}

                        <div className="referral-form-footer">
                            <button type="submit" className="referral-button" disabled={submitting}>
                                {submitting ? 'Sending…' : 'Submit application'}
                            </button>
                            <p className="referral-fineprint">
                                Your account is created immediately; the programme itself is approved by our team.
                                Questions? <a href="mailto:support@elabsolution.org">support@elabsolution.org</a>
                            </p>
                        </div>
                    </form>
                )}

                <p className="referral-fineprint referral-join-foot">
                    <Link to="/"><ArrowLeft size={13} /> Back to ELAB</Link>
                </p>
            </main>
        </div>
    )
}
