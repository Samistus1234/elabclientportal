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
    Mail
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
            return { label: 'Overdue', className: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle }
        }

        switch (status) {
            case 'paid':
                return { label: 'Paid', className: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 }
            case 'partial':
                return { label: 'Partial Payment', className: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock }
            case 'sent':
            case 'viewed':
                return { label: 'Awaiting Payment', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock }
            case 'cancelled':
                return { label: 'Cancelled', className: 'bg-slate-100 text-slate-500 border-slate-200', icon: X }
            default:
                return { label: status, className: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText }
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

    if (error || !invoice) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-800 mb-2">Invoice Not Found</h1>
                    <p className="text-slate-600 mb-6">
                        {error || 'This invoice could not be found or may have been removed.'}
                    </p>
                    <a
                        href="mailto:headoffice@elabsolution.org"
                        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        <Mail className="w-4 h-4" />
                        Contact Support
                    </a>
                </div>
            </div>
        )
    }

    // Payment success screen
    if (paymentSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Payment Successful!</h1>
                    <p className="text-slate-600 mb-4">
                        Thank you for your payment. A confirmation email will be sent shortly.
                    </p>
                    {paymentReference && (
                        <div className="bg-slate-50 rounded-xl p-4 mb-6">
                            <p className="text-xs text-slate-500 mb-1">Payment Reference</p>
                            <p className="font-mono font-semibold text-slate-800">{paymentReference}</p>
                        </div>
                    )}
                    <div className="text-sm text-slate-500">
                        Invoice: <span className="font-semibold">{invoice.invoice_number}</span>
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
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-100/50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src="/elab-logo.png" alt="ELAB Solutions" className="h-10" />
                            <div className="hidden sm:block">
                                <h1 className="font-semibold text-slate-800">ELAB Solutions</h1>
                                <p className="text-xs text-slate-500">Secure Payment Portal</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Shield className="w-4 h-4 text-green-600" />
                            <span className="hidden sm:inline">Secure Payment</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                <div className="grid lg:grid-cols-5 gap-6">
                    {/* Invoice Summary - Left */}
                    <div className="lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl shadow-sm p-6 sticky top-24"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-slate-800">Invoice</h2>
                                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs border ${statusConfig.className}`}>
                                    <StatusIcon className="w-3 h-3" />
                                    <span className="font-medium">{statusConfig.label}</span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Invoice #</span>
                                    <span className="font-mono font-medium text-slate-800">{invoice.invoice_number}</span>
                                </div>
                                {invoice.customer_name && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Customer</span>
                                        <span className="font-medium text-slate-800">{invoice.customer_name}</span>
                                    </div>
                                )}
                                {invoice.due_date && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Due Date</span>
                                        <span className="font-medium text-slate-800">
                                            {format(parseISO(invoice.due_date), 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Line Items */}
                            <div className="border-t border-slate-100 pt-4 mb-4">
                                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">Items</h3>
                                <div className="space-y-2">
                                    {invoice.line_items?.map((item, index) => (
                                        <div key={index} className="flex justify-between text-sm">
                                            <span className="text-slate-600">{item.description}</span>
                                            <span className="font-medium text-slate-800">
                                                {formatCurrency(item.line_total, invoice.currency)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="border-t border-slate-100 pt-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                                </div>
                                {invoice.discount_amount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Discount</span>
                                        <span>-{formatCurrency(invoice.discount_amount, invoice.currency)}</span>
                                    </div>
                                )}
                                {invoice.tax_amount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Tax</span>
                                        <span>{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
                                    </div>
                                )}
                                {invoice.amount_paid > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Paid</span>
                                        <span>-{formatCurrency(invoice.amount_paid, invoice.currency)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                                    <span className="text-slate-800">Amount Due</span>
                                    <span className="text-indigo-600">{formatCurrency(invoice.amount_due, invoice.currency)}</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Payment Options - Right */}
                    <div className="lg:col-span-3">
                        {isPaid ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center"
                            >
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                                </div>
                                <h2 className="text-xl font-bold text-green-800 mb-2">Invoice Paid</h2>
                                <p className="text-green-700">This invoice has been paid in full. Thank you!</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                    {/* Payment Method Tabs */}
                                    {(() => {
                                        const tabFeeInfo = calculatePaystackFee(invoice.amount_due, invoice.currency)
                                        return (
                                    <div className="flex border-b border-slate-100">
                                        <button
                                            onClick={() => setActiveTab('card')}
                                            className={`flex-1 flex flex-col items-center justify-center gap-1 py-4 text-sm font-medium transition-colors ${
                                                activeTab === 'card'
                                                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                                                    : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="w-4 h-4" />
                                                Pay with Card
                                            </div>
                                            <span className="text-xs font-normal opacity-75">
                                                {formatCurrency(tabFeeInfo.total, invoice.currency)}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('bank')}
                                            className={`flex-1 flex flex-col items-center justify-center gap-1 py-4 text-sm font-medium transition-colors ${
                                                activeTab === 'bank'
                                                    ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50'
                                                    : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4" />
                                                Bank Transfer
                                            </div>
                                            <span className="text-xs font-normal opacity-75">
                                                {formatCurrency(invoice.amount_due, invoice.currency)} (No Fee)
                                            </span>
                                        </button>
                                    </div>
                                        )
                                    })()}

                                    {/* Card Payment Tab */}
                                    {activeTab === 'card' && (() => {
                                        const feeInfo = calculatePaystackFee(invoice.amount_due, invoice.currency)
                                        const isUSD = invoice.currency === 'USD'
                                        return (
                                        <div className="p-6">
                                            <div className="text-center mb-6">
                                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <CreditCard className="w-8 h-8 text-indigo-600" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                                                    Pay with Debit/Credit Card
                                                    {isUSD && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">USD</span>}
                                                </h3>
                                                <p className="text-sm text-slate-500">
                                                    {isUSD
                                                        ? 'Secure international payment via Paystack. Accepts Visa, Mastercard, and international cards.'
                                                        : 'Secure payment powered by Paystack. Supports Visa, Mastercard, and Verve cards.'
                                                    }
                                                </p>
                                            </div>

                                            {/* Fee Breakdown */}
                                            <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-600">Invoice Amount</span>
                                                    <span className="font-medium text-slate-800">{formatCurrency(invoice.amount_due, invoice.currency)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-600">Processing Fee ({feeInfo.percentage}) <span className="text-slate-400 text-xs">(charged by Paystack)</span></span>
                                                    <span className="font-medium text-amber-600">+{formatCurrency(feeInfo.fee, invoice.currency)}</span>
                                                </div>
                                                <div className="border-t border-slate-200 pt-2 mt-2">
                                                    <div className="flex justify-between">
                                                        <span className="font-semibold text-slate-800">Total to Pay</span>
                                                        <span className="font-bold text-indigo-600">{formatCurrency(feeInfo.total, invoice.currency)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Email input for card payment */}
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                                    Email Address (for receipt)
                                                </label>
                                                <input
                                                    type="email"
                                                    value={proofForm.payerEmail}
                                                    onChange={(e) => setProofForm({ ...proofForm, payerEmail: e.target.value })}
                                                    placeholder="your@email.com"
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                                />
                                            </div>

                                            {isUSD ? (
                                                /* USD Payment - Use Paystack Payment Link */
                                                <>
                                                    <button
                                                        onClick={handlePayWithUSDLink}
                                                        disabled={!proofForm.payerEmail}
                                                        className="w-full bg-indigo-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Pay {formatCurrency(feeInfo.total, invoice.currency)} (USD)
                                                        <CreditCard className="w-5 h-5" />
                                                    </button>
                                                    <p className="text-xs text-slate-500 text-center mt-3">
                                                        You will be redirected to Paystack's secure payment page
                                                    </p>
                                                </>
                                            ) : (
                                                /* NGN Payment - Use Paystack Inline */
                                                <button
                                                    onClick={handlePayWithCard}
                                                    disabled={paymentLoading || !proofForm.payerEmail}
                                                    className="w-full bg-indigo-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {paymentLoading ? (
                                                        <>
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            Pay {formatCurrency(feeInfo.total, invoice.currency)}
                                                            <CreditCard className="w-5 h-5" />
                                                        </>
                                                    )}
                                                </button>
                                            )}

                                            <div className="flex items-center justify-center gap-3 mt-4">
                                                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">VISA</span>
                                                <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded">Mastercard</span>
                                                {!isUSD && <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">Verve</span>}
                                                {isUSD && <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">AMEX</span>}
                                            </div>

                                            <p className="text-xs text-slate-400 text-center mt-3">
                                                Processing fee is charged by Paystack for card transactions
                                            </p>
                                        </div>
                                        )
                                    })()}

                                    {/* Bank Transfer Tab */}
                                    {activeTab === 'bank' && nairaBankAccount && (
                                        <div className="p-6">
                                            <div className="text-center mb-6">
                                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Building2 className="w-8 h-8 text-green-600" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                                                    Bank Transfer
                                                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">No Fees</span>
                                                </h3>
                                                <p className="text-sm text-slate-500">
                                                    Transfer to the account below and submit your payment proof.
                                                </p>
                                            </div>

                                            <div className="space-y-3 mb-6">
                                                <div className="p-4 bg-slate-50 rounded-xl">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-xs text-slate-500">Bank Name</p>
                                                            <p className="font-semibold text-slate-800">{nairaBankAccount.bank_name}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => copyToClipboard(nairaBankAccount.bank_name, 'bank')}
                                                            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                                                        >
                                                            {copiedField === 'bank' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-slate-50 rounded-xl">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-xs text-slate-500">Account Name</p>
                                                            <p className="font-semibold text-slate-800">{nairaBankAccount.account_name}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => copyToClipboard(nairaBankAccount.account_name, 'name')}
                                                            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                                                        >
                                                            {copiedField === 'name' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-xs text-indigo-600">Account Number</p>
                                                            <p className="font-bold text-xl text-indigo-800">{nairaBankAccount.account_number}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => copyToClipboard(nairaBankAccount.account_number, 'number')}
                                                            className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
                                                        >
                                                            {copiedField === 'number' ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-indigo-600" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                                    <p className="text-xs text-amber-700 font-medium mb-1">Payment Reference (Important!)</p>
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-bold text-amber-800">{invoice.invoice_number}</p>
                                                        <button
                                                            onClick={() => copyToClipboard(invoice.invoice_number, 'ref')}
                                                            className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
                                                        >
                                                            {copiedField === 'ref' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-amber-600" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-xs text-green-700">Amount to Pay</p>
                                                            <p className="font-bold text-xl text-green-800">
                                                                {formatCurrency(invoice.amount_due, invoice.currency)}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => copyToClipboard(invoice.amount_due.toString(), 'amount')}
                                                            className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                                                        >
                                                            {copiedField === 'amount' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-green-600" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => setShowProofModal(true)}
                                                className="w-full bg-green-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Upload className="w-5 h-5" />
                                                I've Paid - Submit Proof
                                            </button>
                                        </div>
                                    )}

                                    {activeTab === 'bank' && !nairaBankAccount && (
                                        <div className="p-6 text-center text-slate-500">
                                            <p>Bank transfer details not available for this currency.</p>
                                            <p className="text-sm mt-2">Please use card payment or contact support.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Security Notice */}
                                <div className="bg-slate-50 rounded-xl p-4 flex items-start gap-3">
                                    <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-slate-600">
                                        <p className="font-medium text-slate-800 mb-1">Secure Payment</p>
                                        <p>Your payment information is encrypted and secure. We never store your card details.</p>
                                    </div>
                                </div>

                                {/* Contact Support */}
                                <div className="bg-white rounded-xl p-4 flex items-center justify-between">
                                    <div className="text-sm">
                                        <p className="text-slate-500">Need help?</p>
                                        <a href="mailto:headoffice@elabsolution.org" className="text-indigo-600 font-medium hover:underline">
                                            headoffice@elabsolution.org
                                        </a>
                                    </div>
                                    <div className="text-sm text-right">
                                        <p className="text-slate-500">Call us</p>
                                        <a href="tel:+2348168634195" className="text-indigo-600 font-medium hover:underline">
                                            +234 816 863 4195
                                        </a>
                                    </div>
                                </div>
                            </motion.div>
                        )}
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
                        onClick={() => !submittingProof && !proofSuccess && setShowProofModal(false)}
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
                                        onClick={() => !submittingProof && !proofSuccess && setShowProofModal(false)}
                                        disabled={submittingProof || proofSuccess}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <X className="w-5 h-5 text-slate-500" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                {proofSuccess ? (
                                    <div className="text-center py-8">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring' }}
                                            className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                                        >
                                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                                        </motion.div>
                                        <h4 className="text-lg font-semibold text-slate-800 mb-2">Proof Submitted!</h4>
                                        <p className="text-slate-600">
                                            Your payment proof has been submitted. We'll verify it within 24-48 hours and send you a confirmation.
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
                                                    {proofFile?.type?.includes('image') ? (
                                                        <img
                                                            src={proofPreview}
                                                            alt="Proof preview"
                                                            className="w-full h-48 object-cover rounded-xl"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-48 bg-slate-100 rounded-xl flex items-center justify-center">
                                                            <div className="text-center">
                                                                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                                                                <p className="text-sm text-slate-600">{proofFile?.name}</p>
                                                            </div>
                                                        </div>
                                                    )}
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
                                                        Click to upload receipt
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        Image or PDF, max 5MB
                                                    </span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Your Email */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Your Email *
                                            </label>
                                            <input
                                                type="email"
                                                value={proofForm.payerEmail}
                                                onChange={(e) => setProofForm({ ...proofForm, payerEmail: e.target.value })}
                                                placeholder="your@email.com"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                            />
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

                                        {/* Your Name */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Your Name
                                            </label>
                                            <input
                                                type="text"
                                                value={proofForm.payerName}
                                                onChange={(e) => setProofForm({ ...proofForm, payerName: e.target.value })}
                                                placeholder="Full name"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                            />
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            onClick={handleSubmitProof}
                                            disabled={!proofFile || !proofForm.payerEmail || submittingProof}
                                            className="w-full bg-green-600 text-white font-semibold py-4 px-4 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {submittingProof ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-5 h-5" />
                                                    Submit Payment Proof
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
            <footer className="border-t border-slate-100 bg-white/50 py-6 mt-12">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <p className="text-sm text-slate-400">
                        ELAB Solutions International LLC &middot; Secure Payment Portal
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        Nigeria: +234 816 863 4195 &middot; USA: +1 (929) 419-2327
                    </p>
                </div>
            </footer>
        </div>
    )
}
