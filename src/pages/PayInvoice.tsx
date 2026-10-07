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

// "Signature" look — matches the invoice and receipt documents.
const SERIF = {
    fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    fontVariantNumeric: 'lining-nums tabular-nums',
} as const
const GOLD_RULE = { background: 'linear-gradient(90deg, #B08D57, #D9C39A 70%, rgba(217,195,154,0))' }

function usePaymentPageFonts() {
    useEffect(() => {
        const id = 'pay-page-fonts'
        if (document.getElementById(id)) return
        const link = document.createElement('link')
        link.id = id
        link.rel = 'stylesheet'
        link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Manrope:wght@400;500;600;700;800&display=swap'
        document.head.appendChild(link)
    }, [])
}

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

// Paystack's inline.js script is no longer loaded: card payments go through the
// server-side Checkout (see handlePayWithCard), which collects the billing address
// Paystack's AVS requires and handles 3DS itself.

interface PublicInvoice {
    id: string
    invoice_number: string
    currency: string
    secondary_currency?: string | null
    secondary_total?: number | null
    secondary_exchange_rate?: number | null
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
    customer_phone?: string | null
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
    usePaymentPageFonts()
    // Phones show the services behind a "view details" link so the pay buttons stay near the top.
    const [showItems, setShowItems] = useState(false)

    // Returning from Paystack's hosted Checkout: confirm with the gateway so the client
    // sees the true state. The webhook records the payment independently of this call —
    // this is only the client's view of it, so a failure here never loses money.
    useEffect(() => {
        if (searchParams.get('paid') !== '1') return
        const ref = searchParams.get('reference')
        if (!ref) return
        let cancelled = false
        supabase.functions
            .invoke('paystack-initialize', { body: { action: 'verify', reference: ref } })
            .then(({ data }) => {
                if (cancelled) return
                setPaymentReference(ref)
                if ((data as any)?.verified) setPaymentSuccess(true)
            })
            .catch((err) => console.error('Payment verification failed:', err))
        return () => {
            cancelled = true
        }
    }, [searchParams])
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
    const [payerPhone, setPayerPhone] = useState<string>('')

    // Paystack state
    const [paymentLoading, setPaymentLoading] = useState(false)
    const [paymentSuccess, setPaymentSuccess] = useState(false)
    const [paymentReference, setPaymentReference] = useState<string | null>(null)
    const [cardCurrency, setCardCurrency] = useState<'primary' | 'secondary'>('primary')

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

            if (!invoiceData.customer_phone) {
                // get_public_invoice does not expose the client's phone, and the
                // Paystack page asks for it — read it from the public contact RPC
                // so the client never has to type it. Absent RPC degrades quietly.
                const { data: contact } = await supabase.rpc('get_public_invoice_contact', {
                    p_invoice_id: invoiceId
                })
                const cp = (contact as { customer_phone?: string } | null)?.customer_phone
                if (cp) setPayerPhone(cp)
            } else {
                setPayerPhone(invoiceData.customer_phone)
            }

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
            return { label: 'Overdue', className: 'text-[#C2410C] border border-[#C2410C]', icon: AlertCircle }
        }

        switch (status) {
            case 'paid':
                return { label: 'Paid', className: 'text-[#2F6B4F] border border-[#2F6B4F]', icon: CheckCircle2 }
            case 'partial':
                return { label: 'Partial', className: 'text-[#8A6A2F] border border-[#B08D57]', icon: Clock }
            case 'sent':
            case 'viewed':
                return { label: 'Pending', className: 'text-[#27488F] border border-[#27488F]', icon: Clock }
            case 'cancelled':
                return { label: 'Cancelled', className: 'text-[#8A8578] border border-[#C9C4B8]', icon: X }
            default:
                return { label: status, className: 'text-[#5B5A55] border border-[#C9C4B8]', icon: FileText }
        }
    }

    // Calculate secondary currency amount due (pro-rated if partial payment)
    const getSecondaryAmountDue = (): number => {
        if (!invoice?.secondary_total || !invoice?.secondary_currency) return 0
        if (invoice.amount_paid > 0 && invoice.total_amount > 0) {
            // Pro-rate: secondary_total * (amount_due / total_amount)
            return Math.round((invoice.secondary_total * (invoice.amount_due / invoice.total_amount)) * 100) / 100
        }
        return invoice.secondary_total
    }

    const handlePayWithCard = async () => {
        if (!invoice) return

        const useSecondary = cardCurrency === 'secondary' && invoice.secondary_currency && invoice.secondary_total
        const payCurrency = useSecondary ? invoice.secondary_currency! : (invoice.currency || 'NGN')
        const payAmount = useSecondary ? getSecondaryAmountDue() : invoice.amount_due

        setPaymentLoading(true)

        try {
            // SERVER-SIDE CHECKOUT. The old inline popup (PaystackPop.setup) cannot collect
            // a billing address, so Paystack's AVS step parked every US/UK/Canada card on
            // "waiting for address verification details" — the spinner spun and nothing was
            // charged. Paystack's own Checkout collects the address and handles 3DS, and the
            // amount is computed and locked server-side so the browser cannot alter it.
            console.log(`Starting server-side checkout for ${invoice.invoice_number}: ${payAmount} ${payCurrency}`)

            const payerEmail = proofForm.payerEmail || invoice.customer_email || 'customer@example.com'

            const initRes = await supabase.functions.invoke('paystack-initialize', {
                body: {
                    action: 'initialize',
                    invoice_id: invoice.id,
                    email: payerEmail,
                    currency: payCurrency
                }
            })
            const initData: any = initRes.data
            if (initRes.error || !initData?.authorization_url) {
                console.error('paystack-initialize failed:', initRes.error, initData)
                throw new Error(initData?.error || 'The payment gateway did not return a checkout link')
            }

            // Off to Paystack's Checkout. It returns the client to
            // /pay/<invoice>?paid=1&reference=... where we confirm the payment.
            window.location.href = initData.authorization_url
            return
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

        // Hand the Paystack page every field it asks for, so the client only
        // reviews and taps "Pay now".
        // Param names verified against the live page 2026-09-19:
        //   first_name / last_name → fills "First name" / "Last name"
        //     (firstname/lastname do NOT work — they arrive empty)
        //   phone                  → fills "Phone number"
        //   your_quotation_number  → the page's custom field, now carrying the
        //                            invoice number
        // Invoice numbers are two tokens or more ("Priscilla Amara Ezeji"):
        // last token is the surname, everything before it is the given name(s).
        const nameParts = (invoice.customer_name || '').trim().split(/\s+/).filter(Boolean)
        const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : (nameParts[0] || '')
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''

        // Build payment link URL with query parameters
        // Paystack payment links accept: amount, email, and custom_fields
        const params = new URLSearchParams({
            // The Paystack USD page takes a WHOLE USD amount and accepts decimals.
            // Verified 2026-09-19 against the live page: `amount=31.47` renders
            // "Amount USD 31.47"; `amount=3147` renders "USD 3,147". Sending
            // `total * 100` here was the 100x over-quote clients hit.
            amount: feeInfo.total.toFixed(2),
            email: payerEmail,
            first_name: firstName,
            last_name: lastName,
            your_quotation_number: invoice.invoice_number,
            'metadata[invoice_id]': invoice.id,
            'metadata[invoice_number]': invoice.invoice_number,
            'metadata[customer_name]': invoice.customer_name || '',
            'metadata[invoice_amount]': String(invoice.amount_due),
            'metadata[processing_fee]': String(feeInfo.fee)
        })

        // Phone only arrives once the public contact RPC exposes it — include it
        // whenever present so the field is never left for typing.
        const phone = payerPhone || invoice.customer_phone
        if (phone) params.set('phone', phone)

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
            <div className="min-h-screen flex items-center justify-center bg-[#F2F1EE]">
                <div className="flex flex-col items-center gap-5">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    >
                        <div className="w-12 h-12 rounded-full border-[3px] border-[#e5e2db] border-t-[#13254A]" />
                    </motion.div>
                    <p className="text-sm text-[#8b8680] tracking-wide uppercase font-medium" style={SERIF}>
                        Loading invoice...
                    </p>
                </div>
            </div>
        )
    }

    // ── Error State ──
    if (error || !invoice) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F2F1EE]">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#FDFCF9] shadow-[0_1px_2px_rgba(19,37,74,0.05),0_10px_30px_rgba(19,37,74,0.06)] p-10 max-w-md mx-4 text-center"
                >
                    <div className="w-px h-8 bg-[#B08D57] mx-auto mb-6" />
                    <h1 className="text-xl font-semibold text-[#13254A] mb-3" style={SERIF}>
                        Invoice not found
                    </h1>
                    <p className="text-sm text-[#64748b] mb-8 leading-relaxed">
                        {error || 'This invoice could not be found or may have been removed.'}
                    </p>
                    <a
                        href="mailto:headoffice@elabsolution.org"
                        className="inline-flex items-center gap-2 text-[#B08D57] hover:text-[#8A6A2F] text-sm font-medium transition-colors"
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
            <div className="min-h-screen flex items-center justify-center bg-[#F2F1EE]">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-[#FDFCF9] shadow-[0_1px_2px_rgba(19,37,74,0.05),0_10px_30px_rgba(19,37,74,0.06)] p-10 max-w-md mx-4 text-center"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="w-14 h-14 bg-[#EDF5F0] rounded-full flex items-center justify-center mx-auto mb-5"
                    >
                        <CheckCircle2 className="w-7 h-7 text-[#2F6B4F]" />
                    </motion.div>
                    <h1 className="text-[34px] font-semibold text-[#13254A] mb-3" style={SERIF}>
                        Payment received
                    </h1>
                    <p className="text-sm text-[#64748b] mb-6 leading-relaxed">
                        Thank you for your payment. A confirmation will be sent to your email shortly.
                    </p>
                    {paymentReference && (
                        <div className="border-l-[3px] border-[#B08D57] bg-[#F8F6F1] p-4 mb-6 text-left">
                            <p className="text-[10px] uppercase tracking-[1.8px] font-bold text-[#8A8578] mb-1">Payment reference</p>
                            <p className="font-mono font-semibold text-[#13254A]">{paymentReference}</p>
                        </div>
                    )}
                    <div className="text-xs text-[#8b8680]">
                        Invoice <span className="font-semibold text-[#13254A]">{invoice.invoice_number}</span>
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
        <div className="min-h-screen bg-[#F2F1EE]">

            {/* ── Header ── */}
            <header className="bg-[#13254A] text-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                            {/* Cropped white wordmark — the square /elab-logo.png with
                                brightness-0 invert rendered as a solid white box. */}
                            <img src="/elab-logo-white.png" alt="Elab Solutions International" className="h-6 sm:h-7 w-auto" />
                            <span className="hidden sm:block h-6 w-px bg-white/20" />
                            <p className="hidden sm:block text-[10px] font-bold uppercase tracking-[2.2px] text-[#C9A86A]">
                                Secure payment
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-white/70">
                            <Lock className="w-3.5 h-3.5 text-[#C9A86A]" />
                            <span className="hidden sm:inline text-xs">Encrypted · powered by Paystack</span>
                            <span className="sm:hidden text-[9px] font-bold uppercase tracking-[1.8px] text-[#C9A86A]">Secure payment</span>
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
                            className="bg-[#FDFCF9] shadow-[0_1px_2px_rgba(19,37,74,0.05),0_10px_30px_rgba(19,37,74,0.06)] sticky top-8"
                        >
                            <div className="p-6 sm:p-7">
                                {/* Invoice header */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[1.8px] text-[#8A8578] font-bold mb-1">Invoice</p>
                                        <p className="text-[15px] font-extrabold tracking-[0.4px] text-[#13254A] tabular-nums">Nº {invoice.invoice_number}</p>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[1.6px] ${statusConfig.className}`}>
                                        <StatusIcon className="w-3 h-3" />
                                        {statusConfig.label}
                                    </div>
                                </div>
                                <div className="mt-4 mb-6 flex items-start">
                                    <div className="h-[3px] w-11 bg-[#27488F]" />
                                    <div className="mt-px h-px flex-1" style={GOLD_RULE} />
                                </div>

                                {/* Details */}
                                <div className="space-y-3 mb-6">
                                    {invoice.customer_name && (
                                        <div>
                                            <span className="text-[10px] uppercase tracking-[1.8px] font-bold text-[#8A8578]">Billed to</span>
                                            <p className="text-[23px] font-semibold leading-tight text-[#13254A] mt-1" style={SERIF}>{invoice.customer_name}</p>
                                        </div>
                                    )}
                                    {invoice.due_date && (
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-[10px] uppercase tracking-[1.8px] font-bold text-[#8A8578]">Due date</span>
                                            <span className="text-sm font-medium text-[#13254A]">
                                                {format(parseISO(invoice.due_date), 'MMM d, yyyy')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Line Items — collapsed on phones until "view details" */}
                                <div className={`${showItems ? '' : 'hidden'} lg:block`}>
                                <div className="mb-5">
                                    <p className="text-[10px] uppercase tracking-[1.8px] text-[#13254A] font-bold pb-2 border-b-[1.5px] border-[#13254A]">Services</p>
                                    <div>
                                        {invoice.line_items?.map((item, index) => (
                                            <div key={index} className="flex justify-between items-baseline gap-4 py-2.5 border-b border-[#EFEAE0]">
                                                <span className="text-[13px] text-[#374151] leading-snug">{item.description}</span>
                                                <span className="text-[13px] font-semibold text-[#13254A] tabular-nums whitespace-nowrap">
                                                    {formatCurrency(item.line_total, invoice.currency)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Totals */}
                                <div className="pt-1 space-y-2 mb-3">
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

                                </div>
                                </div>

                                <div className="space-y-2">
                                    {/* Gold rule before total */}
                                    <div className={`h-px mb-3 ${showItems ? '' : 'hidden'} lg:block`} style={GOLD_RULE} />

                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[10px] uppercase tracking-[1.8px] font-bold text-[#13254A]">Amount due · {invoice.currency}</span>
                                        <span className="text-[34px] leading-none font-semibold text-[#13254A]" style={SERIF}>
                                            {formatCurrency(invoice.amount_due, invoice.currency)}
                                        </span>
                                    </div>

                                    {/* Secondary currency amount */}
                                    {invoice.secondary_currency && invoice.secondary_total && invoice.amount_due > 0 && (
                                        <div className="border-l-[3px] border-[#B08D57] bg-[#F8F3E8] p-3 !mt-4">
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-[#8A6A2F]">
                                                    Or pay in {invoice.secondary_currency}
                                                </span>
                                                <span className="text-xl font-semibold text-[#6B4E1F]" style={SERIF}>
                                                    {formatCurrency(getSecondaryAmountDue(), invoice.secondary_currency)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {(invoice.line_items?.length ?? 0) > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowItems(v => !v)}
                                            className="lg:hidden !mt-4 text-[13px] font-semibold text-[#27488F]"
                                        >
                                            {showItems
                                                ? 'Hide details'
                                                : `${invoice.line_items.length} service${invoice.line_items.length === 1 ? '' : 's'} · view details ›`}
                                        </button>
                                    )}
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
                                className="bg-[#FDFCF9] shadow-[0_1px_2px_rgba(19,37,74,0.05),0_10px_30px_rgba(19,37,74,0.06)] p-10 text-center"
                            >
                                <div className="w-14 h-14 bg-[#EDF5F0] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-7 h-7 text-[#2F6B4F]" />
                                </div>
                                <h2 className="text-[34px] font-semibold text-[#13254A] mb-2" style={SERIF}>
                                    Settled in full
                                </h2>
                                <p className="text-sm text-[#5B5A55] leading-relaxed">This invoice has been paid. Your official receipt was emailed to you.<br />Thank you for trusting us with your professional journey.</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="space-y-5"
                            >
                                {/* Payment Method Card */}
                                <div className="bg-[#FDFCF9] shadow-[0_1px_2px_rgba(19,37,74,0.05),0_10px_30px_rgba(19,37,74,0.06)] overflow-hidden">
                                    {/* Tabs */}
                                    {(() => {
                                        const hasSecondary = !!(invoice.secondary_currency && invoice.secondary_total)
                                        const cardCur = cardCurrency === 'secondary' && hasSecondary ? invoice.secondary_currency! : invoice.currency
                                        const cardAmt = cardCurrency === 'secondary' && hasSecondary ? getSecondaryAmountDue() : invoice.amount_due
                                        const tabFeeInfo = calculatePaystackFee(cardAmt, cardCur)
                                        return (
                                            <div className="flex gap-1 m-3 sm:m-4 mb-0 sm:mb-0 rounded-xl bg-[#E4E2DC] p-1">
                                                <button
                                                    onClick={() => setActiveTab('card')}
                                                    className={`flex-1 flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm transition-all ${
                                                        activeTab === 'card'
                                                            ? 'text-[#13254A] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.10)]'
                                                            : 'text-[#5B5A55] hover:text-[#13254A]'
                                                    }`}
                                                >
                                                    <CreditCard className="w-4 h-4" />
                                                    <div className="text-left">
                                                        <div className="text-[13.5px] font-bold">Pay by card</div>
                                                        <div className="text-[11px] font-normal opacity-60">
                                                            {formatCurrency(tabFeeInfo.total, cardCur)}
                                                        </div>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab('bank')}
                                                    className={`flex-1 flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm transition-all ${
                                                        activeTab === 'bank'
                                                            ? 'text-[#13254A] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.10)]'
                                                            : 'text-[#5B5A55] hover:text-[#13254A]'
                                                    }`}
                                                >
                                                    <Building2 className="w-4 h-4" />
                                                    <div className="text-left">
                                                        <div className="text-[13.5px] font-bold">Bank transfer</div>
                                                        <div className="text-[11px] font-normal opacity-60">
                                                            {formatCurrency(invoice.amount_due, invoice.currency)} · no fee
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>
                                        )
                                    })()}

                                    {/* ── Card Payment Tab ── */}
                                    {activeTab === 'card' && (() => {
                                        const hasSecondary = !!(invoice.secondary_currency && invoice.secondary_total)
                                        const secondaryAmountDue = getSecondaryAmountDue()
                                        const selectedCurrency = cardCurrency === 'secondary' && hasSecondary ? invoice.secondary_currency! : invoice.currency
                                        const selectedAmount = cardCurrency === 'secondary' && hasSecondary ? secondaryAmountDue : invoice.amount_due
                                        const feeInfo = calculatePaystackFee(selectedAmount, selectedCurrency)
                                        const isUSDSelected = selectedCurrency === 'USD'
                                        return (
                                            <div className="p-6 sm:p-8">
                                                <p className="text-[13px] text-[#5B5A55] leading-relaxed mb-5">
                                                    Pay securely by debit or credit card through Paystack.{hasSecondary ? ' Choose the currency you want to pay in.' : ''}
                                                </p>

                                                {/* Currency Selector — only show if secondary currency exists */}
                                                {hasSecondary && (
                                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                                        {/* Primary currency option */}
                                                        <button
                                                            onClick={() => setCardCurrency('primary')}
                                                            className={`relative p-4 border-2 rounded-xl transition-all text-left ${
                                                                cardCurrency === 'primary'
                                                                    ? 'border-[#13254A] bg-white'
                                                                    : 'border-[#e5e2db] hover:border-[#c4c0b8] bg-white'
                                                            }`}
                                                        >
                                                            {cardCurrency === 'primary' && (
                                                                <div className="absolute top-2 right-2 w-5 h-5 bg-[#13254A] rounded-full flex items-center justify-center">
                                                                    <Check className="w-3 h-3 text-white" />
                                                                </div>
                                                            )}
                                                            <p className="text-[10px] uppercase tracking-[1.5px] text-[#8b8680] font-medium mb-1">Pay in {invoice.currency}</p>
                                                            <p className="text-lg font-bold text-[#13254A] tabular-nums" style={SERIF}>
                                                                {formatCurrency(invoice.amount_due, invoice.currency)}
                                                            </p>
                                                            <p className="text-[11px] text-[#8b8680] mt-1">
                                                                + {calculatePaystackFee(invoice.amount_due, invoice.currency).percentage} fee
                                                            </p>
                                                        </button>

                                                        {/* Secondary currency option */}
                                                        <button
                                                            onClick={() => setCardCurrency('secondary')}
                                                            className={`relative p-4 border-2 rounded-xl transition-all text-left ${
                                                                cardCurrency === 'secondary'
                                                                    ? 'border-[#13254A] bg-white'
                                                                    : 'border-[#e5e2db] hover:border-[#c4c0b8] bg-white'
                                                            }`}
                                                        >
                                                            {cardCurrency === 'secondary' && (
                                                                <div className="absolute top-2 right-2 w-5 h-5 bg-[#13254A] rounded-full flex items-center justify-center">
                                                                    <Check className="w-3 h-3 text-white" />
                                                                </div>
                                                            )}
                                                            <p className="text-[10px] uppercase tracking-[1.5px] text-[#8b8680] font-medium mb-1">Pay in {invoice.secondary_currency}</p>
                                                            <p className="text-lg font-bold text-[#13254A] tabular-nums" style={SERIF}>
                                                                {formatCurrency(secondaryAmountDue, invoice.secondary_currency!)}
                                                            </p>
                                                            <p className="text-[11px] text-[#8b8680] mt-1">
                                                                + {calculatePaystackFee(secondaryAmountDue, invoice.secondary_currency!).percentage} fee
                                                            </p>
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Fee Breakdown */}
                                                <div className="mb-6 space-y-3">
                                                    <div className="flex justify-between text-[13px]">
                                                        <span className="text-[#64748b]">Invoice Amount</span>
                                                        <span className="font-medium text-[#13254A] tabular-nums">{formatCurrency(selectedAmount, selectedCurrency)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[13px]">
                                                        <span className="text-[#64748b]">
                                                            Processing Fee ({feeInfo.percentage})
                                                            <span className="text-[11px] text-[#8b8680] ml-1">(Paystack)</span>
                                                        </span>
                                                        <span className="font-medium text-[#B08D57] tabular-nums">+{formatCurrency(feeInfo.fee, selectedCurrency)}</span>
                                                    </div>
                                                    <div className="pt-3 border-t border-[#EFEAE0]">
                                                        <div className="flex justify-between items-baseline">
                                                            <span className="text-[10px] uppercase tracking-[1.8px] font-bold text-[#13254A]">Total to pay</span>
                                                            <span className="text-[38px] leading-none font-semibold text-[#13254A]" style={SERIF}>
                                                                {formatCurrency(feeInfo.total, selectedCurrency)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Email Input */}
                                                <div className="mb-5">
                                                    <label className="block text-[10px] uppercase tracking-[1.8px] text-[#8A8578] font-bold mb-2">
                                                        Email for your receipt
                                                    </label>
                                                    <input
                                                        type="email"
                                                        value={proofForm.payerEmail}
                                                        onChange={(e) => setProofForm({ ...proofForm, payerEmail: e.target.value })}
                                                        placeholder="jacinta@gmail.com"
                                                        className="w-full px-4 py-3 rounded-xl border border-[#E2DCCD] bg-white focus:border-[#13254A] focus:ring-1 focus:ring-[#13254A]/15 transition-all outline-none text-[15px] text-[#13254A] placeholder:text-[#c4c0b8]"
                                                    />
                                                </div>

                                                {/* Pay Button — one checkout path for every
                                                    currency. USD used to divert to the hosted
                                                    Paystack payment page, which asked the client
                                                    to fill in name, phone, amount and a reference.
                                                    The inline popup takes the amount from this page
                                                    (not typeable) and asks only for card details. */}
                                                <button
                                                    onClick={handlePayWithCard}
                                                    disabled={paymentLoading || !proofForm.payerEmail}
                                                    className="w-full rounded-xl bg-[#13254A] text-white font-extrabold py-4 px-6 hover:bg-[#0E1C3A] transition-colors flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed text-[15px] tracking-wide"
                                                >
                                                    {paymentLoading ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            Pay {formatCurrency(feeInfo.total, selectedCurrency)} securely
                                                            <ArrowRight className="w-4 h-4" />
                                                        </>
                                                    )}
                                                </button>

                                                {/* Fallback — keeps USD payable if the popup is
                                                    blocked by a browser/extension. */}
                                                {isUSDSelected && (
                                                    <p className="text-[11px] text-[#8b8680] text-center mt-3">
                                                        Card form not opening?{' '}
                                                        <button
                                                            type="button"
                                                            onClick={handlePayWithUSDLink}
                                                            className="text-[#B08D57] underline hover:text-[#8A6A2F] transition-colors"
                                                        >
                                                            Use our secure payment page
                                                        </button>{' '}
                                                        (enter {formatCurrency(feeInfo.total, selectedCurrency)}).
                                                    </p>
                                                )}

                                                {/* Card logos */}
                                                <div className="flex items-center justify-center gap-4 mt-5">
                                                    <span className="text-[#8A8578] text-[10.5px] font-bold tracking-[1px]">VISA</span>
                                                    <span className="text-[#8A8578] text-[10.5px] font-bold tracking-[1px]">MASTERCARD</span>
                                                    {!isUSDSelected && <span className="text-[#8A8578] text-[10.5px] font-bold tracking-[1px]">VERVE</span>}
                                                    {isUSDSelected && <span className="text-[#8A8578] text-[10.5px] font-bold tracking-[1px]">AMEX</span>}
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
                                            <p className="text-[13.5px] text-[#3D3B36] leading-relaxed mb-5">
                                                Transfer <strong className="text-[#13254A] tabular-nums">{formatCurrency(invoice.amount_due, invoice.currency)}</strong> to the account below &mdash; no processing fee. Then tell us you've paid so we can confirm it quickly.
                                            </p>

                                            {/* Bank Details */}
                                            <div className="mb-6 border-l-[3px] border-[#B08D57] bg-[#F8F6F1] px-4 divide-y divide-[#ECE6D8]">
                                                {/* Bank Name */}
                                                <div className="flex items-center justify-between py-3">
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-[1.5px] text-[#8b8680] mb-0.5">Bank</p>
                                                        <p className="text-sm font-semibold text-[#13254A]">{nairaBankAccount.bank_name}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(nairaBankAccount.bank_name, 'bank')}
                                                        className="p-2 hover:bg-[#e5e2db] transition-colors"
                                                    >
                                                        {copiedField === 'bank' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#8b8680]" />}
                                                    </button>
                                                </div>

                                                {/* Account Name */}
                                                <div className="flex items-center justify-between py-3">
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-[1.5px] text-[#8b8680] mb-0.5">Account Name</p>
                                                        <p className="text-sm font-semibold text-[#13254A]">{nairaBankAccount.account_name}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(nairaBankAccount.account_name, 'name')}
                                                        className="p-2 hover:bg-[#e5e2db] transition-colors"
                                                    >
                                                        {copiedField === 'name' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#8b8680]" />}
                                                    </button>
                                                </div>

                                                {/* Account Number — Highlighted */}
                                                <div className="flex items-center justify-between py-3">
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-[1.5px] text-[#8b8680] mb-0.5">Account Number</p>
                                                        <p className="text-2xl font-semibold text-[#13254A] tracking-wide" style={SERIF}>
                                                            {nairaBankAccount.account_number}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(nairaBankAccount.account_number, 'number')}
                                                        className="p-2 hover:bg-[#e5e2db] transition-colors"
                                                    >
                                                        {copiedField === 'number' ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-[#8b8680]" />}
                                                    </button>
                                                </div>

                                                {/* Payment Reference */}
                                                <div className="flex items-center justify-between py-3">
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-[1.5px] text-[#B08D57] font-semibold mb-0.5">
                                                            Payment Reference (Required)
                                                        </p>
                                                        <p className="text-sm font-bold text-[#13254A]">{invoice.invoice_number}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(invoice.invoice_number, 'ref')}
                                                        className="p-2 hover:bg-[#B08D57]/10 transition-colors"
                                                    >
                                                        {copiedField === 'ref' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#B08D57]" />}
                                                    </button>
                                                </div>

                                                {/* Amount */}
                                                <div className="flex items-center justify-between py-3">
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-[1.5px] text-emerald-700 mb-0.5">Amount to Transfer</p>
                                                        <p className="text-lg font-bold text-[#13254A] tabular-nums" style={SERIF}>
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

                                                {/* Secondary currency equivalent */}
                                                {invoice.secondary_currency && invoice.secondary_total && (
                                                    <div className="flex items-center justify-between py-3">
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-[1.5px] text-[#B08D57] font-semibold mb-0.5">Or Transfer in {invoice.secondary_currency}</p>
                                                            <p className="text-lg font-bold text-[#13254A] tabular-nums" style={SERIF}>
                                                                {formatCurrency(getSecondaryAmountDue(), invoice.secondary_currency)}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => copyToClipboard(getSecondaryAmountDue().toString(), 'sec-amount')}
                                                            className="p-2 hover:bg-[#B08D57]/10 transition-colors"
                                                        >
                                                            {copiedField === 'sec-amount' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#B08D57]" />}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Submit Proof Button */}
                                            <button
                                                onClick={() => setShowProofModal(true)}
                                                className="w-full rounded-xl bg-[#13254A] text-white font-extrabold py-4 px-6 hover:bg-[#0E1C3A] transition-colors flex items-center justify-center gap-2.5 text-[15px] tracking-wide"
                                            >
                                                <Upload className="w-4 h-4" />
                                                I've paid &mdash; upload my receipt
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
                                <div className="flex items-start gap-3 px-1.5 text-[12.5px] leading-relaxed text-[#8A8578]">
                                    <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <p>Card payments are processed by Paystack over an encrypted connection. We never see or store your card details.</p>
                                </div>

                                {/* Contact Support */}
                                <div className="px-1.5">
                                    <p className="text-[10px] uppercase tracking-[1.8px] text-[#8A8578] font-bold mb-2">Need assistance?</p>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                        <a href="mailto:headoffice@elabsolution.org" className="flex items-center gap-2 text-[13px] text-[#13254A] hover:text-[#B08D57] transition-colors font-medium">
                                            <Mail className="w-3.5 h-3.5 text-[#8b8680]" />
                                            headoffice@elabsolution.org
                                        </a>
                                        <a href="tel:+2348165634195" className="flex items-center gap-2 text-[13px] text-[#13254A] hover:text-[#B08D57] transition-colors font-medium">
                                            <Phone className="w-3.5 h-3.5 text-[#8b8680]" />
                                            +234 816 563 4195
                                        </a>
                                    </div>
                                </div>

                                {/* Legal Links */}
                                <div className="text-center text-[11px] text-[#8b8680] space-x-4">
                                    <a href="/privacy" className="hover:text-[#B08D57] transition-colors">Privacy</a>
                                    <span className="text-[#e5e2db]">|</span>
                                    <a href="/terms" className="hover:text-[#B08D57] transition-colors">Terms</a>
                                    <span className="text-[#e5e2db]">|</span>
                                    <a href="/support/refund-policy" className="hover:text-[#B08D57] transition-colors">Refund Policy</a>
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
                        className="fixed inset-0 bg-[#13254A]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => !submittingProof && !proofSuccess && setShowProofModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#FDFCF9] shadow-[0_24px_60px_rgba(19,37,74,0.25)] max-w-md w-full max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-[#EFEAE0]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-[26px] leading-tight font-semibold text-[#13254A]" style={SERIF}>
                                            Upload your receipt
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
                                            className="w-14 h-14 bg-[#EDF5F0] rounded-full flex items-center justify-center mx-auto mb-5"
                                        >
                                            <CheckCircle2 className="w-7 h-7 text-[#2F6B4F]" />
                                        </motion.div>
                                        <h4 className="text-[26px] font-semibold text-[#13254A] mb-2" style={SERIF}>
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
                                            <label className="block text-[10px] uppercase tracking-[1.8px] text-[#8A8578] font-bold mb-2">
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
                                                        className="absolute top-2 right-2 p-1.5 bg-[#13254A] text-white hover:bg-[#0E1C3A] transition-colors"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-full h-32 rounded-xl border-2 border-dashed border-[#E2DCCD] flex flex-col items-center justify-center gap-2 hover:border-[#B08D57] hover:bg-[#faf9f7] transition-all"
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
                                            <label className="block text-[10px] uppercase tracking-[1.8px] text-[#8A8578] font-bold mb-2">
                                                Your Email *
                                            </label>
                                            <input
                                                type="email"
                                                value={proofForm.payerEmail}
                                                onChange={(e) => setProofForm({ ...proofForm, payerEmail: e.target.value })}
                                                placeholder="jacinta@gmail.com"
                                                className="w-full px-4 py-3 rounded-xl border border-[#E2DCCD] bg-white focus:border-[#13254A] focus:ring-1 focus:ring-[#13254A]/15 transition-all outline-none text-[15px] text-[#13254A] placeholder:text-[#c4c0b8]"
                                            />
                                        </div>

                                        {/* Payment Date */}
                                        <div>
                                            <label className="block text-[10px] uppercase tracking-[1.8px] text-[#8A8578] font-bold mb-2">
                                                Payment Date *
                                            </label>
                                            <input
                                                type="date"
                                                value={proofForm.paymentDate}
                                                onChange={(e) => setProofForm({ ...proofForm, paymentDate: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-[#E2DCCD] bg-white focus:border-[#13254A] focus:ring-1 focus:ring-[#13254A]/15 transition-all outline-none text-[15px] text-[#13254A]"
                                            />
                                        </div>

                                        {/* Bank Reference */}
                                        <div>
                                            <label className="block text-[10px] uppercase tracking-[1.8px] text-[#8A8578] font-bold mb-2">
                                                Bank Reference / Transaction ID
                                            </label>
                                            <input
                                                type="text"
                                                value={proofForm.bankReference}
                                                onChange={(e) => setProofForm({ ...proofForm, bankReference: e.target.value })}
                                                placeholder="e.g., TRF123456789"
                                                className="w-full px-4 py-3 rounded-xl border border-[#E2DCCD] bg-white focus:border-[#13254A] focus:ring-1 focus:ring-[#13254A]/15 transition-all outline-none text-[15px] text-[#13254A] placeholder:text-[#c4c0b8]"
                                            />
                                        </div>

                                        {/* Name */}
                                        <div>
                                            <label className="block text-[10px] uppercase tracking-[1.8px] text-[#8A8578] font-bold mb-2">
                                                Your Name
                                            </label>
                                            <input
                                                type="text"
                                                value={proofForm.payerName}
                                                onChange={(e) => setProofForm({ ...proofForm, payerName: e.target.value })}
                                                placeholder="Full name"
                                                className="w-full px-4 py-3 rounded-xl border border-[#E2DCCD] bg-white focus:border-[#13254A] focus:ring-1 focus:ring-[#13254A]/15 transition-all outline-none text-[15px] text-[#13254A] placeholder:text-[#c4c0b8]"
                                            />
                                        </div>

                                        {/* Submit */}
                                        <button
                                            onClick={handleSubmitProof}
                                            disabled={!proofFile || !proofForm.payerEmail || submittingProof}
                                            className="w-full rounded-xl bg-[#13254A] text-white font-extrabold py-4 px-4 hover:bg-[#0E1C3A] transition-colors flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed text-sm tracking-wide"
                                        >
                                            {submittingProof ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-4 h-4" />
                                                    Send my receipt
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
            <footer className="bg-[#13254A] mt-16">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-center sm:text-left">
                            <p className="text-sm text-white/80 font-medium" style={SERIF}>
                                Elab Solutions International, LLC
                            </p>
                            <p className="text-[10px] uppercase tracking-[2px] text-[#C9A86A] mt-1">
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
                                <span>+234 816 563 4195</span>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
