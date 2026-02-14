import { useState, useEffect, useMemo } from 'react'
import { Search, ArrowLeft, Building2, Globe, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

interface VerificationFee {
    name: string
    code: string
    country: string | null
    institution_type: string | null
    fee_amount: number
    fee_currency: string
    website: string | null
}

export default function VerificationFeeChecker() {
    const [fees, setFees] = useState<VerificationFee[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [countryFilter, setCountryFilter] = useState('all')

    useEffect(() => {
        const fetchFees = async () => {
            try {
                const response = await fetch(
                    `${SUPABASE_URL}/functions/v1/get-verification-fees`,
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                        },
                    }
                )

                const result = await response.json()
                if (!response.ok) {
                    throw new Error(result.error || 'Failed to load fees')
                }

                setFees(result.fees || [])
            } catch (err: any) {
                console.error('Failed to fetch verification fees:', err)
                setError(err.message || 'Unable to load fee data')
            } finally {
                setIsLoading(false)
            }
        }

        fetchFees()
    }, [])

    const countries = useMemo(
        () => [...new Set(fees.map((f) => f.country).filter(Boolean))] as string[],
        [fees]
    )

    const filteredFees = useMemo(() => {
        let result = fees

        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            result = result.filter(
                (f) =>
                    f.name.toLowerCase().includes(q) ||
                    f.code.toLowerCase().includes(q)
            )
        }

        if (countryFilter !== 'all') {
            result = result.filter((f) => f.country === countryFilter)
        }

        return result
    }, [fees, searchQuery, countryFilter])

    const formatFee = (amount: number, currency: string) => {
        try {
            return new Intl.NumberFormat('en', {
                style: 'currency',
                currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }).format(amount)
        } catch {
            return `${currency} ${amount.toLocaleString()}`
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link to="/support" className="text-slate-500 hover:text-slate-700">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800">ELAB Solutions</h1>
                                <p className="text-xs text-slate-500">DataFlow Verification Fee Guide</p>
                            </div>
                        </div>
                        <Link
                            to="/support"
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                        >
                            Support Portal
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h2 className="text-3xl font-bold text-slate-800 mb-3">
                        Verification Fee Guide
                    </h2>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Look up the DataFlow verification fee charged by each issuing institution.
                        Fees vary by institution and are subject to change.
                    </p>
                </motion.div>

                {/* Search & Filter */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col sm:flex-row gap-3 mb-6"
                >
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by institution name or code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none"
                        />
                    </div>
                    <select
                        value={countryFilter}
                        onChange={(e) => setCountryFilter(e.target.value)}
                        className="px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none bg-white sm:w-[200px]"
                    >
                        <option value="all">All Countries</option>
                        {countries.map((country) => (
                            <option key={country} value={country}>
                                {country}
                            </option>
                        ))}
                    </select>
                </motion.div>

                {/* Loading State */}
                {isLoading && (
                    <div className="grid gap-4 md:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
                                <div className="h-5 bg-slate-200 rounded w-3/4 mb-3" />
                                <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
                                <div className="h-8 bg-slate-200 rounded w-1/3" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="glass-card rounded-2xl p-8 text-center"
                    >
                        <AlertTriangle className="mx-auto w-10 h-10 text-amber-500 mb-3" />
                        <h3 className="font-semibold text-slate-800 mb-1">Unable to load fees</h3>
                        <p className="text-sm text-slate-600">{error}</p>
                    </motion.div>
                )}

                {/* Empty State */}
                {!isLoading && !error && filteredFees.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="glass-card rounded-2xl p-8 text-center"
                    >
                        <Building2 className="mx-auto w-10 h-10 text-slate-400 mb-3" />
                        <h3 className="font-semibold text-slate-800 mb-1">
                            {searchQuery || countryFilter !== 'all'
                                ? 'No matching institutions found'
                                : 'No verification fees available yet'}
                        </h3>
                        <p className="text-sm text-slate-600">
                            {searchQuery || countryFilter !== 'all'
                                ? 'Try adjusting your search or filter'
                                : 'Fee data will appear here once configured by the team.'}
                        </p>
                    </motion.div>
                )}

                {/* Fee Cards */}
                {!isLoading && !error && filteredFees.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        className="grid gap-4 md:grid-cols-2"
                    >
                        {filteredFees.map((fee, index) => (
                            <motion.div
                                key={fee.code}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="glass-card rounded-2xl p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-slate-800 leading-tight">
                                            {fee.name}
                                        </h3>
                                        {fee.website && (
                                            <a
                                                href={fee.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-primary-600 hover:underline mt-0.5 inline-block"
                                            >
                                                Visit website
                                            </a>
                                        )}
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                        {fee.code}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    {fee.country && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                            <Globe className="w-3 h-3" />
                                            {fee.country}
                                        </span>
                                    )}
                                </div>
                                <div className="text-2xl font-bold text-primary-600">
                                    {formatFee(fee.fee_amount, fee.fee_currency)}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {/* Disclaimer */}
                {!isLoading && !error && fees.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4"
                    >
                        <div className="flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-900">
                                <p className="font-medium mb-1">Disclaimer</p>
                                <p>
                                    Fees shown are based on information available at the time of publishing
                                    and are subject to change without notice. Please confirm directly with
                                    the issuing institution or contact our team for the most up-to-date rates.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t bg-white/50 mt-auto">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="text-center text-sm text-slate-500">
                        <p>&copy; {new Date().getFullYear()} ELAB Solutions International LLC. All rights reserved.</p>
                        <p className="mt-1">Lagos, Nigeria | Houston, Texas, USA</p>
                        <p className="mt-2 space-x-3">
                            <Link to="/support" className="text-primary-600 hover:underline">
                                Support Portal
                            </Link>
                            <span>&middot;</span>
                            <Link to="/refund-policy" className="text-primary-600 hover:underline">
                                Refund Policy
                            </Link>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
