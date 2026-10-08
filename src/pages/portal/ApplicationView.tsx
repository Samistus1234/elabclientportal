import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PortalLayout from '@/components/portal/PortalLayout'
import AISummaryCard from '@/components/AISummaryCard'
import {
    formatDate, getCaseHistory, getMyCase, getMyDocuments, getMyWaitingCases, getStages,
    type MyCase, type MyDocument, type Stage,
} from '@/lib/portalData'

const WHATSAPP_URL = 'https://wa.me/2348165634195'

export default function ApplicationView() {
    const { caseId = '' } = useParams()
    const [c, setCase] = useState<MyCase | null | undefined>(undefined)
    const [stages, setStages] = useState<Stage[]>([])
    const [history, setHistory] = useState<{ id: string; created_at: string; to_stage_name: string }[]>([])
    const [docs, setDocs] = useState<MyDocument[] | null>(null)
    const [waiting, setWaiting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let alive = true
        setCase(undefined)
        getMyCase(caseId)
            .then(async (data) => {
                if (!alive) return
                setCase(data)
                if (data?.pipeline_id) {
                    getStages(data.pipeline_id, data.pipeline_slug).then((s) => alive && setStages(s)).catch(() => undefined)
                }
            })
            .catch(() => alive && setError("We couldn't load this application. Please refresh the page."))
        getCaseHistory(caseId).then((h) => alive && setHistory(h)).catch(() => alive && setHistory([]))
        getMyDocuments()
            .then((d) => alive && setDocs(d.filter((x) => x.case_id === caseId)))
            .catch(() => alive && setDocs([]))
        getMyWaitingCases().then((w) => alive && setWaiting(w.some((x) => x.case_id === caseId))).catch(() => undefined)
        return () => {
            alive = false
        }
    }, [caseId])

    if (c === null) {
        return (
            <PortalLayout>
                <div className="pl-card pl-card-pad" style={{ maxWidth: 560 }}>
                    <div style={{ fontWeight: 600 }}>Application not found</div>
                    <div className="pl-sub">It may belong to another account. <Link to="/applications" className="pl-link">See your applications</Link></div>
                </div>
            </PortalLayout>
        )
    }

    const currentIndex = c ? stages.findIndex((s) => s.id === c.stage_id) : -1
    const finished = c && ['completed', 'closed'].includes((c.status || '').toLowerCase())
    const since = history.find((h) => h.to_stage_name === c?.stage_name)?.created_at

    return (
        <PortalLayout>
            <div style={{ display: 'grid', gap: 16 }} className="lg:grid-cols-[1.3fr_1fr]">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
                    <div>
                        <Link to="/applications" className="pl-crumb">‹ Applications</Link>
                        <h1 className="pl-h1" style={{ marginTop: 4 }}>{c?.pipeline_name || (c === undefined ? ' ' : 'Application')}</h1>
                        <div className="pl-sub">
                            {[c?.case_reference, (c?.start_date || c?.created_at) && `started ${formatDate(c?.start_date || c?.created_at, true)}`].filter(Boolean).join(' · ')}
                        </div>
                    </div>
                    {error && <div className="pl-alert pl-alert-red">{error}</div>}

                    {waiting && (
                        <div className="pl-card pl-card-pad" style={{ borderLeft: '4px solid var(--pl-amber-line)' }}>
                            <div style={{ fontWeight: 700 }}>We're waiting on you</div>
                            <div style={{ fontSize: 14, color: 'var(--pl-text-2)', marginTop: 3 }}>
                                We've asked you for something by WhatsApp or email. Reply there, or <Link to="/documents" className="pl-link">upload it here</Link>.
                            </div>
                        </div>
                    )}

                    <section className="pl-card pl-card-pad" aria-labelledby="prog-h">
                        <h2 id="prog-h" style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Progress</h2>
                        {c === undefined ? (
                            <div className="pl-skel" style={{ height: 120 }} />
                        ) : stages.length === 0 ? (
                            <div style={{ fontSize: 14 }}>
                                Current step: <b>{c.stage_name || 'In progress'}</b>
                            </div>
                        ) : (
                            <ol className="pl-steps">
                                {stages.map((s, i) => {
                                    const done = finished || (currentIndex >= 0 && i < currentIndex)
                                    const cur = !finished && i === currentIndex
                                    return (
                                        <li key={s.id} className="pl-step" aria-current={cur ? 'step' : undefined}>
                                            <span className={`pl-dot ${done ? 'pl-dot-done' : cur ? 'pl-dot-cur' : 'pl-dot-todo'}`}>{done ? '✓' : ''}</span>
                                            <div>
                                                <div style={{ fontWeight: cur ? 700 : done ? 500 : 400, color: done || cur ? 'var(--pl-text)' : 'var(--pl-muted)' }}>{s.name}</div>
                                                {cur && since && <div className="pl-row-sub">Since {formatDate(since)}</div>}
                                            </div>
                                        </li>
                                    )
                                })}
                            </ol>
                        )}
                    </section>

                    <section className="pl-card" aria-labelledby="hist-h">
                        <div className="pl-card-h"><h2 id="hist-h">History</h2></div>
                        {history.length === 0 ? (
                            <div className="pl-empty">No changes recorded yet.</div>
                        ) : (
                            history.map((h) => (
                                <div key={h.id} className="pl-row">
                                    <div className="pl-row-t"><div className="pl-row-title" style={{ whiteSpace: 'normal' }}>{h.to_stage_name}</div></div>
                                    <span className="pl-row-sub" style={{ marginTop: 0 }}>{formatDate(h.created_at)}</span>
                                </div>
                            ))
                        )}
                    </section>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }} className="lg:pt-[62px]">
                    {c && (
                        <AISummaryCard
                            caseId={c.id}
                            caseData={{
                                status: c.status,
                                pipeline: c.pipeline_name ? { name: c.pipeline_name, slug: c.pipeline_slug || '' } : undefined,
                                current_stage: c.stage_name ? { name: c.stage_name, slug: c.stage_slug || '' } : undefined,
                                metadata: c.metadata || undefined,
                            }}
                        />
                    )}

                    <section className="pl-card" aria-labelledby="docs-h">
                        <div className="pl-card-h">
                            <h2 id="docs-h">Documents for this application</h2>
                            <Link to="/documents" className="pl-link">All →</Link>
                        </div>
                        {docs === null ? (
                            <div style={{ padding: '4px 18px 18px' }}><div className="pl-skel" style={{ height: 40 }} /></div>
                        ) : docs.length === 0 ? (
                            <div className="pl-empty">No documents on this application yet.</div>
                        ) : (
                            docs.slice(0, 6).map((d) => (
                                <div key={d.id} className="pl-row">
                                    <div className="pl-row-t">
                                        <div className="pl-row-title">{d.name}</div>
                                        <div className="pl-row-sub">{d.received_via} · {formatDate(d.uploaded_at)}</div>
                                    </div>
                                    <span className="pl-tag pl-tag-green">Received</span>
                                </div>
                            ))
                        )}
                    </section>

                    <div className="pl-card pl-card-pad" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="pl-btn">Message us on WhatsApp</a>
                        <Link to={`/help?case=${caseId}`} className="pl-btn2">Ask a question</Link>
                    </div>
                </div>
            </div>
        </PortalLayout>
    )
}
