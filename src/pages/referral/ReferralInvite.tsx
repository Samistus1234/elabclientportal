import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { fetchReferrerProfile, type ReferrerProfile } from '@/lib/referralApi'

/**
 * Invite — ready-to-send wording plus the link, for the channels referrers
 * actually use. The old "Marketing" page offered six downloads that did not
 * exist; nothing here pretends to be a file.
 */
export default function ReferralInvite() {
    const [profile, setProfile] = useState<ReferrerProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState<string | null>(null)

    useEffect(() => {
        let mounted = true
        fetchReferrerProfile()
            .then((data) => { if (mounted) setProfile(data) })
            .catch(() => undefined)
            .finally(() => { if (mounted) setLoading(false) })
        return () => { mounted = false }
    }, [])

    if (loading) return <div className="referral-loading">Loading…</div>

    const link = profile?.referral_code ? `https://portal.elabsolution.org/r/${profile.referral_code}` : ''
    const firstName = profile?.first_name ?? ''

    const copy = async (key: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(key)
            setTimeout(() => setCopied(null), 2500)
        } catch { setCopied(null) }
    }

    const templates = [
        {
            key: 'whatsapp',
            label: 'WhatsApp',
            text:
                `Hello! 👋\n\nIf you are thinking about working abroad as a healthcare professional, ` +
                `I would like to introduce you to eLab Solutions. They handle DataFlow verification, ` +
                `Mumaris and licensing, exam bookings and the rest of the paperwork — with a case ` +
                `manager who follows it through.\n\nYou can start here: ${link}\n\n` +
                `Fill the short form and they will take it from there. The team is on +234 816 563 4195 if you have questions.`,
        },
        {
            key: 'email',
            label: 'Email',
            text:
                `Subject: Healthcare licensing abroad — eLab Solutions\n\n` +
                `Hello,\n\nI wanted to share an introduction. eLab Solutions helps nurses, doctors and ` +
                `other healthcare professionals with credential verification and professional licensing — ` +
                `DataFlow, Mumaris Plus / SCFHS, Qatar DHP, UAE licensing, CGFNS and exam bookings — ` +
                `and they follow the application through with a case manager.\n\n` +
                `You can apply through this link: ${link}\n\n` +
                `Once you send your details, their team will contact you about requirements for your ` +
                `destination. I am happy to answer anything about my own experience with them.\n\n` +
                `Best regards,\n${firstName}`,
        },
        {
            key: 'sms',
            label: 'SMS / short',
            text: `Thinking of working abroad? eLab Solutions handles DataFlow, licensing and exam bookings for healthcare professionals. Start here: ${link}`,
        },
        {
            key: 'post',
            label: 'Social post',
            text:
                `Healthcare professionals: if you are working towards practising abroad, eLab Solutions ` +
                `handles the paperwork side — credential verification (DataFlow), professional licensing ` +
                `(Mumaris Plus, Qatar DHP, UAE), CGFNS evaluations and exam bookings.\n\n` +
                `You can start an application here: ${link}\n\n` +
                `#HealthcareCareers #NursingAbroad #DataFlow #MumarisPlus`,
        },
    ]

    return (
        <div className="referral-page">
            <header className="referral-page-head">
                <p className="referral-kicker">Referral programme</p>
                <h1>Invite someone</h1>
                <p className="referral-lede">
                    Send your link directly, or start from wording that already explains what eLab does. Edit it to
                    sound like you — people reply to a personal message, not a brochure.
                </p>
            </header>

            <section className="referral-link-panel" aria-label="Your referral link">
                <div className="referral-link-row">
                    <code>{link}</code>
                    <button type="button" className="referral-button" onClick={() => copy('link', link)} disabled={!link}>
                        {copied === 'link' ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy link</>}
                    </button>
                </div>
                <div className="referral-link-actions">
                    {link && (
                        <a
                            className="referral-button referral-button-quiet"
                            href={`https://wa.me/?text=${encodeURIComponent(templates[0].text)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Open WhatsApp
                        </a>
                    )}
                    {link && (
                        <a
                            className="referral-button referral-button-quiet"
                            href={`mailto:?subject=${encodeURIComponent('Healthcare licensing abroad — eLab Solutions')}&body=${encodeURIComponent(templates[1].text)}`}
                        >
                            Open email
                        </a>
                    )}
                </div>
            </section>

            <div className="referral-templates">
                {templates.map((template) => (
                    <section className="referral-panel" key={template.key}>
                        <div className="referral-template-head">
                            <h2>{template.label}</h2>
                            <button type="button" className="referral-button referral-button-quiet" onClick={() => copy(template.key, template.text)}>
                                {copied === template.key ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}
                            </button>
                        </div>
                        <pre className="referral-template-body">{template.text}</pre>
                    </section>
                ))}
            </div>
        </div>
    )
}
