import { motion } from 'framer-motion'
import { DollarSign, CheckCircle2, Clock, Receipt } from 'lucide-react'
import type { ContactPaymentSummary, PaymentType } from '@/lib/supabase'
import { PAYMENT_TYPE_LABELS } from '@/lib/supabase'

interface AccruedPaymentsCardProps {
    summary: ContactPaymentSummary | null
    isLoading: boolean
}

function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
    }).format(amount)
}

export function AccruedPaymentsCard({ summary, isLoading }: AccruedPaymentsCardProps) {
    if (isLoading) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-xl p-6"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">Accrued Payments</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-slate-100 rounded-lg p-3 animate-pulse">
                            <div className="h-4 bg-slate-200 rounded w-16 mb-2" />
                            <div className="h-6 bg-slate-200 rounded w-24" />
                        </div>
                    ))}
                </div>
            </motion.div>
        )
    }

    if (!summary || summary.total_payments_count === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-xl p-6"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">Accrued Payments</h3>
                </div>
                <div className="text-center py-6 text-slate-500">
                    <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No payment records yet</p>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">Accrued Payments</h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    {summary.total_payments_count} payment{summary.total_payments_count !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Summary Totals */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Total Amount */}
                <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-xs font-medium">Total</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800">
                        {formatCurrency(summary.total_amount, summary.currency)}
                    </p>
                </div>

                {/* Confirmed Amount */}
                <div className="bg-emerald-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-medium">Confirmed</span>
                    </div>
                    <p className="text-xl font-bold text-emerald-700">
                        {formatCurrency(summary.confirmed_amount, summary.currency)}
                    </p>
                </div>

                {/* Pending Amount */}
                <div className="bg-amber-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-amber-600 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-medium">Pending</span>
                    </div>
                    <p className="text-xl font-bold text-amber-700">
                        {formatCurrency(summary.pending_amount, summary.currency)}
                    </p>
                </div>
            </div>

            {/* Breakdown by Type */}
            {summary.breakdown_by_type.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        Breakdown by Type
                    </h4>
                    <div className="space-y-2">
                        {summary.breakdown_by_type.map((item) => (
                            <div
                                key={item.type}
                                className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg"
                            >
                                <div>
                                    <p className="text-sm font-medium text-slate-700">
                                        {PAYMENT_TYPE_LABELS[item.type] || item.type}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {item.count} payment{item.count !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-800">
                                        {formatCurrency(item.total, summary.currency)}
                                    </p>
                                    {item.pending > 0 && (
                                        <p className="text-xs text-amber-600">
                                            {formatCurrency(item.pending, summary.currency)} pending
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    )
}
