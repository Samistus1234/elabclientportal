import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FileText,
    CheckCircle2,
    Clock,
    CreditCard,
    Building2,
    Copy,
    Check,
    Upload,
    X,
    AlertCircle,
    Loader2,
    Shield,
    Mail,
    Phone,
    Globe,
    ArrowRight,
    Lock
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

// Paystack USD payment link (for international payments)
const PAYSTACK_USD_PAYMENT_LINK = 'https://paystack.shop/pay/elab-usd-payment'

// Paystack fee calculation
// NGN: 1.5% + ₦100 (capped at ₦2,000)
// USD: 3.9% + $0.30
// Other currencies: 3.9% (international cards)
const calculatePaystackFee = (amount: number, currency: string): { fee: number; total: number; percentage: string } => {
    let fee = 0
    let percentage = ''

    if (currency === 'NGN') {
        // Nigerian cards: 1.5% + ₦100, capped at ₦2,000
        fee = (amount * 0.015) + 100
        if (fee > 2000) fee = 2000
        percentage = '1.5%'
    } else if (currency === 'USD') {
        // USD: 3.9% + $0.30
        fee = (amount * 0.039) + 0.30
        percentage = '3.9%'
    } else {
        // International/Other: 3.9%
        fee = amount * 0.039
        percentage = '3.9%'
    }

    // Round to 2 decimal places
    fee = Math.round(fee * 100) / 100
    const total = Math.round((amount + fee) * 100) / 100

    return { fee, total, percentage }
}

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

interface PublicInvoice {
    id: string
    invoice_number: string
    currency: string
    subtotal: number
    discount_amount: number
    tax_amount: number
    total_amount: number
    amount_paid: number
    amount_due: number
    status: string
    due_date: string | null
    notes: string | null
    created_at: string
    customer_name: string | null
    customer_email: string | null
    case_reference: string | null
    org_name: string | null
    line_items: Array<{
        description: string
        quantity: number
        unit_price: number
        line_total: number
    }>
}

interface BankAccount {
    id: string
    bank_name: string
    account_name: string
    account_number: string
    routing_code: string | null
    swift_code: string | null
    currency: string
    notes: string | null
}

export default function PayInvoice() {
    const { invoiceId } = useParams<{ invoiceId: string }>()
    const [searchParams] = useSearchParams()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [invoice, setInvoice] = useState<PublicInvoice | null>(null)
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [copiedField, setCopiedField] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'card' | 'bank'>('card')

    // Payment proof state
    const [showProofModal, setShowProofModal] = useState(false)
    const [proofFile, setProofFile] = useState<File | null>(null)
    const [proofPreview, setProofPreview] = useState<string | null>(null)
    const [proofForm, setProofForm] = useState({
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        bankReference: '',
        payerName: '',
        payerEmail: '',
        payerNotes: ''
    })
    const [submittingProof, setSubmittingProof] = useState(false)
    const [proofError, setProofError] = useState<string | null>(null)
    const [proofSuccess, setProofSuccess] = useState(false)

    // Paystack state
    const [paymentLoading, setPaymentLoading] = useState(false)
    const [paymentSuccess, setPaymentSuccess] = useState(false)
    const [paymentReference, setPaymentReference] = useState<string | null>(null)

    useEffect(() => {
        loadInvoice()
    }, [invoiceId])

    const loadInvoice = async () => {
        if (!invoiceId) {
            setError('Invalid invoice link')
            setLoading(false)
            return
        }

        try {
            // Call public RPC function to get invoice data
            const { data, error: fetchError } = await supabase.rpc('get_public_invoice', {
                p_invoice_id: invoiceId
            })

            if (fetchError) {
                console.error('Error fetching invoice:', fetchError)
                setError('Invoice not found or access denied')
                setLoading(false)
                return
            }

            if (!data || (Array.isArray(data) && data.length === 0)) {
                setError('Invoice not found')
                setLoading(false)
                return
            }

            const invoiceData = Array.isArray(data) ? data[0] : data
            setInvoice(invoiceData)

            // Get bank accounts for payment
            const { data: bankData } = await supabase.rpc('get_public_bank_accounts', {
                p_currency: invoiceData.currency
            })
            setBankAccounts(bankData || [])

            // Pre-fill payer info from URL params if available
            const email = searchParams.get('email')
            const name = searchParams.get('name')
            if (email || name) {
                setProofForm(prev => ({
                    ...prev,
                    payerEmail: email || invoiceData.customer_email || '',
                    payerName: name || invoiceData.customer_name || ''
                }))
            } else {
                setProofForm(prev => ({
                    ...prev,
                    payerEmail: invoiceData.customer_email || '',
                    payerName: invoiceData.customer_name || ''
                }))
            }

        } catch (err) {
            console.error('Error:', err)
            setError('Failed to load invoice')
        } finally {
            setLoading(false)
        }
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
            return { label: 'Overdue', className: 'bg-red-50 text-red-700 border border-red-200', icon: AlertCircle }
        }

        switch (status) {
            case 'paid':
                return { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: CheckCircle2 }
            case 'partial':
                return { label: 'Partial', className: 'bg-amber-50 text-amber-700 border border-amber-200', icon: Clock }
            case 'sent':
            case 'viewed':
                return { label: 'Pending', className: 'bg-sky-50 text-sky-700 border border-sky-200', icon: Clock }
            case 'cancelled':
                return { label: 'Cancelled', className: 'bg-slate-50 text-slate-500 border border-slate-200', icon: X }
            default:
                return { label: status, className: 'bg-slate-50 text-slate-700 border border-slate-200', icon: FileText }
        }
    }

    const handlePayWithCard = async () => {
        if (!invoice) return

        setPaymentLoading(true)

        try {
            await loadPaystackScript()

            const payerEmail = proofForm.payerEmail || invoice.customer_email || 'customer@example.com'

            // Calculate fee - charge customer the total (invoice + fee)
            const feeInfo = calculatePaystackFee(invoice.amount_due, invoice.currency || 'NGN')

            // @ts-ignore - PaystackPop is loaded from script
            const handler = window.PaystackPop.setup({
                key: PAYSTACK_PUBLIC_KEY,
                email: payerEmail,
                amount: Math.round(feeInfo.total * 100), // Paystack expects amount in kobo/cents - charge total with fee
                currency: invoice.currency || 'NGN',
                ref: `${invoice.invoice_number}-${Date.now()}`,
                metadata: {
                    invoice_id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    customer_name: invoice.customer_name,
                    invoice_amount: invoice.amount_due,
                    processing_fee: feeInfo.fee,
                    custom_fields: [
                        {
                            display_name: "Invoice Number",
                            variable_name: "invoice_number",
                            value: invoice.invoice_number
                        },
                        {
                            display_name: "Processing Fee",
                            variable_name: "processing_fee",
                            value: `${feeInfo.percentage} (${invoice.currency} ${feeInfo.fee})`
                        }
                    ]
                },
                callback: function(response: any) {
                    console.log('Payment successful:', response)
                    setPaymentReference(response.reference)

                    // Record the payment in the database (record original invoice amount, not the fee)
                    supabase.rpc('record_public_paystack_payment', {
                        p_invoice_id: invoice.id,
                        p_paystack_reference: response.reference,
                        p_amount: invoice.amount_due, // Record original invoice amount
                        p_currency: invoice.currency || 'NGN',
                        p_payer_email: payerEmail
                    }).then(({ error: recordError }) => {
                        if (recordError) {
                            console.error('Error recording payment:', recordError)
                        }
                    })

                    setPaymentSuccess(true)
                    setPaymentLoading(false)
                },
                onClose: function() {
                    setPaymentLoading(false)
                }
            })

            handler.openIframe()
        } catch (error) {
            console.error('Failed to initialize Paystack:', error)
            alert('Failed to load payment gateway. Please try again or use bank transfer.')
            setPaymentLoading(false)
        }
    }

    // Handle USD payment via Paystack payment link
    const handlePayWithUSDLink = () => {
        if (!invoice) return

        const payerEmail = proofForm.payerEmail || invoice.customer_email || ''
        const feeInfo = calculatePaystackFee(invoice.amount_due, 'USD')

        // Build payment link URL with query parameters
        // Paystack payment links accept: amount (in cents), email, and custom_fields
        const params = new URLSearchParams({
            amount: String(Math.round(feeInfo.total * 100)), // Amount in cents
            email: payerEmail,
            'metadata[invoice_id]': invoice.id,
            'metadata[invoice_number]': invoice.invoice_number,
            'metadata[customer_name]': invoice.customer_name || '',
            'metadata[invoice_amount]': String(invoice.amount_due),
            'metadata[processing_fee]': String(feeInfo.fee)
        })

        // Open Paystack USD payment link in new tab
        window.open(`${PAYSTACK_USD_PAYMENT_LINK}?${params.toString()}`, '_blank')
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setProofError('File size must be less than 5MB')
                return
            }
            setProofFile(file)
            setProofError(null)
            const reader = new FileReader()
            reader.onloadend = () => {
                setProofPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmitProof = async () => {
        if (!proofFile || !invoice) return

        if (!proofForm.payerEmail) {
            setProofError('Please enter your email address')
            return
        }

        setSubmittingProof(true)
        setProofError(null)

        try {
            // Upload file to storage
            const fileExt = proofFile.name.split('.').pop()
            const fileName = `public-proofs/${invoice.id}/${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(fileName, proofFile, { upsert: false })

            if (uploadError) {
                throw new Error('Failed to upload proof file')
            }

            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(fileName)

            // Submit proof via RPC
            const { error: submitError } = await supabase.rpc('submit_public_payment_proof', {
                p_invoice_id: invoice.id,
                p_amount_claimed: invoice.amount_due,
                p_currency: invoice.currency,
                p_payment_date: proofForm.paymentDate,
                p_bank_reference: proofForm.bankReference || null,
                p_payer_name: proofForm.payerName || null,
                p_payer_email: proofForm.payerEmail,
                p_payer_notes: proofForm.payerNotes || null,
                p_proof_file_url: publicUrl,
                p_proof_file_name: proofFile.name
            })

            if (submitError) {
                throw submitError
            }

            setProofSuccess(true)
            setTimeout(() => {
                setShowProofModal(false)
                loadInvoice() // Refresh invoice data
            }, 3000)

        } catch (err: any) {
            console.error('Error submitting proof:', err)
            setProofError(err.message || 'Failed to submit payment proof. Please try again.')
        } finally {
            setSubmittingProof(false)
        }
    }

    // ── Loading State ──
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8f7f4]">
                <div className="flex flex-col items-center gap-5">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    >
                        <div className="w-12 h-12 rounded-full border-[3px] border-[#e5e2db] border-t-[#0c1220]" />
                    </motion.div>
                    <p className="text-sm text-[#8b8680] tracking-wide uppercase font-medium" style={{ fontFamily: "'Georgia', serif" }}>
                        Loading invoice...
                    </p>
                </div>
            </div>
        )
    }

    // ── Error State ──
    if (error || !invoice) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8f7f4]">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-[#e5e2db] p-10 max-w-md text-center"
                >
                    <div className="w-px h-8 bg-[#b8860b] mx-auto mb-6" />
                    <h1 className="text-xl font-semibold text-[#0c1220] mb-3" style={{ fontFamily: "'Georgia', serif" }}>
                        Invoice Not Found
                    </h1>
                    <p className="text-sm text-[#64748b] mb-8 leading-relaxed">
                        {error || 'This invoice could not be found or may have been removed.'}
                    </p>
                    <a
                        href="mailto:headoffice@elabsolution.org"
                        className="inline-flex items-center gap-2 text-[#b8860b] hover:text-[#96700a] text-sm font-medium transition-colors"
                    >
                        <Mail className="w-4 h-4" />
                        Contact Support
                    </a>
                </motion.div>
            </div>
        )
    }

    // ── Payment Success Screen ──
    if (paymentSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8f7f4]">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white border border-[#e5e2db] p-10 max-w-md text-center"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </motion.div>
                    <h1 className="text-2xl font-semibold text-[#0c1220] mb-3" style={{ fontFamily: "'Georgia', serif" }}>
                        Payment Received
                    </h1>
                    <p className="text-sm text-[#64748b] mb-6 leading-relaxed">
                        Thank you for your payment. A confirmation will be sent to your email shortly.
                    </p>
                    {paymentReference && (
                        <div className="bg-[#faf9f7] border border-[#e5e2db] p-4 mb-6">
                            <p className="text-[10px] uppercase tracking-[1.5px] text-[#8b8680] mb-1">Payment Reference</p>
                            <p className="font-mono font-semibold text-[#0c1220]">{paymentReference}</p>
                        </div>
                    )}
                    <div className="text-xs text-[#8b8680]">
                        Invoice <span className="font-semibold text-[#0c1220]">{invoice.invoice_number}</span>
                    </div>
                </motion.div>
            </div>
        )
    }

    const statusConfig = getStatusConfig(invoice.status, invoice.due_date)
    const StatusIcon = statusConfig.icon
    const isPaid = invoice.status === 'paid'
    const nairaBankAccount = bankAccounts.find(b => b.currency === 'NGN' || b.currency === invoice.currency)

    return (
        <div className="min-h-screen bg-[#f8f7f4]">

            {/* ── Header ── */}
            <header className="bg-[#0c1220] text-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    {/* Gold accent line */}
                    <div className="h-[3px] bg-[#b8860b] -mx-4 sm:-mx-6" />

                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                            <img src="/elab-logo.png" alt="ELAB" className="h-9 brightness-0 invert opacity-90" />
                            <div className="hidden sm:block">
                                <h1 className="text-sm font-semibold tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
                                    Elab Solutions International
                                </h1>
                                <p className="text-[9px] uppercase tracking-[2px] text-[#b8860b]">
                                    Secure Payment Portal
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-white/50">
                            <Lock className="w-3.5 h-3.5 text-[#b8860b]" />
                            <span className="hidden sm:inline uppercase tracking-wider text-[10px]">256-bit Encrypted</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Main Content ── */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
                <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">

                    {/* ── Invoice Summary — Left Column ── */}
                    <div className="lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-[#e5e2db] sticky top-8"
                        >
                            {/* Top gold accent */}
                            <div className="h-[3px] bg-[#b8860b]" />

                            <div className="p-6">
                                {/* Invoice header */}
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[2px] text-[#b8860b] font-medium mb-1">Invoice</p>
                                        <p className="font-mono text-sm font-semibold text-[#0c1220]">{invoice.invoice_number}</p>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-sm ${statusConfig.className}`}>
                                        <StatusIcon className="w-3 h-3" />
                                        {statusConfig.label}
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="space-y-3 mb-6">
                                    {invoice.customer_name && (
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-[11px] uppercase tracking-wider text-[#8b8680]">Client</span>
                                            <span className="text-sm font-medium text-[#0c1220]">{invoice.customer_name}</span>
                                        </div>
                                    )}
                                    {invoice.due_date && (
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-[11px] uppercase tracking-wider text-[#8b8680]">Due Date</span>
                                            <span className="text-sm font-medium text-[#0c1220]">
                                                {format(parseISO(invoice.due_date), 'MMM d, yyyy')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Divider */}
                                <div className="border-t border-[#e5e2db] mb-5" />

                                {/* Line Items */}
                                <div className="mb-5">
                                    <p className="text-[10px] uppercase tracking-[1.5px] text-[#b8860b] font-medium mb-3">Services</p>
                                    <div className="space-y-2.5">
                                        {invoice.line_items?.map((item, index) => (
                                            <div key={index} className="flex justify-between items-baseline gap-4">
                                                <span className="text-[13px] text-[#374151] leading-snug">{item.description}</span>
                                                <span className="text-[13px] font-semibold text-[#0c1220] tabular-nums whitespace-nowrap">
                                                    {formatCurrency(item.line_total, invoice.currency)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Totals */}
                                <div className="border-t border-[#e5e2db] pt-4 space-y-2">
                                    <div className="flex justify-between text-[13px]">
                                        <span className="text-[#8b8680]">Subtotal</span>
                                        <span className="tabular-nums">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                                    </div>
                                    {invoice.discount_amount > 0 && (
                                        <div className="flex justify-between text-[13px] text-emerald-600">
                                            <span>Discount</span>
                                            <span className="tabular-nums">-{formatCurrency(invoice.discount_amount, invoice.currency)}</span>
                                        </div>
                                    )}
                                    {invoice.tax_amount > 0 && (
                                        <div className="flex justify-between text-[13px]">
                                            <span className="text-[#8b8680]">Tax</span>
                                            <span className="tabular-nums">{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
                                        </div>
                                    )}
                                    {invoice.amount_paid > 0 && (
                                        <div className="flex justify-between text-[13px] text-emerald-600">
                                            <span>Amount Paid</span>
                                            <span className="tabular-nums">-{formatCurrency(invoice.amount_paid, invoice.currency)}</span>
                                        </div>
                                    )}

                                    {/* Bold separator before total */}
                                    <div className="border-t-2 border-[#0c1220] !mt-3 !mb-2" />

                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[10px] uppercase tracking-[1px] font-bold text-[#8b8680]">Amount Due</span>
                                        <span className="text-xl font-bold text-[#0c1220] tabular-nums" style={{ fontFamily: "'Georgia', serif" }}>
                                            {formatCurrency(invoice.amount_due, invoice.currency)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* ── Payment Options — Right Column ── */}
                    <div className="lg:col-span-3">
                        {isPaid ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white border border-emerald-200 p-10 text-center"
                            >
                                <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-5">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-[#0c1220] mb-2" style={{ fontFamily: "'Georgia', serif" }}>
                                    Invoice Paid in Full
                                </h2>
                                <p className="text-sm text-[#64748b]">This invoice has been settled. Thank you for your payment.</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="space-y-5"
                            >
                                {/* Payment Method Card */}
                                <div className="bg-white border border-[#e5e2db] overflow-hidden">
                                    {/* Tabs */}
                                    {(() => {
                                        const tabFeeInfo = calculatePaystackFee(invoice.amount_due, invoice.currency)
                                        return (
                                            <div className="flex border-b border-[#e5e2db]">
                                                <button
                                                    onClick={() => setActiveTab('card')}
                                                    className={`flex-1 flex items-center justify-center gap-3 py-4 text-sm font-medium transition-all relative ${
                                                        activeTab === 'card'
                                                            ? 'text-[#0c1220] bg-white'
                                                            : 'text-[#8b8680] hover:text-[#64748b] bg-[#faf9f7]'
                                                    }`}
                                                >
                                                    {activeTab === 'card' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#b8860b]" />}
                                                    <CreditCard className="w-4 h-4" />
                                                    <div className="text-left">
                                                        <div className="text-[13px] font-semibold">Pay with Card</div>
                                                        <div className="text-[11px] font-normal opacity-60">
                                                            {formatCurrency(tabFeeInfo.total, invoice.currency)}
                                                        </div>
                                                    </div>
                                                </button>
                                                <div className="w-px bg-[#e5e2db]" />
                                                <button
                                                    onClick={() => setActiveTab('bank')}
                                                    className={`flex-1 flex items-center justify-center gap-3 py-4 text-sm font-medium transition-all relative ${
                                                        activeTab === 'bank'
                                                            ? 'text-[#0c1220] bg-white'
                                                            : 'text-[#8b8680] hover:text-[#64748b] bg-[#faf9f7]'
                                                    }`}
                                                >
                                                    {activeTab === 'bank' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#b8860b]" />}
                                                    <Building2 className="w-4 h-4" />
                                                    <div className="text-left">
                                                        <div className="text-[13px] font-semibold">Bank Transfer</div>
                                                        <div className="text-[11px] font-normal opacity-60">
                                                            {formatCurrency(invoice.amount_due, invoice.currency)} (No Fee)
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>
                                        )
                                    })()}

                                    {/* ── Card Payment Tab ── */}
                                    {activeTab === 'card' && (() => {
                                        const feeInfo = calculatePaystackFee(invoice.amount_due, invoice.currency)
                                        const isUSD = invoice.currency === 'USD'
                                        return (
                                            <div className="p-6 sm:p-8">
                                                <div className="text-center mb-8">
                                                    <div className="w-14 h-14 bg-[#faf9f7] border border-[#e5e2db] rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <CreditCard className="w-6 h-6 text-[#0c1220]" />
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-[#0c1220] mb-2" style={{ fontFamily: "'Georgia', serif" }}>
                                                        Debit / Credit Card
                                                        {isUSD && <span className="ml-2 px-2 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-medium border border-sky-200 uppercase tracking-wider">USD</span>}
                                                    </h3>
                                                    <p className="text-[13px] text-[#8b8680] max-w-xs mx-auto leading-relaxed">
                                                        {isUSD
                                                            ? 'Secure international payment. Accepts Visa, Mastercard, and international cards.'
                                                            : 'Secure payment powered by Paystack. Supports Visa, Mastercard, and Verve.'
                                                        }
                                                    </p>
                                                </div>

                                                {/* Fee Breakdown */}
                                                <div className="bg-[#faf9f7] border border-[#e5e2db] p-5 mb-6 space-y-3">
                                                    <div className="flex justify-between text-[13px]">
                                                        <span className="text-[#64748b]">Invoice Amount</span>
                                                        <span className="font-medium text-[#0c1220] tabular-nums">{formatCurrency(invoice.amount_due, invoice.currency)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[13px]">
                                                        <span className="text-[#64748b]">
                                                            Processing Fee ({feeInfo.percentage})
                                                            <span className="text-[11px] text-[#8b8680] ml-1">(Paystack)</span>
                                                        </span>
                                                        <span className="font-medium text-[#b8860b] tabular-nums">+{formatCurrency(feeInfo.fee, invoice.currency)}</span>
                                                    </div>
                                                    <div className="border-t border-[#e5e2db] pt-3">
                                                        <div className="flex justify-between items-baseline">
                                                            <span className="text-[10px] uppercase tracking-[1px] font-bold text-[#64748b]">Total to Pay</span>
                                                            <span className="text-lg font-bold text-[#0c1220] tabular-nums" style={{ fontFamily: "'Georgia', serif" }}>
                                                                {formatCurrency(feeInfo.total, invoice.currency)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Email Input */}
                                                <div className="mb-5">
                                                    <label className="block text-[11px] uppercase tracking-wider text-[#8b8680] font-medium mb-2">
                                                        Email for Receipt
                                                    </label>
                                                    <input
                                                        type="email"
                                                        value={proofForm.payerEmail}
                                                        onChange={(e) => setProofForm({ ...proofForm, payerEmail: e.target.value })}
                                                        placeholder="your@email.com"
                                                        className="w-full px-4 py-3 border border-[#e5e2db] bg-white focus:border-[#b8860b] focus:ring-1 focus:ring-[#b8860b]/20 transition-all outline-none text-sm text-[#0c1220] placeholder:text-[#c4c0b8]"
                                                    />
                                                </div>

                                                {/* Pay Button */}
                                                {isUSD ? (
                                                    <button
                                                        onClick={handlePayWithUSDLink}
                                                        disabled={!proofForm.payerEmail}
                                                        className="w-full bg-[#0c1220] text-white font-semibold py-4 px-6 hover:bg-[#1a2538] transition-colors flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed text-sm tracking-wide"
                                                    >
                                                        PAY {formatCurrency(feeInfo.total, invoice.currency)}
                                                        <ArrowRight className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={handlePayWithCard}
                                                        disabled={paymentLoading || !proofForm.payerEmail}
                                                        className="w-full bg-[#0c1220] text-white font-semibold py-4 px-6 hover:bg-[#1a2538] transition-colors flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed text-sm tracking-wide"
                                                    >
                                                        {paymentLoading ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                Processing...
                                                            </>
                                                        ) : (
                                                            <>
                                                                PAY {formatCurrency(feeInfo.total, invoice.currency)}
                                                                <ArrowRight className="w-4 h-4" />
                                                            </>
                                                        )}
                                                    </button>
                                                )}

                                                {/* Card logos */}
                                                <div className="flex items-center justify-center gap-3 mt-5">
                                                    <span className="px-3 py-1 bg-[#faf9f7] border border-[#e5e2db] text-[#0c1220] text-[10px] font-bold tracking-wider">VISA</span>
                                                    <span className="px-3 py-1 bg-[#faf9f7] border border-[#e5e2db] text-[#0c1220] text-[10px] font-bold tracking-wider">MASTERCARD</span>
                                                    {!isUSD && <span className="px-3 py-1 bg-[#faf9f7] border border-[#e5e2db] text-[#0c1220] text-[10px] font-bold tracking-wider">VERVE</span>}
                                                    {isUSD && <span className="px-3 py-1 bg-[#faf9f7] border border-[#e5e2db] text-[#0c1220] text-[10px] font-bold tracking-wider">AMEX</span>}
                                                </div>

                                                <p className="text-[11px] text-[#8b8680] text-center mt-4">
                                                    Processing fee is charged by Paystack for card transactions
                                                </p>
                                            </div>
                                        )
                                    })()}

                                    {/* ── Bank Transfer Tab ── */}
                                    {activeTab === 'bank' && nairaBankAccount && (
                                        <div className="p-6 sm:p-8">
                                            <div className="text-center mb-8">
                                                <div className="w-14 h-14 bg-[#faf9f7] border border-[#e5e2db] rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Building2 className="w-6 h-6 text-[#0c1220]" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-[#0c1220] mb-1" style={{ fontFamily: "'Georgia', serif" }}>
                                                    Bank Transfer
                                                </h3>
                                                <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200 uppercase tracking-wider mb-3">
                                                    No Processing Fee
                                                </span>
                                                <p className="text-[13px] text-[#8b8680] max-w-xs mx-auto leading-relaxed">
                                                    Transfer to the account below and submit your payment proof.
                                                </p>
                                            </div>

                                            {/* Bank Details */}
                                            <div className="space-y-3 mb-6">
                                                {/* Bank Name */}
                                                <div className="flex items-center justify-between p-4 bg-[#faf9f7] border border-[#e5e2db]">
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-[1.5px] text-[#8b8680] mb-0.5">Bank</p>
                                                        <p className="text-sm font-semibold text-[#0c1220]">{nairaBankAccount.bank_name}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(nairaBankAccount.bank_name, 'bank')}
                                                        className="p-2 hover:bg-[#e5e2db] transition-colors"
                                                    >
                                                        {copiedField === 'bank' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#8b8680]" />}
                                                    </button>
                                                </div>

                                                {/* Account Name */}
                                                <div className="flex items-center justify-between p-4 bg-[#faf9f7] border border-[#e5e2db]">
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-[1.5px] text-[#8b8680] mb-0.5">Account Name</p>
                                                        <p className="text-sm font-semibold text-[#0c1220]">{nairaBankAccount.account_name}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(nairaBankAccount.account_name, 'name')}
                                                        className="p-2 hover:bg-[#e5e2db] transition-colors"
                                                    >
                                                        {copiedField === 'name' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#8b8680]" />}
                                                    </button>
                                                </div>

                                                {/* Account Number — Highlighted */}
                                                <div className="flex items-center justify-between p-4 bg-[#0c1220] border border-[#0c1220]">
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-[1.5px] text-[#b8860b] mb-0.5">Account Number</p>
                                                        <p className="text-xl font-bold text-white tracking-wide tabular-nums" style={{ fontFamily: "'Georgia', serif" }}>
                                                            {nairaBankAccount.account_number}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(nairaBankAccount.account_number, 'number')}
                                                        className="p-2 hover:bg-white/10 transition-colors"
                                                    >
                                                        {copiedField === 'number' ? <Check className="w-5 h-5 text-[#b8860b]" /> : <Copy className="w-5 h-5 text-white/60" />}
                                                    </button>
                                                </div>

                                                {/* Payment Reference */}
                                                <div className="flex items-center justify-between p-4 bg-amber-50/60 border border-[#b8860b]/20">
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-[1.5px] text-[#b8860b] font-semibold mb-0.5">
                                                            Payment Reference (Required)
                                                        </p>
                                                        <p className="text-sm font-bold text-[#0c1220]">{invoice.invoice_number}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(invoice.invoice_number, 'ref')}
                                                        className="p-2 hover:bg-[#b8860b]/10 transition-colors"
                                                    >
                                                        {copiedField === 'ref' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#b8860b]" />}
                                                    </button>
                                                </div>

                                                {/* Amount */}
                                                <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-200/60">
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-[1.5px] text-emerald-700 mb-0.5">Amount to Transfer</p>
                                                        <p className="text-lg font-bold text-[#0c1220] tabular-nums" style={{ fontFamily: "'Georgia', serif" }}>
                                                            {formatCurrency(invoice.amount_due, invoice.currency)}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(invoice.amount_due.toString(), 'amount')}
                                                        className="p-2 hover:bg-emerald-100 transition-colors"
                                                    >
                                                        {copiedField === 'amount' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-600" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Submit Proof Button */}
                                            <button
                                                onClick={() => setShowProofModal(true)}
                                                className="w-full bg-[#0c1220] text-white font-semibold py-4 px-6 hover:bg-[#1a2538] transition-colors flex items-center justify-center gap-2.5 text-sm tracking-wide"
                                            >
                                                <Upload className="w-4 h-4" />
                                                I'VE PAID — SUBMIT PROOF
                                            </button>
                                        </div>
                                    )}

                                    {activeTab === 'bank' && !nairaBankAccount && (
                                        <div className="p-8 text-center">
                                            <p className="text-sm text-[#8b8680]">Bank transfer details not available for this currency.</p>
                                            <p className="text-[13px] text-[#64748b] mt-2">Please use card payment or contact support.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Security Notice */}
                                <div className="bg-white border border-[#e5e2db] p-5 flex items-start gap-4">
                                    <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Shield className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[#0c1220] mb-1" style={{ fontFamily: "'Georgia', serif" }}>
                                            Secure Payment
                                        </p>
                                        <p className="text-[13px] text-[#64748b] leading-relaxed">
                                            Your payment information is encrypted and secure. We never store your card details.
                                        </p>
                                    </div>
                                </div>

                                {/* Contact Support */}
                                <div className="bg-white border border-[#e5e2db] p-5">
                                    <p className="text-[10px] uppercase tracking-[1.5px] text-[#b8860b] font-medium mb-3">Need Assistance?</p>
                                    <div className="flex items-center justify-between">
                                        <a href="mailto:headoffice@elabsolution.org" className="flex items-center gap-2 text-[13px] text-[#0c1220] hover:text-[#b8860b] transition-colors font-medium">
                                            <Mail className="w-3.5 h-3.5 text-[#8b8680]" />
                                            headoffice@elabsolution.org
                                        </a>
                                        <a href="tel:+2348168634195" className="flex items-center gap-2 text-[13px] text-[#0c1220] hover:text-[#b8860b] transition-colors font-medium">
                                            <Phone className="w-3.5 h-3.5 text-[#8b8680]" />
                                            +234 816 863 4195
                                        </a>
                                    </div>
                                </div>

                                {/* Legal Links */}
                                <div className="text-center text-[11px] text-[#8b8680] space-x-4">
                                    <a href="/privacy" className="hover:text-[#b8860b] transition-colors">Privacy</a>
                                    <span className="text-[#e5e2db]">|</span>
                                    <a href="/terms" className="hover:text-[#b8860b] transition-colors">Terms</a>
                                    <span className="text-[#e5e2db]">|</span>
                                    <a href="/support/refund-policy" className="hover:text-[#b8860b] transition-colors">Refund Policy</a>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Payment Proof Modal ── */}
            <AnimatePresence>
                {showProofModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[#0c1220]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => !submittingProof && !proofSuccess && setShowProofModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white border border-[#e5e2db] max-w-md w-full max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal gold accent */}
                            <div className="h-[3px] bg-[#b8860b]" />

                            {/* Header */}
                            <div className="p-6 border-b border-[#e5e2db]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-[#0c1220]" style={{ fontFamily: "'Georgia', serif" }}>
                                            Submit Payment Proof
                                        </h3>
                                        <p className="text-[12px] text-[#8b8680] mt-0.5">
                                            Invoice {invoice.invoice_number}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => !submittingProof && !proofSuccess && setShowProofModal(false)}
                                        disabled={submittingProof || proofSuccess}
                                        className="p-2 hover:bg-[#faf9f7] transition-colors disabled:opacity-50"
                                    >
                                        <X className="w-5 h-5 text-[#8b8680]" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-5">
                                {proofSuccess ? (
                                    <div className="text-center py-8">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring' }}
                                            className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-5"
                                        >
                                            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                        </motion.div>
                                        <h4 className="text-lg font-semibold text-[#0c1220] mb-2" style={{ fontFamily: "'Georgia', serif" }}>
                                            Proof Submitted
                                        </h4>
                                        <p className="text-[13px] text-[#64748b] leading-relaxed">
                                            Your payment proof has been submitted. We'll verify it within 24-48 hours and send you a confirmation.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {proofError && (
                                            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
                                                {proofError}
                                            </div>
                                        )}

                                        {/* File Upload */}
                                        <div>
                                            <label className="block text-[11px] uppercase tracking-wider text-[#8b8680] font-medium mb-2">
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
                                                    {proofFile?.type?.includes('image') ? (
                                                        <img
                                                            src={proofPreview}
                                                            alt="Proof preview"
                                                            className="w-full h-48 object-cover border border-[#e5e2db]"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-48 bg-[#faf9f7] border border-[#e5e2db] flex items-center justify-center">
                                                            <div className="text-center">
                                                                <FileText className="w-10 h-10 text-[#8b8680] mx-auto mb-2" />
                                                                <p className="text-sm text-[#64748b]">{proofFile?.name}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setProofFile(null)
                                                            setProofPreview(null)
                                                        }}
                                                        className="absolute top-2 right-2 p-1.5 bg-[#0c1220] text-white hover:bg-[#1a2538] transition-colors"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-full h-32 border-2 border-dashed border-[#e5e2db] flex flex-col items-center justify-center gap-2 hover:border-[#b8860b] hover:bg-[#faf9f7] transition-all"
                                                >
                                                    <Upload className="w-6 h-6 text-[#8b8680]" />
                                                    <span className="text-[13px] text-[#64748b] font-medium">
                                                        Click to upload receipt
                                                    </span>
                                                    <span className="text-[11px] text-[#8b8680]">
                                                        Image or PDF, max 5MB
                                                    </span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label className="block text-[11px] uppercase tracking-wider text-[#8b8680] font-medium mb-2">
                                                Your Email *
                                            </label>
                                            <input
                                                type="email"
                                                value={proofForm.payerEmail}
                                                onChange={(e) => setProofForm({ ...proofForm, payerEmail: e.target.value })}
                                                placeholder="your@email.com"
                                                className="w-full px-4 py-3 border border-[#e5e2db] bg-white focus:border-[#b8860b] focus:ring-1 focus:ring-[#b8860b]/20 transition-all outline-none text-sm text-[#0c1220] placeholder:text-[#c4c0b8]"
                                            />
                                        </div>

                                        {/* Payment Date */}
                                        <div>
                                            <label className="block text-[11px] uppercase tracking-wider text-[#8b8680] font-medium mb-2">
                                                Payment Date *
                                            </label>
                                            <input
                                                type="date"
                                                value={proofForm.paymentDate}
                                                onChange={(e) => setProofForm({ ...proofForm, paymentDate: e.target.value })}
                                                className="w-full px-4 py-3 border border-[#e5e2db] bg-white focus:border-[#b8860b] focus:ring-1 focus:ring-[#b8860b]/20 transition-all outline-none text-sm text-[#0c1220]"
                                            />
                                        </div>

                                        {/* Bank Reference */}
                                        <div>
                                            <label className="block text-[11px] uppercase tracking-wider text-[#8b8680] font-medium mb-2">
                                                Bank Reference / Transaction ID
                                            </label>
                                            <input
                                                type="text"
                                                value={proofForm.bankReference}
                                                onChange={(e) => setProofForm({ ...proofForm, bankReference: e.target.value })}
                                                placeholder="e.g., TRF123456789"
                                                className="w-full px-4 py-3 border border-[#e5e2db] bg-white focus:border-[#b8860b] focus:ring-1 focus:ring-[#b8860b]/20 transition-all outline-none text-sm text-[#0c1220] placeholder:text-[#c4c0b8]"
                                            />
                                        </div>

                                        {/* Name */}
                                        <div>
                                            <label className="block text-[11px] uppercase tracking-wider text-[#8b8680] font-medium mb-2">
                                                Your Name
                                            </label>
                                            <input
                                                type="text"
                                                value={proofForm.payerName}
                                                onChange={(e) => setProofForm({ ...proofForm, payerName: e.target.value })}
                                                placeholder="Full name"
                                                className="w-full px-4 py-3 border border-[#e5e2db] bg-white focus:border-[#b8860b] focus:ring-1 focus:ring-[#b8860b]/20 transition-all outline-none text-sm text-[#0c1220] placeholder:text-[#c4c0b8]"
                                            />
                                        </div>

                                        {/* Submit */}
                                        <button
                                            onClick={handleSubmitProof}
                                            disabled={!proofFile || !proofForm.payerEmail || submittingProof}
                                            className="w-full bg-[#0c1220] text-white font-semibold py-4 px-4 hover:bg-[#1a2538] transition-colors flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed text-sm tracking-wide"
                                        >
                                            {submittingProof ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-4 h-4" />
                                                    SUBMIT PAYMENT PROOF
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

            {/* ── Footer ── */}
            <footer className="bg-[#0c1220] mt-16">
                <div className="h-[3px] bg-[#b8860b]" />
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-center sm:text-left">
                            <p className="text-sm text-white/80 font-medium" style={{ fontFamily: "'Georgia', serif" }}>
                                Elab Solutions International, LLC
                            </p>
                            <p className="text-[10px] uppercase tracking-[2px] text-[#b8860b] mt-1">
                                Healthcare Credentialing & Global Placement
                            </p>
                        </div>
                        <div className="flex items-center gap-6 text-[11px] text-white/40">
                            <div className="flex items-center gap-1.5">
                                <Globe className="w-3 h-3" />
                                <span>elabsolution.org</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3" />
                                <span>+234 816 863 4195</span>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
