import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PortalLayout from '@/components/portal/PortalLayout'
import {
    formatDate, getMyCases, getMyPerson, getMyTickets,
    type MyCase, type MyPerson, type MyTicket,
} from '@/lib/portalData'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const WHATSAPP_URL = 'https://wa.me/2348165634195'

const STATUS: Record<string, { label: string; cls: string }> = {
    new: { label: 'With our team', cls: 'pl-tag-blue' },
    open: { label: 'With our team', cls: 'pl-tag-blue' },
    pending: { label: 'Waiting for you', cls: 'pl-tag-amber' },
    on_hold: { label: 'On hold', cls: 'pl-tag-grey' },
    solved: { label: 'Resolved', cls: 'pl-tag-green' },
    closed: { label: 'Resolved', cls: 'pl-tag-green' },
}

const TOPICS = [
    { value: 'case_status', label: 'Where my application is' },
    { value: 'documents', label: 'Documents' },
    { value: 'payment', label: 'Payments and invoices' },
    { value: 'technical', label: 'Problem with this website' },
    { value: 'general', label: 'Something else' },
]

export default function Help() {
    const [params] = useSearchParams()
    const [person, setPerson] = useState<MyPerson | null>(null)
    const [cases, setCases] = useState<MyCase[]>([])
    const [tickets, setTickets] = useState<MyTicket[] | null>(null)
    const [caseId, setCaseId] = useState(params.get('case') || '')
    const [topic, setTopic] = useState('case_status')
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const loadTickets = () => getMyTickets().then(setTickets).catch(() => setTickets([]))

    useEffect(() => {
        getMyPerson().then(setPerson).catch(() => undefined)
        getMyCases()
            .then((cs) => {
                setCases(cs)
                setCaseId((cur) => cur || cs[0]?.id || '')
            })
            .catch(() => undefined)
        loadTickets()
    }, [])

    const send = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        if (!subject.trim() || !message.trim()) {
            setError('Add a subject and your question, then send.')
            return
        }
        if (!person?.email) {
            setError("We couldn't find your email on file. Please message us on WhatsApp instead.")
            return
        }
        setSending(true)
        try {
            const chosen = cases.find((c) => c.id === caseId)
            const res = await fetch(`${SUPABASE_URL}/functions/v1/public-ticket-submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
                body: JSON.stringify({
                    email: person.email.toLowerCase().trim(),
                    name: [person.first_name, person.last_name].filter(Boolean).join(' ') || person.email,
                    phone: person.phone || null,
                    subject: subject.trim(),
                    description: message.trim(),
                    category: topic,
                    case_reference: chosen?.case_reference || null,
                    attachments: null,
                }),
            })
            const result = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(result.error || 'Could not send your question.')
            setSent(result.ticket_number || 'sent')
            setSubject('')
            setMessage('')
            loadTickets()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not send your question. Please try again.')
        } finally {
            setSending(false)
        }
    }

    return (
        <PortalLayout>
            <div style={{ display: 'grid', gap: 16 }} className="lg:grid-cols-2">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
                    <div>
                        <h1 className="pl-h1">Help</h1>
                        <div className="pl-sub">Ask us anything about your application.</div>
                    </div>

                    <form className="pl-card pl-card-pad" onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                            <h2 className="pl-card-title">Ask a question</h2>
                            {person && (
                                <div className="pl-row-sub" style={{ marginTop: 2 }}>
                                    From {[person.first_name, person.last_name].filter(Boolean).join(' ')} · we reply to {person.email}
                                </div>
                            )}
                        </div>
                        {cases.length > 0 && (
                            <div>
                                <label className="pl-label" htmlFor="help-case">About</label>
                                <select id="help-case" className="pl-input" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
                                    {cases.map((c) => (
                                        <option key={c.id} value={c.id}>{c.pipeline_name || 'Application'} ({c.case_reference})</option>
                                    ))}
                                    <option value="">Not about one application</option>
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="pl-label" htmlFor="help-topic">Topic</label>
                            <select id="help-topic" className="pl-input" value={topic} onChange={(e) => setTopic(e.target.value)}>
                                {TOPICS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="pl-label" htmlFor="help-subject">Subject</label>
                            <input id="help-subject" className="pl-input" value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={160} />
                        </div>
                        <div>
                            <label className="pl-label" htmlFor="help-msg">Your question</label>
                            <textarea id="help-msg" className="pl-input" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required style={{ resize: 'vertical' }} />
                        </div>
                        {error && <div className="pl-alert pl-alert-red" role="alert">{error}</div>}
                        {sent && (
                            <div className="pl-alert pl-alert-green" role="status">
                                Sent{sent !== 'sent' ? ` — your reference is ${sent}` : ''}. We'll reply by email.
                            </div>
                        )}
                        <div>
                            <button type="submit" className="pl-btn" disabled={sending}>
                                {sending ? 'Sending…' : 'Send'}
                            </button>
                        </div>
                    </form>

                    <div className="pl-card pl-card-pad" style={{ fontSize: 14, lineHeight: '21px' }}>
                        <b>WhatsApp</b> · <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="pl-link" style={{ fontSize: 14 }}>+234 816 563 4195</a>
                        <br />
                        <b>Email</b> · <a href="mailto:headoffice@elabsolution.org" className="pl-link" style={{ fontSize: 14 }}>headoffice@elabsolution.org</a>
                    </div>
                </div>

                <section className="pl-card lg:mt-[62px]" style={{ alignSelf: 'start', minWidth: 0 }} aria-labelledby="q-h">
                    <div className="pl-card-h"><h2 id="q-h">Your questions</h2></div>
                    {tickets === null ? (
                        <div style={{ padding: '4px 18px 18px' }}><div className="pl-skel" style={{ height: 40 }} role="status" aria-label="Loading" /></div>
                    ) : tickets.length === 0 ? (
                        <div className="pl-empty">You haven't asked us anything here yet.</div>
                    ) : (
                        tickets.map((t) => {
                            const st = STATUS[t.status] || { label: t.status, cls: 'pl-tag-grey' }
                            return (
                                <div key={t.id} className="pl-row">
                                    <div className="pl-row-t">
                                        <div className="pl-row-title">{t.subject}</div>
                                        <div className="pl-row-sub">{t.ticket_number} · {formatDate(t.created_at)}</div>
                                    </div>
                                    <span className={`pl-tag ${st.cls}`}>{st.label}</span>
                                </div>
                            )
                        })
                    )}
                </section>
            </div>
        </PortalLayout>
    )
}
