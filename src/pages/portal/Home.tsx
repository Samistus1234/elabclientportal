import ElabUpdates from '@/components/portal/ElabUpdates'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react'
import PortalLayout from '@/components/portal/PortalLayout'
import NextSteps from '@/components/portal/NextSteps'
import { supabase } from '@/lib/supabase'
import {
    dedupeUpdates, displayName, formatDate, formatMoney, getMyCases, getMyInvoices, getMyPerson, getMyUpdates,
    getMyWaitingCases, getStages, greeting, isFinished, stepPosition, timeAgo,
    type MyCase, type MyInvoice, type MyPerson, type MyUpdate, type Stage, type WaitingCase,
} from '@/lib/portalData'

const WHATSAPP_URL = 'https://wa.me/2348165634195'

function updateLink(u: MyUpdate) {
    if (u.kind === 'invoice' || u.kind === 'payment') return '/payments'
    if (u.kind === 'document') return '/documents'
    return u.case_id ? `/case/${u.case_id}` : '/applications'
}

export default function Home() {
    const [person, setPerson] = useState<MyPerson | null>(null)
    const [cases, setCases] = useState<MyCase[] | null>(null)
    const [stages, setStages] = useState<Record<string, Stage[]>>({})
    const [waiting, setWaiting] = useState<WaitingCase[]>([])
    const [updates, setUpdates] = useState<MyUpdate[] | null>(null)
    const [invoices, setInvoices] = useState<MyInvoice[] | null>(null)
    const [isReferrer, setIsReferrer] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [sideError, setSideError] = useState(false)

    // Updates + invoices; a failure says so (it is not "no updates").
    const loadSide = () => {
        setSideError(false)
        setUpdates(null)
        setInvoices(null)
        // Ask for more than we show: repeated steps are folded away below.
        getMyUpdates(20).then(setUpdates).catch(() => setSideError(true))
        getMyInvoices().then(setInvoices).catch(() => setSideError(true))
    }

    useEffect(() => {
        let alive = true
        getMyPerson().then((p) => alive && setPerson(p)).catch(() => undefined)
        getMyCases()
            .then(async (cs) => {
                if (!alive) return
                setCases(cs)
                const byPipeline: Record<string, Stage[]> = {}
                await Promise.all(
                    Array.from(new Set(cs.map((c) => c.pipeline_id).filter(Boolean))).map(async (pid) => {
                        const c = cs.find((x) => x.pipeline_id === pid)!
                        byPipeline[pid as string] = await getStages(pid as string, c.pipeline_slug).catch(() => [])
                    }),
                )
                if (alive) setStages(byPipeline)
            })
            .catch(() => alive && setError("We couldn't load your applications. Please refresh the page."))
        getMyWaitingCases().then((w) => alive && setWaiting(w)).catch(() => undefined)
        loadSide()
        supabase.rpc('my_referrer_id').then(({ data }) => alive && setIsReferrer(!!data), () => undefined)
        return () => {
            alive = false
        }
    }, [])

    const open = (cases || []).filter((c) => !isFinished(c))
    const finished = (cases || []).filter(isFinished)
    const waitingIds = new Set(waiting.map((w) => w.case_id))
    const byRecent = [...open].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    // The one application Home leads with: one that needs the client, else the latest.
    const focus = byRecent.find((c) => waitingIds.has(c.id)) ?? byRecent[0] ?? null
    const others = byRecent.filter((c) => c !== focus)
    const focusWaiting = focus ? waiting.find((w) => w.case_id === focus.id) : undefined
    const otherWaiting = waiting.filter((w) => w.case_id !== focus?.id)
    const toPay = (invoices || []).filter((i) => Number(i.amount_due) > 0)
    const feed = updates ? dedupeUpdates(updates).slice(0, 5) : null
    const firstName = displayName(person?.first_name)

    const summary =
        cases === null
            ? ' '
            : waiting.length > 0
              ? waiting.length === 1
                  ? 'One of your applications needs something from you.'
                  : `${waiting.length} of your applications need something from you.`
              : open.length > 0
                ? `${open.length === 1 ? 'You have 1 application' : `You have ${open.length} applications`} in progress. Nothing needs your attention.`
                : finished.length > 0
                  ? 'All your applications are complete.'
                  : "You don't have an application with us yet."

    const focusStages = focus ? stages[focus.pipeline_id || ''] : undefined
    const focusPos = focus ? stepPosition(focusStages, focus.stage_id) : null
    const focusIndex = focus && focusStages ? focusStages.findIndex((s) => s.id === focus.stage_id) : -1
    const showLabels = !!focusStages && focusStages.length <= 7

    return (
        <PortalLayout>
            <div className="pl-page">
                <div>
                    <h1 className="pl-h1">
                        {greeting()}{firstName ? `, ${firstName}` : ''}.
                    </h1>
                    <p className="pl-sub" style={{ margin: '8px 0 0' }}>{summary}</p>
                </div>

                {error && <div className="pl-alert pl-alert-red">{error}</div>}

                {cases === null ? (
                    <div className="pl-hero"><div className="pl-skel" style={{ height: 180 }} role="status" aria-label="Loading" /></div>
                ) : focus ? (
                    <section className="pl-hero" aria-labelledby="focus-h">
                        <div className="pl-hero-top">
                            <div style={{ minWidth: 0 }}>
                                <p className="pl-eyebrow">{focusWaiting ? 'Needs your attention' : 'Your latest application'}</p>
                                <h2 id="focus-h" className="pl-hero-title">{focus.pipeline_name || 'Application'}</h2>
                                <div className="pl-row-sub" style={{ whiteSpace: 'normal' }}>
                                    {[focus.case_reference, `updated ${timeAgo(focus.updated_at)}`].filter(Boolean).join(' · ')}
                                </div>
                            </div>
                            {focusWaiting ? (
                                <span className="pl-tag pl-tag-amber">Action needed</span>
                            ) : focus.stage_name ? (
                                <span className="pl-tag pl-tag-blue" style={{ maxWidth: '100%', whiteSpace: 'normal' }}>{focus.stage_name}</span>
                            ) : null}
                        </div>

                        {focusStages && focusStages.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {!showLabels && focusPos && (
                                    <div className="pl-row-sub" style={{ marginTop: 0 }}>Step {focusPos.index} of {focusPos.count}</div>
                                )}
                                <ol className="pl-segs" aria-label={focusPos ? `Progress: step ${focusPos.index} of ${focusPos.count}` : 'Progress'}>
                                    {focusStages.map((s, i) => (
                                        <li key={s.id} aria-current={i === focusIndex ? 'step' : undefined}>
                                            <span className={`bar ${focusIndex >= 0 && i <= focusIndex ? 'on' : ''}`} />
                                            {showLabels && <span className="lbl">{s.name}</span>}
                                        </li>
                                    ))}
                                </ol>
                                {focusPos && showLabels && (
                                    <div className="pl-row-sub" style={{ marginTop: 0 }} aria-hidden>
                                        Step {focusPos.index} of {focusPos.count}
                                        {focusStages[focusIndex + 1] ? ` · next: ${focusStages[focusIndex + 1].name}` : ''}
                                    </div>
                                )}
                            </div>
                        )}

                        {focusWaiting ? (
                            <div className="pl-note pl-note-amber">
                                <AlertCircle size={24} color="var(--pl-amber)" aria-hidden style={{ flex: 'none' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p className="pl-note-t">We need something from you</p>
                                    <p className="pl-note-d">
                                        We asked you by WhatsApp or email{focusWaiting.since ? ` on ${formatDate(focusWaiting.since)}` : ''}.
                                        Reply there, or upload it here.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="pl-note">
                                <CheckCircle2 size={24} color="var(--pl-green)" aria-hidden style={{ flex: 'none' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p className="pl-note-t">Nothing needed from you right now</p>
                                    <p className="pl-note-d">We're working on it and will message you when it moves on.</p>
                                </div>
                            </div>
                        )}

                        <div className="pl-actions">
                            {focusWaiting && <Link to="/documents" className="pl-btn">Upload a document</Link>}
                            <Link to={`/case/${focus.id}`} className={focusWaiting ? 'pl-btn2' : 'pl-btn pl-btn-ink'}>View application</Link>
                            {!focusWaiting && (
                                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="pl-btn2">Message the team</a>
                            )}
                        </div>
                    </section>
                ) : (
                    <section className="pl-hero" aria-label="Your applications">
                        <p className="pl-note-d" style={{ margin: 0 }}>
                            {finished.length
                                ? 'Everything we were handling for you is complete. Your finished applications stay in Applications.'
                                : 'When eLab opens an application for you, it will appear here with each step as it happens.'}
                        </p>
                        <div className="pl-actions">
                            {finished.length > 0 && <Link to="/applications" className="pl-btn pl-btn-ink">See your applications</Link>}
                            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className={finished.length ? 'pl-btn2' : 'pl-btn'}>Message us on WhatsApp</a>
                        </div>
                    </section>
                )}

                {otherWaiting.map((w) => (
                    <div key={w.case_id} className="pl-note pl-note-amber" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <AlertCircle size={24} color="var(--pl-amber)" aria-hidden style={{ flex: 'none' }} />
                        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                            <p className="pl-note-t">We need something from you</p>
                            <p className="pl-note-d">
                                For your {w.application_name || 'application'}, we asked by WhatsApp or email
                                {w.since ? ` on ${formatDate(w.since)}` : ''}.
                            </p>
                        </div>
                        <Link to="/documents" className="pl-btn">Upload a document</Link>
                    </div>
                ))}

                {others.length > 0 && (
                    <section aria-labelledby="others-h">
                        <div className="pl-sec-h">
                            <h2 id="others-h" className="pl-h2">Your other applications</h2>
                            <Link to="/applications" className="pl-link">See all</Link>
                        </div>
                        <div className="pl-card">
                            {others.map((c, i) => {
                                const pos = stepPosition(stages[c.pipeline_id || ''], c.stage_id)
                                return (
                                    <Link key={c.id} to={`/case/${c.id}`} className="pl-row" style={i === 0 ? { borderTop: 0 } : undefined}>
                                        <div className="pl-row-t">
                                            <div className="pl-row-title">{c.pipeline_name || 'Application'}</div>
                                            <div className="pl-row-sub">
                                                {[waitingIds.has(c.id) ? 'Needs your attention' : c.stage_name, c.case_reference].filter(Boolean).join(' · ')}
                                            </div>
                                        </div>
                                        {pos && <span className="pl-row-sub pl-num" style={{ marginTop: 0, flex: 'none' }}>Step {pos.index} of {pos.count}</span>}
                                        <ChevronRight size={18} className="pl-chev" aria-hidden />
                                    </Link>
                                )
                            })}
                        </div>
                    </section>
                )}

                <ElabUpdates compact />

                <div className="pl-split">
                    <section className="pl-card" aria-labelledby="upd-h">
                        <div className="pl-card-h">
                            <h2 id="upd-h">Recent updates</h2>
                        </div>
                        {sideError && updates === null ? (
                            <div className="pl-empty" style={{ borderTop: 0 }}>
                                We couldn't load your updates.{' '}
                                <button type="button" className="pl-link" onClick={loadSide}>Try again</button>
                            </div>
                        ) : feed === null ? (
                            <div style={{ padding: '4px 22px 22px' }}><div className="pl-skel" style={{ height: 56 }} role="status" aria-label="Loading" /></div>
                        ) : feed.length === 0 ? (
                            <div className="pl-empty" style={{ borderTop: 0 }}>Updates on your applications, documents and payments will appear here.</div>
                        ) : (
                            feed.map((u, i) => (
                                <Link key={`${u.kind}-${u.ref_id}`} to={updateLink(u)} className="pl-row" style={{ alignItems: 'flex-start', ...(i === 0 ? { borderTop: 0 } : {}) }}>
                                    <span className={`pl-feed-dot ${i === 0 ? 'new' : ''}`} aria-hidden />
                                    <div className="pl-row-t">
                                        <div className="pl-row-title" style={{ whiteSpace: 'normal' }}>
                                            {u.kind === 'document' ? `We received ${u.title}` : u.title}
                                        </div>
                                        <div className="pl-row-sub" style={{ whiteSpace: 'normal' }}>{u.detail}</div>
                                    </div>
                                    <span className="pl-row-sub" style={{ marginTop: 0, flex: 'none' }}>{formatDate(u.happened_at)}</span>
                                </Link>
                            ))
                        )}
                    </section>

                    <div className="pl-stack">
                        {invoices !== null && (
                            <Link to="/payments" className="pl-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: 22 }}>
                                <h2 className="pl-card-title" style={{ fontSize: 19, fontWeight: 700 }}>Payments</h2>
                                <p className="pl-note-d" style={{ marginTop: 6, color: toPay.length ? 'var(--pl-text)' : 'var(--pl-muted)' }}>
                                    {toPay.length === 0
                                        ? invoices.length
                                            ? 'Nothing to pay. All your invoices are settled.'
                                            : 'Nothing to pay. Invoices and receipts will appear here.'
                                        : `${toPay.length === 1 ? '1 invoice' : `${toPay.length} invoices`} to pay: ${toPay.map((i) => formatMoney(i.amount_due, i.currency)).join(' + ')}`}
                                </p>
                                {toPay.length > 0 && <span className="pl-btn" style={{ marginTop: 14, width: '100%', boxSizing: 'border-box' }}>View and pay</span>}
                            </Link>
                        )}
                        <section className="pl-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }} aria-labelledby="q-h">
                            <div>
                                <h2 id="q-h" className="pl-card-title" style={{ fontSize: 19, fontWeight: 700 }}>Questions?</h2>
                                <p className="pl-note-d" style={{ marginTop: 6, color: 'var(--pl-muted)' }}>The team handling your case is a message away.</p>
                            </div>
                            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="pl-btn">Message us on WhatsApp</a>
                            <Link to="/help" className="pl-link" style={{ alignSelf: 'center', margin: '-8px 0' }}>Ask a question in the portal</Link>
                        </section>
                    </div>
                </div>

                <NextSteps firstName={firstName} />

                {isReferrer && (
                    <Link to="/referral" className="pl-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px', textDecoration: 'none', color: 'inherit' }}>
                        <div className="pl-row-t">
                            <div className="pl-row-title" style={{ whiteSpace: 'normal' }}>Referral programme</div>
                            <div className="pl-row-sub" style={{ whiteSpace: 'normal' }}>See the people you've referred and how they're getting on.</div>
                        </div>
                        <ChevronRight size={18} className="pl-chev" aria-hidden />
                    </Link>
                )}
            </div>
        </PortalLayout>
    )
}
