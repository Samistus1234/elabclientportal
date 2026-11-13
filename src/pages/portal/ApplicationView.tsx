import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, Check, CheckCircle2, ChevronLeft, FileText } from 'lucide-react'
import PortalLayout from '@/components/portal/PortalLayout'
import {
    finishedLabel, formatDate, getCaseHistory, getMyCase, getMyDocuments, getMyWaitingCases, getStages, isFinished,
    type MyCase, type MyDocument, type Stage,
} from '@/lib/portalData'

const WHATSAPP_URL = 'https://wa.me/2348165634195'

interface HistoryItem {
    key: string
    at: string
    text: string
}

type StageMove = { id: string; created_at: string; to_stage_name: string }

/**
 * What happened on this application, newest first: step changes, documents we
 * received and the day it started. Step changes alone left most clients with
 * "No changes recorded yet" because an application usually opens on its first
 * step and the documents arrive before the step moves.
 */
function buildHistory(c: MyCase, moves: StageMove[], docs: MyDocument[]): HistoryItem[] {
    const items: HistoryItem[] = []
    const sortedMoves = [...moves].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    let last = ''
    for (const m of sortedMoves) {
        // Moving back and forth, or between staff-only steps, repeats the client step.
        if (m.to_stage_name === last) continue
        last = m.to_stage_name
        items.push({ key: `s-${m.id}`, at: m.created_at, text: `Moved to ${m.to_stage_name}` })
    }
    for (const d of docs) {
        if (d.uploaded_at) items.push({ key: `d-${d.id}`, at: d.uploaded_at, text: `We received ${d.name}` })
    }
    const started = c.start_date || c.created_at
    if (started) items.push({ key: 'start', at: started, text: 'Application started' })
    return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

export default function ApplicationView() {
    const { caseId = '' } = useParams()
    const [c, setCase] = useState<MyCase | null | undefined>(undefined)
    const [stages, setStages] = useState<Stage[]>([])
    const [moves, setMoves] = useState<StageMove[] | null>(null)
    const [docs, setDocs] = useState<MyDocument[] | null>(null)
    const [waiting, setWaiting] = useState(false)
    const [historyError, setHistoryError] = useState(false)
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
        getCaseHistory(caseId).then((h) => alive && setMoves(h)).catch(() => alive && setHistoryError(true))
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
                <div className="pl-card" style={{ maxWidth: 560, padding: 24 }}>
                    <h1 className="pl-card-title" style={{ fontSize: 19, fontWeight: 700 }}>Application not found</h1>
                    <p className="pl-note-d" style={{ color: 'var(--pl-muted)' }}>It may belong to another account.</p>
                    <Link to="/applications" className="pl-btn pl-btn-ink" style={{ marginTop: 16 }}>See your applications</Link>
                </div>
            </PortalLayout>
        )
    }

    const currentIndex = c ? stages.findIndex((s) => s.id === c.stage_id) : -1
    const finished = !!c && isFinished(c)
    const sinceMoves = (moves || []).filter((h) => h.to_stage_name === c?.stage_name)
    const since = sinceMoves[sinceMoves.length - 1]?.created_at
    const history = c && moves && docs ? buildHistory(c, moves, docs) : null
    const updated = c?.updated_at ? formatDate(c.updated_at, true) : ''

    return (
        <PortalLayout>
            <div className="pl-page">
                <div>
                    <Link to="/applications" className="pl-crumb" style={{ color: 'var(--pl-link)', gap: 2 }}>
                        <ChevronLeft size={18} aria-hidden />Applications
                    </Link>
                    {c === undefined ? (
                        <div className="pl-skel" style={{ height: 40, width: 300, marginTop: 8 }} role="status" aria-label="Loading" />
                    ) : (
                        <h1 className="pl-h1" style={{ marginTop: 8 }}>{c.pipeline_name || 'Application'}</h1>
                    )}
                    <p className="pl-sub" style={{ margin: '8px 0 0' }}>
                        {[
                            c?.case_reference,
                            (c?.start_date || c?.created_at) && `started ${formatDate(c?.start_date || c?.created_at, true)}`,
                            updated && `updated ${updated}`,
                        ].filter(Boolean).join(' · ')}
                    </p>
                </div>
                {error && <div className="pl-alert pl-alert-red">{error}</div>}

                <div className="pl-split">
                    <div className="pl-stack">
                        <section className="pl-hero" aria-labelledby="now-h">
                            {c === undefined ? (
                                <div className="pl-skel" style={{ height: 160 }} role="status" aria-label="Loading" />
                            ) : (
                                <>
                                    <div>
                                        <p className="pl-eyebrow">{finished ? 'Outcome' : 'Where it is now'}</p>
                                        <h2 id="now-h" className={`pl-stage-now ${finished ? 'done' : ''}`}>
                                            {finished ? finishedLabel(c) : c.stage_name || 'In progress'}
                                        </h2>
                                        {!finished && since && <div className="pl-row-sub">Since {formatDate(since, true)}</div>}
                                    </div>

                                    {waiting ? (
                                        <div className="pl-note pl-note-amber">
                                            <AlertCircle size={24} color="var(--pl-amber)" aria-hidden style={{ flex: 'none' }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p className="pl-note-t">We need something from you</p>
                                                <p className="pl-note-d">We asked you by WhatsApp or email. Reply there, or upload it here.</p>
                                                <Link to="/documents" className="pl-btn" style={{ marginTop: 12 }}>Upload a document</Link>
                                            </div>
                                        </div>
                                    ) : !finished ? (
                                        <div className="pl-note">
                                            <CheckCircle2 size={24} color="var(--pl-green)" aria-hidden style={{ flex: 'none' }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p className="pl-note-t">Nothing needed from you right now</p>
                                                <p className="pl-note-d">Our team is working on this step and will message you when it moves on.</p>
                                            </div>
                                        </div>
                                    ) : null}

                                    {stages.length > 0 && (
                                        <ol className="pl-vsteps" aria-label="All steps">
                                            {stages.map((s, i) => {
                                                const done = finished || (currentIndex >= 0 && i < currentIndex)
                                                const cur = !finished && i === currentIndex
                                                return (
                                                    <li key={s.id} className={done ? 'done' : ''} aria-current={cur ? 'step' : undefined}>
                                                        <div className="rail">
                                                            <span className="dot">{done && <Check size={14} strokeWidth={3} aria-hidden />}</span>
                                                            {i < stages.length - 1 && <span className="line" />}
                                                        </div>
                                                        <div className="txt">
                                                            <span>{s.name}</span>
                                                            {cur && <span className="pl-row-sub" style={{ marginTop: 0, fontWeight: 400 }}>Now</span>}
                                                            {done && <span className="pl-sr">completed</span>}
                                                        </div>
                                                    </li>
                                                )
                                            })}
                                        </ol>
                                    )}
                                </>
                            )}
                        </section>

                        <section className="pl-card" aria-labelledby="hist-h">
                            <div className="pl-card-h"><h2 id="hist-h">History</h2></div>
                            {historyError ? (
                                <div className="pl-empty" style={{ borderTop: 0 }}>
                                    We couldn't load the history.{' '}
                                    <button type="button" className="pl-link" onClick={() => window.location.reload()}>Try again</button>
                                </div>
                            ) : history === null ? (
                                <div style={{ padding: '4px 22px 22px' }}><div className="pl-skel" style={{ height: 40 }} role="status" aria-label="Loading" /></div>
                            ) : (
                                history.map((h, i) => (
                                    <div key={h.key} className="pl-row" style={i === 0 ? { borderTop: 0 } : undefined}>
                                        <div className="pl-row-t" style={{ whiteSpace: 'normal' }}>{h.text}</div>
                                        <span className="pl-row-sub" style={{ marginTop: 0, flex: 'none' }}>{formatDate(h.at, true)}</span>
                                    </div>
                                ))
                            )}
                        </section>
                    </div>

                    <div className="pl-stack">
                        <section className="pl-card" aria-labelledby="docs-h">
                            <div className="pl-card-h">
                                <h2 id="docs-h">Documents</h2>
                                <Link to="/documents" className="pl-link">See all</Link>
                            </div>
                            {docs === null ? (
                                <div style={{ padding: '4px 22px 22px' }}><div className="pl-skel" style={{ height: 40 }} role="status" aria-label="Loading" /></div>
                            ) : docs.length === 0 ? (
                                <div className="pl-empty" style={{ borderTop: 0, paddingTop: 12 }}>No documents on this application yet.</div>
                            ) : (
                                docs.slice(0, 6).map((d, i) => (
                                    <div key={d.id} className="pl-row" style={i === 0 ? { borderTop: 0 } : undefined}>
                                        <FileText size={22} color="var(--pl-muted)" strokeWidth={1.8} aria-hidden style={{ flex: 'none' }} />
                                        <div className="pl-row-t">
                                            <div className="pl-row-title" style={{ fontWeight: 500 }}>{d.name}</div>
                                            <div className="pl-row-sub">{[d.received_via, d.uploaded_at && `received ${formatDate(d.uploaded_at)}`].filter(Boolean).join(' · ')}</div>
                                        </div>
                                        <CheckCircle2 size={20} color="var(--pl-green)" role="img" aria-label="Received" style={{ flex: 'none' }} />
                                    </div>
                                ))
                            )}
                            <div style={{ padding: '6px 22px 22px' }}>
                                <Link to="/documents" className="pl-btn2" style={{ width: '100%', boxSizing: 'border-box' }}>Upload a document</Link>
                            </div>
                        </section>

                        <section className="pl-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }} aria-labelledby="ask-h">
                            <div>
                                <h2 id="ask-h" className="pl-card-title" style={{ fontSize: 19, fontWeight: 700 }}>Questions about this application?</h2>
                                {c?.case_reference && (
                                    <p className="pl-note-d" style={{ marginTop: 6, color: 'var(--pl-muted)' }}>
                                        Quote {c.case_reference} and the team will find it straight away.
                                    </p>
                                )}
                            </div>
                            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="pl-btn">Message us on WhatsApp</a>
                            <Link to={`/help?case=${caseId}`} className="pl-link" style={{ alignSelf: 'center', margin: '-8px 0' }}>Ask a question in the portal</Link>
                        </section>
                    </div>
                </div>
            </div>
        </PortalLayout>
    )
}
