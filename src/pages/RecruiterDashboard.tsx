import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, getRecruiterCases, getRecruiterStats, getPortalUserInfo, type PortalUserInfo } from '@/lib/supabase'
import { motion } from 'framer-motion'
import {
    Users,
    Clock,
    CheckCircle2,
    ChevronRight,
    Search,
    Filter,
    LogOut,
    DollarSign,
    Building2,
    RefreshCw
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface RecruiterCase {
    out_id: string
    out_case_reference: string
    out_external_case_number: string | null
    out_status: string
    out_priority: string
    out_created_at: string
    out_updated_at: string
    out_share_updates_with_candidate: boolean
    out_person_first_name: string
    out_person_last_name: string
    out_person_email: string
    out_pipeline_name: string
    out_current_stage_name: string
}

interface RecruiterStats {
    total_cases: number
    active_cases: number
    completed_cases: number
    pending_commission: number
    total_commission_earned: number
}

export default function RecruiterDashboard() {
    const navigate = useNavigate()
    const [portalUser, setPortalUser] = useState<PortalUserInfo | null>(null)
    const [cases, setCases] = useState<RecruiterCase[]>([])
    const [stats, setStats] = useState<RecruiterStats | null>(null)
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
                // Not a recruiter, redirect to applicant dashboard
                navigate('/dashboard')
                return
            }
            setPortalUser(userInfo)

            // Load cases and stats in parallel
            const [casesResult, statsResult] = await Promise.all([
                getRecruiterCases(),
                getRecruiterStats()
            ])

            setCases(casesResult.data || [])
            setStats(statsResult.data)
        } catch (err) {
            console.error('Error loading recruiter data:', err)
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

    const filteredCases = cases.filter(c => {
        const matchesSearch = searchQuery === '' ||
            `${c.out_person_first_name} ${c.out_person_last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.out_case_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.out_external_case_number?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = statusFilter === 'all' || c.out_status === statusFilter

        return matchesSearch && matchesStatus
    })

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-blue-100 text-blue-700'
            case 'completed': return 'bg-green-100 text-green-700'
            case 'on_hold': return 'bg-amber-100 text-amber-700'
            case 'cancelled': return 'bg-red-100 text-red-700'
            default: return 'bg-slate-100 text-slate-700'
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
                    <p className="text-slate-600 font-medium">Loading your dashboard...</p>
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
                                <h1 className="font-semibold text-slate-800">Recruiter Portal</h1>
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

            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-8 sm:py-12">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Building2 className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-bold">
                                    Welcome back, {portalUser?.first_name || 'Partner'}!
                                </h2>
                                <p className="text-white/80 mt-1">
                                    Track your candidates' application progress
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
                                <Users className="w-5 h-5 text-indigo-600" />
                            </div>
                            <span className="text-sm text-slate-500">Total Candidates</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats?.total_cases || 0}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl shadow-sm p-5"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-sm text-slate-500">In Progress</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats?.active_cases || 0}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl shadow-sm p-5"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="text-sm text-slate-500">Completed</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats?.completed_cases || 0}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white rounded-2xl shadow-sm p-5"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="text-sm text-slate-500">Commission Earned</span>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">
                            ${(stats?.total_commission_earned || 0).toLocaleString()}
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
                            placeholder="Search candidates by name or reference..."
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
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="on_hold">On Hold</option>
                        </select>
                    </div>
                </div>

                {/* Cases List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white rounded-2xl shadow-sm overflow-hidden"
                >
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-800">
                            Your Candidates ({filteredCases.length})
                        </h3>
                    </div>

                    {filteredCases.length === 0 ? (
                        <div className="p-12 text-center">
                            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">
                                {cases.length === 0
                                    ? 'No candidates yet. Candidates you refer will appear here.'
                                    : 'No candidates match your search criteria.'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredCases.map((caseItem, index) => (
                                <motion.div
                                    key={caseItem.out_id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Link
                                        to={`/recruiter/case/${caseItem.out_id}`}
                                        className="block p-5 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                    {caseItem.out_person_first_name?.charAt(0) || '?'}
                                                    {caseItem.out_person_last_name?.charAt(0) || ''}
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-slate-800">
                                                        {caseItem.out_person_first_name} {caseItem.out_person_last_name}
                                                    </h4>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-xs text-slate-500">
                                                            {caseItem.out_external_case_number || caseItem.out_case_reference}
                                                        </span>
                                                        <span className="text-xs text-slate-300">|</span>
                                                        <span className="text-xs text-slate-500">
                                                            {caseItem.out_pipeline_name}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right hidden sm:block">
                                                    <div className={`text-sm px-3 py-1 rounded-full ${getStatusColor(caseItem.out_status)}`}>
                                                        {caseItem.out_current_stage_name || caseItem.out_status}
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        Updated {formatDistanceToNow(new Date(caseItem.out_updated_at), { addSuffix: true })}
                                                    </p>
                                                </div>
                                                {!caseItem.out_share_updates_with_candidate && (
                                                    <span className="text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded-full hidden lg:block">
                                                        Private
                                                    </span>
                                                )}
                                                <ChevronRight className="w-5 h-5 text-slate-400" />
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
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
