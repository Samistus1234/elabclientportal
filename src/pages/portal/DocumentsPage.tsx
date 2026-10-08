import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PortalLayout from '@/components/portal/PortalLayout'
import { uploadClientDocument } from '@/lib/documentUpload'
import { formatDate, getMyDocuments, getMyWaitingCases, type MyDocument, type WaitingCase } from '@/lib/portalData'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB, as before
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx'

type UploadState = { name: string; status: 'uploading' | 'done' | 'failed'; error?: string }

export default function DocumentsPage() {
    const [docs, setDocs] = useState<MyDocument[] | null>(null)
    const [waiting, setWaiting] = useState<WaitingCase[]>([])
    const [uploads, setUploads] = useState<UploadState[]>([])
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const load = () =>
        getMyDocuments()
            .then(setDocs)
            .catch(() => {
                setDocs([])
                setError("We couldn't load your documents. Please refresh the page.")
            })

    useEffect(() => {
        load()
        getMyWaitingCases().then(setWaiting).catch(() => undefined)
    }, [])

    const onFiles = async (files: FileList | null) => {
        if (!files?.length) return
        const list = Array.from(files)
        setUploads((u) => [...list.map((f) => ({ name: f.name, status: 'uploading' as const })), ...u])
        for (const file of list) {
            const mark = (patch: Partial<UploadState>) =>
                setUploads((u) => u.map((x) => (x.name === file.name && x.status === 'uploading' ? { ...x, ...patch } : x)))
            if (file.size > MAX_FILE_SIZE) {
                mark({ status: 'failed', error: 'Larger than 10 MB' })
                continue
            }
            try {
                await uploadClientDocument(file)
                mark({ status: 'done' })
            } catch (e) {
                mark({ status: 'failed', error: e instanceof Error ? e.message : 'Upload failed' })
            }
        }
        if (inputRef.current) inputRef.current.value = ''
        load()
    }

    return (
        <PortalLayout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
                    <div style={{ flex: '1 1 260px' }}>
                        <h1 className="pl-h1">Documents</h1>
                        <div className="pl-sub">Everything eLab holds for you — whichever way you sent it.</div>
                    </div>
                    <button type="button" className="pl-btn" onClick={() => inputRef.current?.click()}>Upload a document</button>
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        accept={ACCEPT}
                        hidden
                        onChange={(e) => onFiles(e.target.files)}
                    />
                </div>
                <div className="pl-row-sub" style={{ marginTop: -8 }}>PDF, photo or Word file, up to 10 MB each.</div>

                {error && <div className="pl-alert pl-alert-red">{error}</div>}

                {uploads.length > 0 && (
                    <section className="pl-card" aria-live="polite">
                        <div className="pl-card-h"><h2>Uploads</h2></div>
                        {uploads.map((u, i) => (
                            <div key={`${u.name}-${i}`} className="pl-row">
                                <div className="pl-row-t">
                                    <div className="pl-row-title">{u.name}</div>
                                    {u.error && <div className="pl-row-sub" style={{ color: 'var(--pl-red)' }}>{u.error}</div>}
                                </div>
                                <span className={`pl-tag ${u.status === 'done' ? 'pl-tag-green' : u.status === 'failed' ? 'pl-tag-red' : 'pl-tag-grey'}`}>
                                    {u.status === 'done' ? 'Uploaded' : u.status === 'failed' ? 'Failed' : 'Uploading…'}
                                </span>
                            </div>
                        ))}
                    </section>
                )}

                {waiting.length > 0 && (
                    <section className="pl-card" style={{ borderLeft: '4px solid var(--pl-amber-line)' }}>
                        <div className="pl-card-h"><h2>Needed from you</h2></div>
                        {waiting.map((w) => (
                            <div key={w.case_id} className="pl-row">
                                <div className="pl-row-t">
                                    <div className="pl-row-title" style={{ whiteSpace: 'normal' }}>
                                        We've asked you for something for your {w.application_name || 'application'}
                                    </div>
                                    <div className="pl-row-sub">Check your WhatsApp or email from eLab{w.since ? ` (${formatDate(w.since)})` : ''}, then upload it here.</div>
                                </div>
                                <Link to={`/case/${w.case_id}`} className="pl-btn2 pl-btn-sm">Open</Link>
                            </div>
                        ))}
                    </section>
                )}

                <section className="pl-card" aria-labelledby="rec-h">
                    <div className="pl-card-h">
                        <h2 id="rec-h">Received</h2>
                        {docs && docs.length > 0 && <span className="pl-row-sub">{docs.length} {docs.length === 1 ? 'document' : 'documents'}</span>}
                    </div>
                    {docs === null ? (
                        <div style={{ padding: '4px 18px 18px' }}><div className="pl-skel" style={{ height: 56 }} /></div>
                    ) : docs.length === 0 ? (
                        <div className="pl-empty">We don't hold any documents for you yet.</div>
                    ) : (
                        docs.map((d) => (
                            <div key={d.id} className="pl-row">
                                <div className="pl-row-t">
                                    <div className="pl-row-title">{d.name}</div>
                                    <div className="pl-row-sub">
                                        {[d.received_via, formatDate(d.uploaded_at), d.application_name].filter(Boolean).join(' · ')}
                                    </div>
                                </div>
                                <span className="pl-tag pl-tag-green">Received</span>
                            </div>
                        ))
                    )}
                </section>
            </div>
        </PortalLayout>
    )
}
