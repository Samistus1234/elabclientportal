import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PortalLayout from '@/components/portal/PortalLayout'
import { supabase } from '@/lib/supabase'
import {
    formatDate, formatMoney, getMyCases, getMyInvoices, getMyPerson, getMyUpdates, getMyWaitingCases, getStages,
    greeting, isFinished, stepPosition, timeAgo,
    type MyCase, type MyInvoice, type MyPerson, type MyUpdate, type Stage, type WaitingCase,
} from '@/lib/portalData'

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
        getMyUpdates(6).then(setUpdates).catch(() => setSideError(true))
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
    const toPay = (invoices || []).filter((i) => Number(i.amount_due) > 0)

    return (
        <PortalLayout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                    <h1 className="pl-h1">
                        {greeting()}{person?.first_name ? `, ${person.first_name}` : ''}
                    </h1>
                    <div className="pl-sub">Here's where your applications stand.</div>
                </div>

                {error && <div className="pl-alert pl-alert-red">{error}</div>}

                {waiting.map((w) => (
                    <div key={w.case_id} className="pl-card pl-card-pad pl-wait" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                        <div style={{ flex: '1 1 260px' }}>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>We're waiting on you</div>
                            <div style={{ fontSize: 14, color: 'var(--pl-text-2)', marginTop: 3 }}>
                                For your <b>{w.application_name || 'application'}</b>, we've asked you for something by WhatsApp or email
                                {w.since ? ` on ${formatDate(w.since)}` : ''}. Reply there, or upload it here.
                            </div>
                        </div>
                        <Link to="/documents" className="pl-btn">Upload a document</Link>
                    </div>
                ))}

                <div style={{ display: 'grid', gap: 16 }} className="md:grid-cols-[1.4fr_1fr]">
                    <section className="pl-card" aria-labelledby="apps-h">
                        <div className="pl-card-h">
                            <h2 id="apps-h">Your applications</h2>
                            <Link to="/applications" className="pl-link">See all</Link>
                        </div>
                        {cases === null ? (
                            <div style={{ padding: '4px 18px 18px' }}><div className="pl-skel" style={{ height: 56 }} role="status" aria-label="Loading" /></div>
                        ) : open.length === 0 ? (
                            <div className="pl-empty">
                                {finished.length ? 'All your applications are complete.' : "You don't have an application with us yet."}
                            </div>
                        ) : (
                            open.map((c) => {
                                const pos = stepPosition(stages[c.pipeline_id || ''], c.stage_id)
                                return (
                                    <Link key={c.id} to={`/case/${c.id}`} className="pl-row" style={{ flexWrap: 'wrap' }}>
                                        <div className="pl-row-t">
                                            <div className="pl-row-title">{c.pipeline_name || 'Application'}</div>
                                            <div className="pl-row-sub">{c.case_reference} · updated {timeAgo(c.updated_at)}</div>
                                        </div>
                                        {c.stage_name && <span className="pl-tag pl-tag-blue" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.stage_name}</span>}
                                        {pos && (
                                            <div style={{ flexBasis: '100%' }}>
                                                <div className="pl-bar-track"><div className="pl-bar-fill" style={{ width: `${pos.pct}%` }} /></div>
                                                <div className="pl-row-sub" style={{ marginTop: 5 }}>Step {pos.index} of {pos.count}</div>
                                            </div>
                                        )}
                                    </Link>
                                )
                            })
                        )}
                    </section>

                    <section className="pl-card" aria-labelledby="upd-h">
                        <div className="pl-card-h">
                            <h2 id="upd-h">Updates</h2>
                        </div>
                        {sideError && updates === null ? (
                            <div className="pl-empty">
                                We couldn't load your updates.{' '}
                                <button type="button" className="pl-link" onClick={loadSide}>Try again</button>
                            </div>
                        ) : updates === null ? (
                            <div style={{ padding: '4px 18px 18px' }}><div className="pl-skel" style={{ height: 56 }} role="status" aria-label="Loading" /></div>
                        ) : updates.length === 0 ? (
                            <div className="pl-empty">No updates yet.</div>
                        ) : (
                            updates.map((u) => {
                                const to = u.kind === 'invoice' || u.kind === 'payment' ? '/payments' : u.kind === 'document' ? '/documents' : u.case_id ? `/case/${u.case_id}` : '/applications'
                                return (
                                    <Link key={`${u.kind}-${u.ref_id}`} to={to} className="pl-row">
                                        <div className="pl-row-t">
                                            <div className="pl-row-title">
                                                {u.kind === 'document' ? `We have your ${u.title}` : u.title}
                                            </div>
                                            <div className="pl-row-sub">{[u.detail, formatDate(u.happened_at)].filter(Boolean).join(' · ')}</div>
                                        </div>
                                    </Link>
                                )
                            })
                        )}
                    </section>
                </div>

                {invoices !== null && (
                    <Link to="/payments" className="pl-card pl-card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ flex: 1, fontSize: 14 }}>
                            {toPay.length === 0 ? (
                                <><b>Nothing to pay</b> <span style={{ color: 'var(--pl-muted)' }}>· {invoices.length ? 'all invoices settled' : 'no invoices yet'}</span></>
                            ) : (
                                <><b>{toPay.length === 1 ? '1 invoice to pay' : `${toPay.length} invoices to pay`}</b> <span style={{ color: 'var(--pl-muted)' }}>· {toPay.map((i) => formatMoney(i.amount_due, i.currency)).join(' + ')}</span></>
                            )}
                        </div>
                        <span className="pl-link">View payments</span>
                    </Link>
                )}

                {isReferrer && (
                    <Link to="/referral" className="pl-card pl-card-pad" style={{ textDecoration: 'none', color: 'inherit', fontSize: 14 }}>
                        <b>Referral programme</b> <span style={{ color: 'var(--pl-muted)' }}>· see the people you've referred</span>
                    </Link>
                )}
            </div>
        </PortalLayout>
    )
}
