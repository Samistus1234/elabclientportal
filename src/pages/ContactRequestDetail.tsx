import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
    FileText, ArrowLeft, Clock, CheckCircle2,
    Download, DollarSign, File, User, AlertCircle,
    ExternalLink, Loader2, RefreshCcw
} from 'lucide-react'
import { supabase, getUser } from '@/lib/supabase'

// Types
interface VerificationRequestDetail {
    id: string
    request_reference: string
    dataflow_case_number: string | null
    external_reference: string | null
    status: string
    priority: string
    requested_at: string
    sent_to_contact_at: string | null
    completed_at: string | null
    internal_notes: string | null
    contact_notes: string | null
    case_reference: string | null
    applicant_name: string | null
    institution_name: string
    institution_code: string
    documents: Document[]
    payments: Payment[]
}

interface Document {
    id: string
    document_type: string
    name: string
    description: string | null
    mime_type: string | null
    size_bytes: number | null
    uploaded_at: string
    storage_path: string
}

interface Payment {
    id: string
    payment_type: string
    description: string | null
    amount: number
    currency: string
    status: string
    paid_by: string | null
    payment_date: string | null
    payment_reference: string | null
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    pending: { label: 'Pending', color: 'text-amber-700', bgColor: 'bg-amber-50' },
    sent_to_contact: { label: 'Awaiting Your Review', color: 'text-blue-700', bgColor: 'bg-blue-50' },
    in_progress: { label: 'In Progress', color: 'text-indigo-700', bgColor: 'bg-indigo-50' },
    verification_sent: { label: 'Verification Sent', color: 'text-purple-700', bgColor: 'bg-purple-50' },
    completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-50' },
    rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-50' },
    cancelled: { label: 'Cancelled', color: 'text-slate-700', bgColor: 'bg-slate-50' },
}

const paymentTypeLabels: Record<string, string> = {
    official_fee: 'Official Fee',
    facilitation_fee: 'Facilitation Fee',
    processing_fee: 'Processing Fee',
    courier_fee: 'Courier Fee',
    other: 'Other',
}

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'text-amber-600' },
    paid: { label: 'Paid', color: 'text-blue-600' },
    confirmed: { label: 'Confirmed', color: 'text-green-600' },
    refunded: { label: 'Refunded', color: 'text-slate-600' },
}

export default function ContactRequestDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [request, setRequest] = useState<VerificationRequestDetail | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [contactId, setContactId] = useState<string | null>(null)
    const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null)

    useEffect(() => {
        loadRequest()
    }, [id])

    const loadRequest = async () => {
        if (!id) return

        setIsLoading(true)
        setError(null)

        try {
            // Check auth
            const { user, error: authError } = await getUser()
            if (authError || !user) {
                navigate('/login')
                return
            }

            // Get portal user info
            const { data: portalUser, error: portalError } = await supabase
                .from('portal_users')
                .select('institutional_contact_id, user_type')
                .eq('auth_user_id', user.id)
                .single()

            if (portalError || !portalUser || portalUser.user_type !== 'institutional_contact') {
                setError('Access denied')
                return
            }

            setContactId(portalUser.institutional_contact_id)

            // Get request details
            const { data: requestData, error: requestError } = await supabase
                .from('verification_requests')
                .select(`
                    id, request_reference, dataflow_case_number, external_reference,
                    status, priority, requested_at, sent_to_contact_at, completed_at,
                    internal_notes, contact_notes,
                    institution:institutions(name, code),
                    case:cases(case_reference)
                `)
                .eq('id', id)
                .eq('contact_id', portalUser.institutional_contact_id)
                .single()

            if (requestError || !requestData) {
                setError('Request not found or access denied')
                return
            }

            // Get documents visible to contact
            const { data: documents } = await supabase
                .from('verification_request_documents')
                .select('id, document_type, name, description, mime_type, size_bytes, uploaded_at, storage_path')
                .eq('verification_request_id', id)
                .eq('visible_to_contact', true)
                .order('uploaded_at', { ascending: false })

            // Get payments
            const { data: payments } = await supabase
                .from('verification_request_payments')
                .select('id, payment_type, description, amount, currency, status, paid_by, payment_date, payment_reference')
                .eq('verification_request_id', id)
                .order('created_at', { ascending: false })

            const formattedRequest: VerificationRequestDetail = {
                id: requestData.id,
                request_reference: requestData.request_reference,
                dataflow_case_number: requestData.dataflow_case_number,
                external_reference: requestData.external_reference,
                status: requestData.status,
                priority: requestData.priority,
                requested_at: requestData.requested_at,
                sent_to_contact_at: requestData.sent_to_contact_at,
                completed_at: requestData.completed_at,
                internal_notes: requestData.internal_notes,
                contact_notes: requestData.contact_notes,
                case_reference: (requestData.case as any)?.case_reference || null,
                applicant_name: null, // Person data fetched separately to avoid join issues
                institution_name: (requestData.institution as any)?.name || '',
                institution_code: (requestData.institution as any)?.code || '',
                documents: documents || [],
                payments: payments || [],
            }

            setRequest(formattedRequest)

        } catch (err: any) {
            setError(err.message || 'Failed to load request')
        } finally {
            setIsLoading(false)
        }
    }

    const handleStatusUpdate = async (newStatus: string) => {
        if (!request || !contactId) return

        setIsUpdating(true)

        try {
            const { error: updateError } = await supabase
                .from('verification_requests')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString(),
                    ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
                })
                .eq('id', request.id)
                .eq('contact_id', contactId)

            if (updateError) throw updateError

            // Log activity
            await supabase.from('activity_log').insert({
                org_id: (await supabase.from('institutional_contacts').select('org_id').eq('id', contactId).single()).data?.org_id,
                action: 'verification_request_status_updated_by_contact',
                entity_type: 'verification_request',
                entity_id: request.id,
                metadata: {
                    contact_id: contactId,
                    old_status: request.status,
                    new_status: newStatus,
                },
            })

            // Trigger notification
            try {
                await supabase.functions.invoke('verification-request-notification', {
                    body: {
                        type: 'contact_response',
                        verification_request_id: request.id,
                        metadata: {
                            old_status: request.status,
                            new_status: newStatus,
                        },
                    },
                })
            } catch (e) {
                console.warn('Notification failed:', e)
            }

            // Reload request
            await loadRequest()

        } catch (err: any) {
            setError(err.message || 'Failed to update status')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDownloadDocument = async (doc: Document) => {
        setDownloadingDoc(doc.id)

        try {
            const { data, error } = await supabase.storage
                .from('verification-documents')
                .createSignedUrl(doc.storage_path, 3600)

            if (error) throw error

            // Open in new tab
            window.open(data.signedUrl, '_blank')
        } catch (err: any) {
            console.error('Download failed:', err)
            alert('Failed to download document')
        } finally {
            setDownloadingDoc(null)
        }
    }

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return 'Unknown size'
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                    <p className="text-slate-600">Loading request details...</p>
                </div>
            </div>
        )
    }

    if (error || !request) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6">
                <div className="glass-card rounded-2xl p-8 max-w-md text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Error</h2>
                    <p className="text-slate-600 mb-6">{error || 'Request not found'}</p>
                    <Link
                        to="/contact/dashboard"
                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        )
    }

    const canUpdateStatus = ['sent_to_contact', 'in_progress'].includes(request.status)

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
            {/* Header */}
            <header className="glass-card border-b border-slate-200/50 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
                    <Link
                        to="/contact/dashboard"
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold text-slate-800">{request.request_reference}</h1>
                        <p className="text-sm text-slate-500">{request.institution_name}</p>
                    </div>
                    <button
                        onClick={loadRequest}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <RefreshCcw className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                {/* Status & Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-xl p-6 mb-6"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusConfig[request.status]?.bgColor} ${statusConfig[request.status]?.color}`}>
                                {statusConfig[request.status]?.label || request.status}
                            </span>
                            {request.priority !== 'normal' && (
                                <span className="text-sm font-medium text-orange-600">
                                    {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)} Priority
                                </span>
                            )}
                        </div>

                        {canUpdateStatus && (
                            <div className="flex items-center gap-2">
                                {request.status === 'sent_to_contact' && (
                                    <button
                                        onClick={() => handleStatusUpdate('in_progress')}
                                        disabled={isUpdating}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                                        Mark In Progress
                                    </button>
                                )}
                                {request.status === 'in_progress' && (
                                    <>
                                        <button
                                            onClick={() => handleStatusUpdate('verification_sent')}
                                            disabled={isUpdating}
                                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                                        >
                                            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                                            Mark Verification Sent
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate('completed')}
                                            disabled={isUpdating}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            Mark Complete
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Request Details */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
                >
                    {/* Left Column - Request Info */}
                    <div className="glass-card rounded-xl p-6">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-600" />
                            Request Information
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-slate-500">Request Reference</p>
                                <p className="font-medium text-slate-800">{request.request_reference}</p>
                            </div>

                            {request.dataflow_case_number && (
                                <div>
                                    <p className="text-sm text-slate-500">DataFlow Case Number</p>
                                    <p className="font-medium text-slate-800">{request.dataflow_case_number}</p>
                                </div>
                            )}

                            {request.external_reference && (
                                <div>
                                    <p className="text-sm text-slate-500">External Reference</p>
                                    <p className="font-medium text-slate-800">{request.external_reference}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-sm text-slate-500">Requested On</p>
                                <p className="font-medium text-slate-800">
                                    {new Date(request.requested_at).toLocaleDateString('en-US', {
                                        year: 'numeric', month: 'long', day: 'numeric'
                                    })}
                                </p>
                            </div>

                            {request.completed_at && (
                                <div>
                                    <p className="text-sm text-slate-500">Completed On</p>
                                    <p className="font-medium text-green-600">
                                        {new Date(request.completed_at).toLocaleDateString('en-US', {
                                            year: 'numeric', month: 'long', day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Applicant Info */}
                    <div className="glass-card rounded-xl p-6">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-emerald-600" />
                            Applicant Information
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-slate-500">Applicant Name</p>
                                <p className="font-medium text-slate-800">{request.applicant_name || 'Not specified'}</p>
                            </div>

                            {request.case_reference && (
                                <div>
                                    <p className="text-sm text-slate-500">Case Reference</p>
                                    <p className="font-medium text-slate-800">{request.case_reference}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-sm text-slate-500">Institution</p>
                                <p className="font-medium text-slate-800">{request.institution_name}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Documents Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card rounded-xl p-6 mb-6"
                >
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <File className="w-5 h-5 text-emerald-600" />
                        Documents ({request.documents.length})
                    </h3>

                    {request.documents.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No documents available</p>
                    ) : (
                        <div className="space-y-3">
                            {request.documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800">{doc.name}</p>
                                            <p className="text-sm text-slate-500">
                                                {doc.document_type} • {formatFileSize(doc.size_bytes)}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDownloadDocument(doc)}
                                        disabled={downloadingDoc === doc.id}
                                        className="flex items-center gap-2 px-4 py-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {downloadingDoc === doc.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Download className="w-4 h-4" />
                                        )}
                                        Download
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Payments Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-card rounded-xl p-6"
                >
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        Payments ({request.payments.length})
                    </h3>

                    {request.payments.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No payment records</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left border-b border-slate-200">
                                        <th className="pb-3 text-sm font-medium text-slate-500">Type</th>
                                        <th className="pb-3 text-sm font-medium text-slate-500">Amount</th>
                                        <th className="pb-3 text-sm font-medium text-slate-500">Status</th>
                                        <th className="pb-3 text-sm font-medium text-slate-500">Paid By</th>
                                        <th className="pb-3 text-sm font-medium text-slate-500">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {request.payments.map((payment) => (
                                        <tr key={payment.id} className="border-b border-slate-100">
                                            <td className="py-3">
                                                <p className="font-medium text-slate-800">
                                                    {paymentTypeLabels[payment.payment_type] || payment.payment_type}
                                                </p>
                                                {payment.description && (
                                                    <p className="text-sm text-slate-500">{payment.description}</p>
                                                )}
                                            </td>
                                            <td className="py-3 font-medium text-slate-800">
                                                {payment.currency} {payment.amount.toLocaleString()}
                                            </td>
                                            <td className="py-3">
                                                <span className={`text-sm font-medium ${paymentStatusConfig[payment.status]?.color}`}>
                                                    {paymentStatusConfig[payment.status]?.label || payment.status}
                                                </span>
                                            </td>
                                            <td className="py-3 text-sm text-slate-600 capitalize">
                                                {payment.paid_by || '-'}
                                            </td>
                                            <td className="py-3 text-sm text-slate-600">
                                                {payment.payment_date
                                                    ? new Date(payment.payment_date).toLocaleDateString()
                                                    : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-sm text-slate-500">
                <p>&copy; {new Date().getFullYear()} ELAB Solutions International. All rights reserved.</p>
            </footer>
        </div>
    )
}
