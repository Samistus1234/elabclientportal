import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PortalLayout from '@/components/portal/PortalLayout'
import { formatDate, formatMoney, getMyInvoices, type MyInvoice } from '@/lib/portalData'

/** Receipt links come from the server; only ever open an https URL. */
function safeReceiptUrl(url: string | null) {
    if (!url) return null
    try {
        return new URL(url).protocol === 'https:' ? url : null
    } catch {
        return null
    }
}

export default function Payments() {
    const [invoices, setInvoices] = useState<MyInvoice[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        getMyInvoices()
            .then(setInvoices)
            .catch(() => {
                setInvoices([])
                setError("We couldn't load your invoices. Please refresh the page.")
            })
    }, [])

    const toPay = (invoices || []).filter((i) => Number(i.amount_due) > 0)
    const paid = (invoices || []).filter((i) => Number(i.amount_due) <= 0)
    const overdue = (i: MyInvoice) => !!i.due_date && new Date(i.due_date) < new Date(new Date().toDateString())

    return (
        <PortalLayout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 }}>
                <div>
                    <h1 className="pl-h1">Payments</h1>
                    <div className="pl-sub">Your invoices and receipts.</div>
                </div>
                {error && <div className="pl-alert pl-alert-red">{error}</div>}

                {invoices === null ? (
                    <div className="pl-card pl-card-pad"><div className="pl-skel" style={{ height: 64 }} role="status" aria-label="Loading" /></div>
                ) : invoices.length === 0 ? (
                    <div className="pl-card"><div className="pl-empty" style={{ borderTop: 0 }}>You have no invoices yet.</div></div>
                ) : (
                    <>
                        <section className="pl-card" aria-labelledby="pay-h">
                            <div className="pl-card-h"><h2 id="pay-h">To pay</h2></div>
                            {toPay.length === 0 ? (
                                <div className="pl-empty">Nothing to pay — you're all settled.</div>
                            ) : (
                                toPay.map((i) => (
                                    <div key={i.id} className="pl-row" style={{ flexWrap: 'wrap' }}>
                                        <div className="pl-row-t" style={{ flexBasis: 200 }}>
                                            <div className="pl-row-title">{i.invoice_number}{i.application_name ? ` · ${i.application_name}` : ''}</div>
                                            <div className="pl-row-sub">
                                                {Number(i.amount_paid) > 0 ? `${formatMoney(i.amount_paid, i.currency)} paid · ` : ''}
                                                {i.due_date ? (overdue(i) ? `Was due ${formatDate(i.due_date)}` : `Due ${formatDate(i.due_date)}`) : 'Sent ' + formatDate(i.issue_date)}
                                            </div>
                                        </div>
                                        {i.status === 'pending_verification' ? (
                                            <span className="pl-tag pl-tag-blue">Payment being checked</span>
                                        ) : overdue(i) && <span className="pl-tag pl-tag-amber">Overdue</span>}
                                        <b className="pl-num">{formatMoney(i.amount_due, i.currency)}</b>
                                        <Link to={`/pay/${i.id}`} className="pl-btn pl-btn-sm">Pay</Link>
                                    </div>
                                ))
                            )}
                        </section>

                        {paid.length > 0 && (
                            <section className="pl-card" aria-labelledby="paid-h">
                                <div className="pl-card-h"><h2 id="paid-h">Paid</h2></div>
                                {paid.map((i) => (
                                    <div key={i.id} className="pl-row" style={{ flexWrap: 'wrap' }}>
                                        <div className="pl-row-t" style={{ flexBasis: 200 }}>
                                            <div className="pl-row-title">{i.invoice_number}{i.application_name ? ` · ${i.application_name}` : ''}</div>
                                            <div className="pl-row-sub">{i.paid_date ? `Paid ${formatDate(i.paid_date)}` : 'Paid'}</div>
                                        </div>
                                        <b className="pl-num">{formatMoney(i.total, i.currency)}</b>
                                        {safeReceiptUrl(i.receipt_url) ? (
                                            <a href={safeReceiptUrl(i.receipt_url)!} target="_blank" rel="noreferrer" className="pl-link">Receipt</a>
                                        ) : (
                                            <Link to={`/pay/${i.id}`} className="pl-link">View</Link>
                                        )}
                                    </div>
                                ))}
                            </section>
                        )}
                    </>
                )}
            </div>
        </PortalLayout>
    )
}
