import { useEffect, useState } from 'react'
import { BookOpen, Building2, CalendarDays, CheckCircle2, IdCard, Plane, Scale, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react'
import { getMyNextSteps, respondToNextStep, type NextStep } from '@/lib/portalData'

const ICONS: Record<string, { icon: LucideIcon; bg: string; fg: string }> = {
    book: { icon: BookOpen, bg: 'var(--pl-blue-soft)', fg: 'var(--pl-blue-strong)' },
    building: { icon: Building2, bg: 'var(--pl-green-soft)', fg: 'var(--pl-green)' },
    calendar: { icon: CalendarDays, bg: 'var(--pl-blue-soft)', fg: 'var(--pl-blue-strong)' },
    check: { icon: CheckCircle2, bg: 'var(--pl-green-soft)', fg: 'var(--pl-green)' },
    id: { icon: IdCard, bg: 'var(--pl-green-soft)', fg: 'var(--pl-green)' },
    plane: { icon: Plane, bg: 'var(--pl-amber-soft)', fg: 'var(--pl-amber)' },
    scale: { icon: Scale, bg: 'var(--pl-fill)', fg: 'var(--pl-text-2)' },
    shield: { icon: ShieldCheck, bg: 'var(--pl-blue-soft)', fg: 'var(--pl-blue-strong)' },
}

/**
 * "Your next steps" — services that naturally follow what the client already has,
 * from the journey map in the Command Centre. "I'm interested" creates a follow-up
 * task for their adviser (nothing is charged); "Not now" hides it for 30 days.
 */
export default function NextSteps({ firstName }: { firstName?: string | null }) {
    const [steps, setSteps] = useState<NextStep[]>([])
    const [busy, setBusy] = useState<string | null>(null)
    const [thanks, setThanks] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        getMyNextSteps().then(setSteps).catch(() => setSteps([]))
    }, [])

    const respond = async (s: NextStep, response: 'interested' | 'dismissed') => {
        setBusy(s.service_key)
        setError(null)
        try {
            await respondToNextStep(s.service_key, response, s.from_case_id)
            setSteps((list) => list.filter((x) => x.service_key !== s.service_key))
            if (response === 'interested') setThanks(s.title)
        } catch {
            setError("That didn't go through. Please try again, or message us on WhatsApp.")
        } finally {
            setBusy(null)
        }
    }

    if (!steps.length && !thanks) return null

    return (
        <section className="pl-card" aria-labelledby="next-h">
            <div className="pl-card-h">
                <h2 id="next-h">Your next steps</h2>
                <span className="pl-row-sub" style={{ marginTop: 0 }}>Suggested for your route</span>
            </div>

            {thanks && (
                <div className="pl-row" role="status" style={{ display: 'block' }}>
                    <div style={{ fontWeight: 600 }}>Thanks{firstName ? `, ${firstName}` : ''} — we'll be in touch</div>
                    <div style={{ fontSize: 14, color: 'var(--pl-text-2)', marginTop: 3, lineHeight: '20px' }}>
                        Your eLab adviser will message you on WhatsApp about <b>{thanks}</b> within one working day. Nothing is charged until you agree.
                    </div>
                </div>
            )}
            {error && <div className="pl-row"><div className="pl-alert pl-alert-red" role="alert" style={{ width: '100%' }}>{error}</div></div>}

            {steps.map((s) => {
                const ic = ICONS[s.icon] || { icon: Sparkles, bg: 'var(--pl-fill)', fg: 'var(--pl-text-2)' }
                const Icon = ic.icon
                return (
                    <div key={s.service_key} className="pl-row" style={{ alignItems: 'flex-start', gap: 14 }}>
                        <span
                            aria-hidden
                            style={{ width: 40, height: 40, borderRadius: 11, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: ic.bg, color: ic.fg }}
                        >
                            <Icon className="w-5 h-5" strokeWidth={1.9} />
                        </span>
                        <div className="pl-row-t">
                            <div style={{ fontWeight: 600, fontSize: 15 }}>{s.title}</div>
                            <div style={{ fontSize: 14, color: 'var(--pl-text-2)', marginTop: 3, lineHeight: '20px' }}>{s.reason}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                <button type="button" className="pl-btn pl-btn-sm" disabled={busy === s.service_key} onClick={() => respond(s, 'interested')}>
                                    {busy === s.service_key ? 'Sending…' : "I'm interested"}
                                </button>
                                <button type="button" className="pl-btn2 pl-btn-sm" style={{ border: 0, background: 'transparent', color: 'var(--pl-muted)' }} disabled={busy === s.service_key} onClick={() => respond(s, 'dismissed')}>
                                    Not now
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })}
        </section>
    )
}
