import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, getRecruiterInvoices, getRecruiterInvoiceStats, getPortalUserInfo, type RecruiterInvoice, type RecruiterInvoiceStats, type PortalUserInfo } from '@/lib/supabase'
import { motion } from 'framer-motion'
import {
    FileText,
    ChevronRight,
    Search,
    Filter,
    LogOut,
    ArrowLeft,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Clock,
    Receipt
} from 'lucide-react'
import { format, formatDistanceToNow, isPast, parseISO } from 'date-fns'

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

export default function RecruiterInvoices() {
    const navigate = useNavigate()
    const [portalUser, setPortalUser] = useState<PortalUserInfo | null>(null)
    const [invoices, setInvoices] = useState<RecruiterInvoice[]>([])
    const [stats, setStats] = useState<RecruiterInvoiceStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            // Get portal user info
            const { data: userInfo } = await getPortalUserInfo()
            if (!userInfo || userInfo.user_type !== 'recruiter') {
                navigate('/dashboard')
                return
            }
            setPortalUser(userInfo)

            // Load invoices and stats in parallel
            const [invoicesResult, statsResult] = await Promise.all([
                getRecruiterInvoices(),
                getRecruiterInvoiceStats()
            ])

            setInvoices(invoicesResult.data || [])
            setStats(statsResult.data)
        } catch (err) {
            console.error('Error loading invoices:', err)
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

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = searchQuery === '' ||
            inv.out_invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.out_person_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.out_case_reference?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = statusFilter === 'all' || inv.out_status === statusFilter

        return matchesSearch && matchesStatus
    })

    const getStatusConfig = (status: string, dueDate: string | null) => {
        const isOverdue = dueDate && isPast(parseISO(dueDate)) && status !== 'paid'

        if (isOverdue || status === 'overdue') {
            return { label: 'Overdue', className: 'bg-red-100 text-red-700', icon: AlertCircle }
        }

        switch (status) {
            case 'paid':
                return { label: 'Paid', className: 'bg-green-100 text-green-700', icon: CheckCircle2 }
            case 'partial':
                return { label: 'Partial', className: 'bg-amber-100 text-amber-700', icon: Clock }
            case 'sent':
                return { label: 'Pending', className: 'bg-blue-100 text-blue-700', icon: Clock }
            case 'cancelled':
                return { label: 'Cancelled', className: 'bg-slate-100 text-slate-500', icon: AlertCircle }
            default:
                return { label: status, className: 'bg-slate-100 text-slate-700', icon: FileText }
        }
    }

    const formatCurrency = (amount: number, currency: string) => {
        const symbol = CURRENCY_SYMBOLS[currency] || currency
        return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
                    <p className="text-slate-600 font-medium">Loading invoices...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-100/50 sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src="/elab-logo.png" alt="ELAB" className="h-10" />
                            <div className="hidden sm:block">
                                <h1 className="font-semibold text-slate-800">Invoices</h1>
                                <p className="text-xs text-slate-500">
                                    {portalUser?.company_name || `${portalUser?.first_name} ${portalUser?.last_name}`}
                                </p>
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

            {/* Back Button & Title */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <Link
                        to="/recruiter/dashboard"
                        className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Receipt className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-bold">
                                    Invoices & Payments
                                </h2>
                                <p className="text-white/80 mt-1">
                                    View and pay your invoices
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl shadow-sm p-5"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-indigo-600" />
                            </div>
                            <span className="text-sm text-slate-500">Total Invoices</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats?.out_total_invoices || 0}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl shadow-sm p-5"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-amber-600" />
                            </div>
                            <span className="text-sm text-slate-500">Pending</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats?.out_pending_invoices || 0}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl shadow-sm p-5"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <span className="text-sm text-slate-500">Amount Due</span>
                        </div>
                        <p className="text-2xl font-bold text-red-600">
                            {formatCurrency(stats?.out_amount_due || 0, 'NGN')}
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white rounded-2xl shadow-sm p-5"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="text-sm text-slate-500">Paid</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(stats?.out_amount_paid || 0, 'NGN')}
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by invoice number, name, or case..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="pl-11 pr-8 py-3 rounded-xl border border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">All Status</option>
                            <option value="sent">Pending</option>
                            <option value="partial">Partial</option>
                            <option value="overdue">Overdue</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>
                </div>

                {/* Invoices List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white rounded-2xl shadow-sm overflow-hidden"
                >
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-800">
                            Your Invoices ({filteredInvoices.length})
                        </h3>
                    </div>

                    {filteredInvoices.length === 0 ? (
                        <div className="p-12 text-center">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">
                                {invoices.length === 0
                                    ? 'No invoices yet. Your invoices will appear here.'
                                    : 'No invoices match your search criteria.'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredInvoices.map((invoice, index) => {
                                const statusConfig = getStatusConfig(invoice.out_status, invoice.out_due_date)
                                const StatusIcon = statusConfig.icon

                                return (
                                    <motion.div
                                        key={invoice.out_id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Link
                                            to={`/recruiter/invoice/${invoice.out_id}`}
                                            className="block p-5 hover:bg-slate-50 transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                                        invoice.out_status === 'paid' ? 'bg-green-100' :
                                                        invoice.out_status === 'overdue' ? 'bg-red-100' :
                                                        'bg-indigo-100'
                                                    }`}>
                                                        <StatusIcon className={`w-6 h-6 ${
                                                            invoice.out_status === 'paid' ? 'text-green-600' :
                                                            invoice.out_status === 'overdue' ? 'text-red-600' :
                                                            'text-indigo-600'
                                                        }`} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-slate-800">
                                                            {invoice.out_invoice_number}
                                                        </h4>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            {invoice.out_person_name && (
                                                                <span className="text-xs text-slate-500">
                                                                    {invoice.out_person_name}
                                                                </span>
                                                            )}
                                                            {invoice.out_case_reference && (
                                                                <>
                                                                    <span className="text-xs text-slate-300">|</span>
                                                                    <span className="text-xs text-slate-500">
                                                                        {invoice.out_case_reference}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-lg font-semibold text-slate-800">
                                                            {formatCurrency(invoice.out_amount_due, invoice.out_currency)}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-xs px-2 py-1 rounded-full ${statusConfig.className}`}>
                                                                {statusConfig.label}
                                                            </span>
                                                            {invoice.out_has_payment_proof && (
                                                                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                                                                    Proof Submitted
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-xs text-slate-400 hidden md:block">
                                                        {invoice.out_due_date && (
                                                            <p>Due: {format(parseISO(invoice.out_due_date), 'MMM d, yyyy')}</p>
                                                        )}
                                                        <p>
                                                            {formatDistanceToNow(parseISO(invoice.out_created_at), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-slate-400" />
                                                </div>
                                            </div>

                                            {/* Mobile view for amount */}
                                            <div className="flex items-center justify-between mt-3 sm:hidden">
                                                <span className={`text-xs px-2 py-1 rounded-full ${statusConfig.className}`}>
                                                    {statusConfig.label}
                                                </span>
                                                <p className="text-lg font-semibold text-slate-800">
                                                    {formatCurrency(invoice.out_amount_due, invoice.out_currency)}
                                                </p>
                                            </div>
                                        </Link>
                                    </motion.div>
                                )
                            })}
                        </div>
                    )}
                </motion.div>
            </div>

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
