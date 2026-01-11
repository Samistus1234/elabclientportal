import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
    supabase,
    getRecruiterInvoiceDetail,
    getPaymentBankAccounts,
    getPortalUserInfo,
    submitPaymentProof,
    uploadPaymentProof,
    type RecruiterInvoiceDetail as InvoiceDetail,
    type BankAccount,
    type PortalUserInfo
} from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FileText,
    ArrowLeft,
    LogOut,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Clock,
    CreditCard,
    Building2,
    Copy,
    Check,
    Upload,
    X,
    Calendar,
    User,
    Mail,
    Loader2
} from 'lucide-react'
import { format, parseISO, isPast } from 'date-fns'

const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$',
    NGN: '\u20A6',
    SAR: '\u0631.\u0633',
    AED: '\u062F.\u0625',
    GBP: '\u00A3',
    EUR: '\u20AC',
    CAD: 'C$',
    KWD: '\u062F.\u0643'
}

// Paystack integration
const PAYSTACK_PUBLIC_KEY = 'pk_live_611141c01b9589d73ff5eff313fc899d7377c534'

// Load Paystack script
const loadPaystackScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (document.getElementById('paystack-script')) {
            resolve()
            return
        }
        const script = document.createElement('script')
        script.id = 'paystack-script'
        script.src = 'https://js.paystack.co/v1/inline.js'
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load Paystack'))
        document.head.appendChild(script)
    })
}

export default function RecruiterInvoiceDetail() {
    const { invoiceId } = useParams<{ invoiceId: string }>()
    const navigate = useNavigate()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [portalUser, setPortalUser] = useState<PortalUserInfo | null>(null)
    const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [copiedField, setCopiedField] = useState<string | null>(null)

    // Payment proof modal state
    const [showProofModal, setShowProofModal] = useState(false)
    const [proofFile, setProofFile] = useState<File | null>(null)
    const [proofPreview, setProofPreview] = useState<string | null>(null)
    const [proofForm, setProofForm] = useState({
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        bankReference: '',
        payerName: '',
        payerNotes: ''
    })
    const [submittingProof, setSubmittingProof] = useState(false)
    const [proofError, setProofError] = useState<string | null>(null)
    const [proofSuccess, setProofSuccess] = useState(false)

    useEffect(() => {
        loadData()
    }, [invoiceId])

    const loadData = async () => {
        try {
            const { data: userInfo } = await getPortalUserInfo()
            if (!userInfo || userInfo.user_type !== 'recruiter') {
                navigate('/dashboard')
                return
            }
            setPortalUser(userInfo)

            if (!invoiceId) {
                navigate('/recruiter/invoices')
                return
            }

            const [invoiceResult, bankResult] = await Promise.all([
                getRecruiterInvoiceDetail(invoiceId),
                getPaymentBankAccounts()
            ])

            if (!invoiceResult.data) {
                navigate('/recruiter/invoices')
                return
            }

            setInvoice(invoiceResult.data)
            setBankAccounts(bankResult.data || [])
        } catch (err) {
            console.error('Error loading invoice:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadData()
        setRefreshing(false)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/login')
    }

    const copyToClipboard = async (text: string, field: string) => {
        await navigator.clipboard.writeText(text)
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 2000)
    }

    const formatCurrency = (amount: number, currency: string) => {
        const symbol = CURRENCY_SYMBOLS[currency] || currency
        return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const getStatusConfig = (status: string, dueDate: string | null) => {
        const isOverdue = dueDate && isPast(parseISO(dueDate)) && status !== 'paid'

        if (isOverdue || status === 'overdue') {
            return { label: 'Overdue', className: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle }
        }

        switch (status) {
            case 'paid':
                return { label: 'Paid', className: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 }
            case 'partial':
                return { label: 'Partial Payment', className: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock }
            case 'sent':
                return { label: 'Awaiting Payment', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock }
            case 'cancelled':
                return { label: 'Cancelled', className: 'bg-slate-100 text-slate-500 border-slate-200', icon: X }
            default:
                return { label: status, className: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText }
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setProofFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setProofPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmitProof = async () => {
        if (!proofFile || !invoice) return

        setSubmittingProof(true)
        setProofError(null)

        try {
            // Upload file first
            const { url, error: uploadError } = await uploadPaymentProof(proofFile, invoice.out_id)
            if (uploadError || !url) {
                throw new Error('Failed to upload proof file')
            }

            // Submit the payment proof
            const { error: submitError } = await submitPaymentProof({
                invoiceId: invoice.out_id,
                amountClaimed: invoice.out_amount_due,
                currency: invoice.out_currency,
                paymentDate: proofForm.paymentDate,
                bankReference: proofForm.bankReference || undefined,
                payerName: proofForm.payerName || portalUser?.company_name || `${portalUser?.first_name} ${portalUser?.last_name}`,
                payerNotes: proofForm.payerNotes || undefined,
                proofFileUrl: url,
                proofFileName: proofFile.name,
                proofFileType: proofFile.type
            })

            if (submitError) {
                throw submitError
            }

            setProofSuccess(true)
            setTimeout(() => {
                setShowProofModal(false)
                setProofSuccess(false)
                setProofFile(null)
                setProofPreview(null)
                setProofForm({
                    paymentDate: format(new Date(), 'yyyy-MM-dd'),
                    bankReference: '',
                    payerName: '',
                    payerNotes: ''
                })
                handleRefresh()
            }, 2000)
        } catch (err: any) {
            setProofError(err.message || 'Failed to submit payment proof')
        } finally {
            setSubmittingProof(false)
        }
    }

    const [paymentLoading, setPaymentLoading] = useState(false)

    const handlePayOnline = async () => {
        if (!invoice || !portalUser) return

        // If invoice has a direct payment link, use that
        if (invoice.out_payment_link) {
            window.open(invoice.out_payment_link, '_blank')
            return
        }

        setPaymentLoading(true)

        try {
            await loadPaystackScript()

            // @ts-ignore - PaystackPop is loaded from script
            const handler = window.PaystackPop.setup({
                key: PAYSTACK_PUBLIC_KEY,
                email: portalUser.email,
                amount: Math.round(invoice.out_amount_due * 100), // Paystack expects amount in kobo/cents
                currency: invoice.out_currency || 'NGN',
                ref: `${invoice.out_invoice_number}-${Date.now()}`,
                metadata: {
                    invoice_id: invoice.out_id,
                    invoice_number: invoice.out_invoice_number,
                    customer_name: invoice.out_person_name,
                    recruiter_company: portalUser.company_name
                },
                callback: (response: any) => {
                    // Payment successful
                    console.log('Payment successful:', response)
                    alert(`Payment successful! Reference: ${response.reference}`)
                    handleRefresh()
                },
                onClose: () => {
                    setPaymentLoading(false)
                }
            })

            handler.openIframe()
        } catch (error) {
            console.error('Failed to initialize Paystack:', error)
            alert('Failed to load payment gateway. Please try again.')
        } finally {
            setPaymentLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
                <div className="flex flex-col items-center gap-4">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                        <div className="w-16 h-16 rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                    </motion.div>
                    <p className="text-slate-600 font-medium">Loading invoice...</p>
                </div>
            </div>
        )
    }

    if (!invoice) {
        return null
    }

    const statusConfig = getStatusConfig(invoice.out_status, invoice.out_due_date)
    const StatusIcon = statusConfig.icon
    const isPaid = invoice.out_status === 'paid'
    const nairaBankAccount = bankAccounts.find(b => b.out_currency === 'NGN')

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-100/50 sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src="/elab-logo.png" alt="ELAB" className="h-10" />
                            <div className="hidden sm:block">
                                <h1 className="font-semibold text-slate-800">{invoice.out_invoice_number}</h1>
                                <p className="text-xs text-slate-500">Invoice Details</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Back Button */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
                <Link
                    to="/recruiter/invoices"
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Invoices
                </Link>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-8">
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Invoice Details - Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Invoice Header Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl shadow-sm p-6"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">{invoice.out_invoice_number}</h2>
                                    <p className="text-slate-500 mt-1">
                                        Issued on {format(parseISO(invoice.out_created_at), 'MMMM d, yyyy')}
                                    </p>
                                </div>
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${statusConfig.className}`}>
                                    <StatusIcon className="w-4 h-4" />
                                    <span className="font-medium">{statusConfig.label}</span>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid sm:grid-cols-2 gap-4 mb-6">
                                {invoice.out_due_date && (
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                        <Calendar className="w-5 h-5 text-slate-400" />
                                        <div>
                                            <p className="text-xs text-slate-500">Due Date</p>
                                            <p className="font-medium text-slate-800">
                                                {format(parseISO(invoice.out_due_date), 'MMMM d, yyyy')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {invoice.out_person_name && (
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                        <User className="w-5 h-5 text-slate-400" />
                                        <div>
                                            <p className="text-xs text-slate-500">Candidate</p>
                                            <p className="font-medium text-slate-800">{invoice.out_person_name}</p>
                                        </div>
                                    </div>
                                )}
                                {invoice.out_case_reference && (
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                        <FileText className="w-5 h-5 text-slate-400" />
                                        <div>
                                            <p className="text-xs text-slate-500">Case Reference</p>
                                            <p className="font-medium text-slate-800">{invoice.out_case_reference}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Line Items */}
                            <div className="border-t border-slate-100 pt-6">
                                <h3 className="font-semibold text-slate-800 mb-4">Line Items</h3>
                                <div className="space-y-3">
                                    {invoice.out_line_items.map((item, index) => (
                                        <div key={item.id || index} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-800">{item.description}</p>
                                                <p className="text-sm text-slate-500">
                                                    {item.quantity} x {formatCurrency(item.unit_price, invoice.out_currency)}
                                                </p>
                                            </div>
                                            <p className="font-semibold text-slate-800">
                                                {formatCurrency(item.line_total, invoice.out_currency)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="border-t border-slate-100 pt-4 mt-4 space-y-2">
                                <div className="flex justify-between text-slate-600">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(invoice.out_subtotal, invoice.out_currency)}</span>
                                </div>
                                {invoice.out_discount_amount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Discount</span>
                                        <span>-{formatCurrency(invoice.out_discount_amount, invoice.out_currency)}</span>
                                    </div>
                                )}
                                {invoice.out_tax_amount > 0 && (
                                    <div className="flex justify-between text-slate-600">
                                        <span>Tax</span>
                                        <span>{formatCurrency(invoice.out_tax_amount, invoice.out_currency)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold text-slate-800 pt-2 border-t border-slate-200">
                                    <span>Total</span>
                                    <span>{formatCurrency(invoice.out_total_amount, invoice.out_currency)}</span>
                                </div>
                                {invoice.out_amount_paid > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Amount Paid</span>
                                        <span>-{formatCurrency(invoice.out_amount_paid, invoice.out_currency)}</span>
                                    </div>
                                )}
                                {invoice.out_amount_due > 0 && (
                                    <div className="flex justify-between text-xl font-bold text-red-600 pt-2">
                                        <span>Amount Due</span>
                                        <span>{formatCurrency(invoice.out_amount_due, invoice.out_currency)}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Payment Proofs */}
                        {invoice.out_payment_proofs.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white rounded-2xl shadow-sm p-6"
                            >
                                <h3 className="font-semibold text-slate-800 mb-4">Payment Submissions</h3>
                                <div className="space-y-3">
                                    {invoice.out_payment_proofs.map((proof) => (
                                        <div key={proof.id} className="p-4 bg-slate-50 rounded-xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-xs px-2 py-1 rounded-full ${
                                                    proof.status === 'verified' ? 'bg-green-100 text-green-700' :
                                                    proof.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    proof.status === 'needs_info' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {proof.status === 'pending' ? 'Under Review' :
                                                     proof.status === 'verified' ? 'Verified' :
                                                     proof.status === 'rejected' ? 'Rejected' :
                                                     'Needs Info'}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {format(parseISO(proof.created_at), 'MMM d, yyyy')}
                                                </span>
                                            </div>
                                            <p className="font-medium text-slate-800">
                                                {formatCurrency(proof.amount_claimed, proof.currency)}
                                            </p>
                                            {proof.bank_reference && (
                                                <p className="text-sm text-slate-500">Ref: {proof.bank_reference}</p>
                                            )}
                                            {proof.reviewer_notes && (
                                                <p className="text-sm text-slate-600 mt-2 p-2 bg-white rounded">
                                                    {proof.reviewer_notes}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Payment Options - Right Column */}
                    <div className="space-y-6">
                        {!isPaid && (
                            <>
                                {/* Pay Online Card */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                            <CreditCard className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">Pay Online</h3>
                                            <p className="text-sm text-white/80">Instant payment via card</p>
                                        </div>
                                    </div>
                                    <p className="text-white/80 text-sm mb-4">
                                        Pay securely with credit/debit card via Paystack. Supports NGN, USD, and other currencies.
                                    </p>
                                    <button
                                        onClick={handlePayOnline}
                                        disabled={paymentLoading}
                                        className="w-full bg-white text-indigo-600 font-semibold py-3 px-4 rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {paymentLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                Pay {formatCurrency(invoice.out_amount_due, invoice.out_currency)}
                                                <CreditCard className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </motion.div>

                                {/* Bank Transfer Card */}
                                {nairaBankAccount && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="bg-white rounded-2xl shadow-sm p-6"
                                    >
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                                                <Building2 className="w-6 h-6 text-green-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg text-slate-800">Bank Transfer (NGN)</h3>
                                                <p className="text-sm text-slate-500">Direct bank payment</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-4">
                                            <div className="p-3 bg-slate-50 rounded-xl">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs text-slate-500">Bank Name</p>
                                                        <p className="font-medium text-slate-800">{nairaBankAccount.out_bank_name}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(nairaBankAccount.out_bank_name, 'bank')}
                                                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                                                    >
                                                        {copiedField === 'bank' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-slate-50 rounded-xl">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs text-slate-500">Account Name</p>
                                                        <p className="font-medium text-slate-800">{nairaBankAccount.out_account_name}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(nairaBankAccount.out_account_name, 'name')}
                                                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                                                    >
                                                        {copiedField === 'name' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-slate-50 rounded-xl">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs text-slate-500">Account Number</p>
                                                        <p className="font-bold text-lg text-slate-800">{nairaBankAccount.out_account_number}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(nairaBankAccount.out_account_number, 'number')}
                                                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                                                    >
                                                        {copiedField === 'number' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                                                <p className="text-xs text-amber-700 font-medium">Payment Reference</p>
                                                <div className="flex items-center justify-between">
                                                    <p className="font-bold text-amber-800">{invoice.out_invoice_number}</p>
                                                    <button
                                                        onClick={() => copyToClipboard(invoice.out_invoice_number, 'ref')}
                                                        className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
                                                    >
                                                        {copiedField === 'ref' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-amber-600" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-xs text-slate-500 mb-4">
                                            Use the invoice number as your payment reference. After making payment, submit your proof below.
                                        </p>

                                        <button
                                            onClick={() => setShowProofModal(true)}
                                            className="w-full bg-green-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Submit Payment Proof
                                        </button>
                                    </motion.div>
                                )}
                            </>
                        )}

                        {/* Invoice Notes */}
                        {invoice.out_notes && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-white rounded-2xl shadow-sm p-6"
                            >
                                <h3 className="font-semibold text-slate-800 mb-3">Notes</h3>
                                <p className="text-slate-600 text-sm">{invoice.out_notes}</p>
                            </motion.div>
                        )}

                        {/* Contact Support */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-slate-50 rounded-2xl p-6"
                        >
                            <h3 className="font-semibold text-slate-800 mb-2">Need Help?</h3>
                            <p className="text-sm text-slate-600 mb-3">
                                If you have questions about this invoice, please contact our team.
                            </p>
                            <a
                                href="mailto:headoffice@elabsolution.org"
                                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                            >
                                <Mail className="w-4 h-4" />
                                headoffice@elabsolution.org
                            </a>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Payment Proof Modal */}
            <AnimatePresence>
                {showProofModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => !submittingProof && setShowProofModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-100">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-slate-800">Submit Payment Proof</h3>
                                    <button
                                        onClick={() => !submittingProof && setShowProofModal(false)}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-slate-500" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                {proofSuccess ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-slate-800 mb-2">Proof Submitted!</h4>
                                        <p className="text-slate-600">
                                            Your payment proof has been submitted for review.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {proofError && (
                                            <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm">
                                                {proofError}
                                            </div>
                                        )}

                                        {/* File Upload */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Payment Receipt / Screenshot *
                                            </label>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*,.pdf"
                                                onChange={handleFileSelect}
                                                className="hidden"
                                            />
                                            {proofPreview ? (
                                                <div className="relative">
                                                    <img
                                                        src={proofPreview}
                                                        alt="Proof preview"
                                                        className="w-full h-48 object-cover rounded-xl"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            setProofFile(null)
                                                            setProofPreview(null)
                                                        }}
                                                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                                                >
                                                    <Upload className="w-8 h-8 text-slate-400" />
                                                    <span className="text-sm text-slate-600">
                                                        Click to upload proof
                                                    </span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Payment Date */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Payment Date *
                                            </label>
                                            <input
                                                type="date"
                                                value={proofForm.paymentDate}
                                                onChange={(e) => setProofForm({ ...proofForm, paymentDate: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                            />
                                        </div>

                                        {/* Bank Reference */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Bank Reference / Transaction ID
                                            </label>
                                            <input
                                                type="text"
                                                value={proofForm.bankReference}
                                                onChange={(e) => setProofForm({ ...proofForm, bankReference: e.target.value })}
                                                placeholder="e.g., TRF123456789"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                            />
                                        </div>

                                        {/* Payer Name */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Payer Name
                                            </label>
                                            <input
                                                type="text"
                                                value={proofForm.payerName}
                                                onChange={(e) => setProofForm({ ...proofForm, payerName: e.target.value })}
                                                placeholder={portalUser?.company_name || `${portalUser?.first_name} ${portalUser?.last_name}`}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                            />
                                        </div>

                                        {/* Notes */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Additional Notes
                                            </label>
                                            <textarea
                                                value={proofForm.payerNotes}
                                                onChange={(e) => setProofForm({ ...proofForm, payerNotes: e.target.value })}
                                                placeholder="Any additional information..."
                                                rows={3}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none resize-none"
                                            />
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            onClick={handleSubmitProof}
                                            disabled={!proofFile || submittingProof}
                                            className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {submittingProof ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-5 h-5" />
                                                    Submit Proof
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer */}
            <footer className="border-t border-slate-100 bg-white/50 py-6 mt-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
                    <p className="text-sm text-slate-400">
                        Need help? Contact{' '}
                        <a href="mailto:headoffice@elabsolution.org" className="text-indigo-600 hover:underline">
                            headoffice@elabsolution.org
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    )
}
