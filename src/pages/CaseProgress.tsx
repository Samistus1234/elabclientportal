import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Check } from 'lucide-react'
import '@/portal-v2.css'
import {
    feeStateLabel, formatMoney, getCaseProgress, isElabPayee, isExpired, itemStatusLabel, keyDateLabel,
    sortDoneLatestFirst, todayIso,
    type CaseProgress as Progress, type FeeState, type ProgressItem,
} from '@/lib/caseProgress'

const WHATSAPP_URL = 'https://wa.me/2348165634195'

const FEE_TAG: Record<FeeState, string> = {
    paid: 'pl-tag-green',
    being_checked: 'pl-tag-blue',
    part_paid: 'pl-tag-amber',
    invoiced: 'pl-tag-amber',
    coming_later: 'pl-tag-grey',
    paid_directly: 'pl-tag-green',
    to_be_invoiced: 'pl-tag-grey',
}

const WRAP = { overflowWrap: 'anywhere' as const }

function fmt(d: string | null | undefined): string {
    if (!d) return ''
    try { return format(parseISO(d), 'd MMM yyyy') } catch { return d }
}

function WhatsAppButton() {
    return (
        <a className="pl-btn pl-btn-ink" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            Message us on WhatsApp
        </a>
    )
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="pl" style={{ minHeight: '100vh' }}>
            <header className="pl-bar">
                <div className="pl-bar-in">
                    <span className="pl-logo">
                        <img src="/elab-logo-blue.png" alt="eLab Solutions International" width="148" height="28" />
                    </span>
                </div>
            </header>
            <main className="pl-main" style={{ maxWidth: 640 }}>{children}</main>
        </div>
    )
}

// How a row reads in its section: "waiting" shows the client's deadline,
// "status" a grey In progress / Not started tag (R20), "done" the done date.
type RowKind = 'waiting' | 'status' | 'done'

function ItemRow({ it, first, kind, today }: { it: ProgressItem; first: boolean; kind: RowKind; today: string }) {
    const tag = kind === 'status' ? itemStatusLabel(it.status) : null
    return (
        <div className="pl-row" style={{ alignItems: 'flex-start', ...(first ? { borderTop: 0 } : {}) }}>
            <div className="pl-row-t" style={WRAP}>
                <div style={{ fontWeight: 600 }}>
                    {kind === 'done' && it.done_on ? `${it.title} · ${fmt(it.done_on)}` : it.title}
                </div>
                {it.note && <div className="pl-note-d" style={WRAP}>{it.note}</div>}
                {kind === 'waiting' && it.due_on && <div className="pl-row-sub" style={{ whiteSpace: 'normal' }}>By {fmt(it.due_on)}</div>}
                {isExpired(it.valid_until, today) && (
                    <div className="pl-row-sub" style={{ whiteSpace: 'normal', color: 'var(--pl-red)', fontWeight: 600 }}>
                        Expired {fmt(it.valid_until)}
                    </div>
                )}
            </div>
            {tag && <span className="pl-tag pl-tag-grey" style={{ flexShrink: 0 }}>{tag}</span>}
        </div>
    )
}

function Section({ title, items, amber, kind, today }: { title: string; items: ProgressItem[]; amber?: boolean; kind: RowKind; today: string }) {
    if (items.length === 0) return null
    return (
        <section
            className="pl-card"
            aria-label={title}
            style={amber ? { boxShadow: 'inset 4px 0 0 var(--pl-amber-line)' } : undefined}
        >
            <div className="pl-card-h"><h2 style={WRAP}>{title}</h2></div>
            {items.map((it, i) => <ItemRow key={`${it.title}-${i}`} it={it} first={i === 0} kind={kind} today={today} />)}
        </section>
    )
}

function ComingUp({ phases }: { phases: Progress['coming_up'] }) {
    if (phases.length === 0) return null
    return (
        <section className="pl-card" aria-label="Coming up">
            <div className="pl-card-h"><h2 style={{ color: 'var(--pl-muted)' }}>Coming up</h2></div>
            {phases.map((ph, pi) => (
                <div key={`${pi}-${ph.phase}`} style={pi > 0 ? { borderTop: '1px solid var(--pl-line)' } : undefined}>
                    <h3 className="pl-eyebrow" style={{ padding: '14px 22px 2px', ...WRAP }}>{ph.phase}</h3>
                    {ph.titles.map((t, i) => (
                        <div key={`${t}-${i}`} className="pl-row" style={{ borderTop: 0, padding: '8px 22px', color: 'var(--pl-muted)', ...WRAP }}>
                            {t}
                        </div>
                    ))}
                </div>
            ))}
            <div style={{ height: 8 }} />
        </section>
    )
}

function DoneSection({ items, today }: { items: ProgressItem[]; today: string }) {
    const [all, setAll] = useState(false)
    if (items.length === 0) return null
    // Newest completion date first (items without a date last).
    const ordered = sortDoneLatestFirst(items)
    const shown = all ? ordered : ordered.slice(0, 3)
    return (
        <section className="pl-card" aria-label="Done">
            <div className="pl-card-h"><h2>Done</h2></div>
            {shown.map((it, i) => <ItemRow key={`${it.title}-${i}`} it={it} first={i === 0} kind="done" today={today} />)}
            {!all && ordered.length > 3 && (
                <div className="pl-row" style={{ padding: '4px 22px' }}>
                    <button type="button" className="pl-link" onClick={() => setAll(true)}>Show all ({ordered.length})</button>
                </div>
            )}
        </section>
    )
}

export default function CaseProgress() {
    const { token = '' } = useParams()
    const [data, setData] = useState<Progress | null | undefined>(undefined)
    const [failed, setFailed] = useState(false)

    const load = useCallback(() => {
        setData(undefined)
        setFailed(false)
        let alive = true
        getCaseProgress(token)
            .then((d) => alive && setData(d))
            .catch(() => alive && setFailed(true))
        return () => { alive = false }
    }, [token])

    useEffect(() => load(), [load])

    useEffect(() => {
        const prevTitle = document.title
        document.title = 'Your progress · eLab Solutions'
        const meta = document.createElement('meta')
        meta.name = 'robots'
        meta.content = 'noindex'
        document.head.appendChild(meta)
        return () => {
            document.title = prevTitle
            meta.remove()
        }
    }, [])

    if (failed) {
        return (
            <Shell>
                <div className="pl-card pl-card-pad" style={{ padding: 24 }}>
                    <p className="pl-note-t" role="alert">Something went wrong loading your progress.</p>
                    <button type="button" className="pl-btn pl-btn-ink" style={{ marginTop: 16 }} onClick={load}>Try again</button>
                </div>
            </Shell>
        )
    }

    if (data === undefined) {
        return (
            <Shell>
                <div role="status" aria-label="Loading" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="pl-skel" style={{ height: 44, width: '60%' }} />
                    <div className="pl-skel" style={{ height: 20, width: '80%' }} />
                    <div className="pl-skel" style={{ height: 160 }} />
                    <div className="pl-skel" style={{ height: 120 }} />
                </div>
            </Shell>
        )
    }

    if (data === null) {
        return (
            <Shell>
                <div className="pl-card" style={{ padding: 24 }}>
                    <h1 className="pl-card-title" style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>We couldn't find this page</h1>
                    <p className="pl-note-d" style={{ margin: '8px 0 16px' }}>
                        The link may have expired or been replaced. Message us on WhatsApp and we'll send you a new one.
                    </p>
                    <WhatsAppButton />
                </div>
            </Shell>
        )
    }

    const g = data.groups
    const today = todayIso()
    const others = new Map<string, ProgressItem[]>()
    for (const it of g.with_others) {
        const k = it.third_party || 'others'
        others.set(k, [...(others.get(k) || []), it])
    }

    return (
        <Shell>
            <div className="pl-page">
                <div>
                    <h1 className="pl-h1" style={WRAP}>Hello {data.first_name}</h1>
                    <p className="pl-sub" style={{ margin: '8px 0 0', ...WRAP }}>{data.service} · Ref {data.case_reference}</p>
                    <div style={{ marginTop: 10 }}>
                        {data.is_complete ? (
                            <span className="pl-tag pl-tag-green" style={{ display: 'inline-block', whiteSpace: 'normal', ...WRAP }}>
                                Complete · {data.deliverable}
                            </span>
                        ) : data.last_updated ? (
                            <p className="pl-row-sub" style={{ margin: 0 }}>Last updated {fmt(data.last_updated)}</p>
                        ) : null}
                    </div>
                </div>

                {data.phases.length > 0 && (
                    <section className="pl-card pl-card-pad" aria-labelledby="prog-h" style={{ padding: '22px' }}>
                        <h2 id="prog-h" className="pl-card-title" style={{ fontSize: 19, fontWeight: 700, margin: '0 0 10px' }}>Your progress</h2>
                        <ol className="pl-steps">
                            {data.phases.map((p, i) => (
                                <li key={`${i}-${p.label}`} className="pl-step" aria-current={p.state === 'current' ? 'step' : undefined}>
                                    <span className={`pl-dot ${p.state === 'done' ? 'pl-dot-done' : p.state === 'current' ? 'pl-dot-cur' : 'pl-dot-todo'}`}>
                                        {p.state === 'done' && <Check size={13} strokeWidth={3} aria-hidden />}
                                    </span>
                                    <span style={{
                                        ...WRAP,
                                        fontWeight: p.state === 'current' ? 700 : 400,
                                        color: p.state === 'upcoming' ? 'var(--pl-muted)' : 'var(--pl-text)',
                                    }}>
                                        {p.label}
                                        {p.state === 'done' && <span className="pl-sr"> (done)</span>}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </section>
                )}

                <Section title="Waiting on you" items={g.waiting_on_you} amber kind="waiting" today={today} />
                <Section title="With eLab" items={g.with_elab} kind="status" today={today} />
                {[...others.entries()].map(([who, items]) => (
                    <Section key={who} title={`With ${who}`} items={items} kind="status" today={today} />
                ))}
                <ComingUp phases={data.coming_up ?? []} />
                <DoneSection items={g.done} today={today} />

                {data.key_dates.length > 0 && (
                    <section className="pl-card" aria-label="Key dates">
                        <div className="pl-card-h"><h2>Key dates</h2></div>
                        {data.key_dates.map((k, i) => (
                            <div key={`${k.label}-${k.kind}-${i}`} className="pl-row" style={{ ...(i === 0 ? { borderTop: 0 } : {}), ...WRAP }}>
                                {k.label}: {keyDateLabel(k.kind)} {fmt(k.date)}
                            </div>
                        ))}
                    </section>
                )}

                {data.fees.length > 0 && (
                    <section className="pl-card" aria-label="Your costs">
                        <div className="pl-card-h"><h2>Your costs</h2></div>
                        {data.fees.map((f, i) => (
                            <div key={`${f.label}-${i}`} className="pl-row" style={{ alignItems: 'flex-start', ...(i === 0 ? { borderTop: 0 } : {}) }}>
                                <div className="pl-row-t" style={WRAP}>
                                    <div style={{ fontWeight: 600 }}>{f.label}</div>
                                    <div className="pl-row-sub pl-num" style={{ whiteSpace: 'normal', ...WRAP }}>
                                        {!isElabPayee(f.payee) && `to ${f.payee} · `}{formatMoney(f.amount, f.currency)}
                                    </div>
                                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                                        <span className={`pl-tag ${FEE_TAG[f.state]}`} style={{ whiteSpace: 'normal', ...WRAP }}>{feeStateLabel(f)}</span>
                                        {(f.state === 'part_paid' || f.state === 'invoiced') && f.invoice_id && (
                                            <a className="pl-btn pl-btn-sm" href={`/pay/${f.invoice_id}`}>Pay now</a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                <footer style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
                    <p className="pl-note-d" style={{ margin: 0 }}>Questions? Message us on WhatsApp and quote {data.case_reference}.</p>
                    <WhatsAppButton />
                </footer>
            </div>
        </Shell>
    )
}
