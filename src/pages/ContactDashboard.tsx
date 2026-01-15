import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
    Building2, FileText, Clock, CheckCircle2, AlertCircle,
    LogOut, RefreshCcw, User, Search, Filter, ChevronRight,
    ArrowUpRight, Calendar
} from 'lucide-react'
import { supabase, getUser, signOut } from '@/lib/supabase'

// Types
interface VerificationRequest {
    id: string
    request_reference: string
    dataflow_case_number: string | null
    status: string
    priority: string
    requested_at: string
    completed_at: string | null
    case_reference: string | null
    applicant_name: string | null
}

interface ContactProfile {
    id: string
    first_name: string
    last_name: string
    email: string
    title: string | null
    institution_name: string
    institution_code: string
}

interface Stats {
    total: number
    pending: number
    in_progress: number
    completed: number
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    pending: { label: 'Pending', color: 'text-amber-700', bgColor: 'bg-amber-50' },
    sent_to_contact: { label: 'Awaiting Review', color: 'text-blue-700', bgColor: 'bg-blue-50' },
    in_progress: { label: 'In Progress', color: 'text-indigo-700', bgColor: 'bg-indigo-50' },
    verification_sent: { label: 'Verification Sent', color: 'text-purple-700', bgColor: 'bg-purple-50' },
    completed: { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-50' },
    rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-50' },
    cancelled: { label: 'Cancelled', color: 'text-slate-700', bgColor: 'bg-slate-50' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
    low: { label: 'Low', color: 'text-slate-500' },
    normal: { label: 'Normal', color: 'text-blue-500' },
    high: { label: 'High', color: 'text-orange-500' },
    urgent: { label: 'Urgent', color: 'text-red-500' },
}

export default function ContactDashboard() {
    const navigate = useNavigate()
    const [profile, setProfile] = useState<ContactProfile | null>(null)
    const [requests, setRequests] = useState<VerificationRequest[]>([])
    const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, in_progress: 0, completed: 0 })
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
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
                setError('Access denied. This account is not an institutional contact.')
                return
            }

            const contactId = portalUser.institutional_contact_id

            // Get contact profile
            const { data: contactData, error: contactError } = await supabase
                .from('institutional_contacts')
                .select(`
                    id, first_name, last_name, email, title,
                    institution:institutions(name, code)
                `)
                .eq('id', contactId)
                .single()

            if (contactError || !contactData) {
                setError('Failed to load profile')
                return
            }

            setProfile({
                id: contactData.id,
                first_name: contactData.first_name,
                last_name: contactData.last_name,
                email: contactData.email,
                title: contactData.title,
                institution_name: (contactData.institution as any)?.name || '',
                institution_code: (contactData.institution as any)?.code || '',
            })

            // Get verification requests assigned to this contact
            const { data: requestsData, error: requestsError } = await supabase
                .from('verification_requests')
                .select(`
                    id, request_reference, dataflow_case_number, status, priority,
                    requested_at, completed_at,
                    case:cases(case_reference)
                `)
                .eq('contact_id', contactId)
                .order('created_at', { ascending: false })

            if (requestsError) {
                console.error('Error loading requests:', requestsError)
            }

            const formattedRequests = (requestsData || []).map((r: any) => ({
                id: r.id,
                request_reference: r.request_reference,
                dataflow_case_number: r.dataflow_case_number,
                status: r.status,
                priority: r.priority,
                requested_at: r.requested_at,
                completed_at: r.completed_at,
                case_reference: r.case?.case_reference || null,
                applicant_name: null, // Will be fetched separately if needed
            }))

            setRequests(formattedRequests)

            // Calculate stats
            const statsData = {
                total: formattedRequests.length,
                pending: formattedRequests.filter((r: any) => ['pending', 'sent_to_contact'].includes(r.status)).length,
                in_progress: formattedRequests.filter((r: any) => r.status === 'in_progress').length,
                completed: formattedRequests.filter((r: any) => ['completed', 'verification_sent'].includes(r.status)).length,
            }
            setStats(statsData)

        } catch (err: any) {
            setError(err.message || 'Failed to load data')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    const filteredRequests = requests.filter(r => {
        const matchesSearch = !searchQuery ||
            r.request_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.dataflow_case_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.applicant_name?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = statusFilter === 'all' || r.status === statusFilter

        return matchesSearch && matchesStatus
    })

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                    <p className="text-slate-600">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6">
                <div className="glass-card rounded-2xl p-8 max-w-md text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Error</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
            {/* Header */}
            <header className="glass-card border-b border-slate-200/50 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img src="/elab-logo.png" alt="ELAB Solutions" className="h-10" />
                        <div className="hidden sm:block">
                            <h1 className="text-lg font-semibold text-slate-800">Verification Portal</h1>
                            <p className="text-sm text-slate-500">{profile?.institution_name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadData}
                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Refresh"
                        >
                            <RefreshCcw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Welcome Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                            <User className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">
                                Welcome, {profile?.first_name}!
                            </h2>
                            <p className="text-slate-600">
                                {profile?.title && `${profile.title} at `}{profile?.institution_name}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                >
                    <div className="glass-card rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                                <p className="text-sm text-slate-500">Total Requests</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{stats.pending}</p>
                                <p className="text-sm text-slate-500">Pending</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <ArrowUpRight className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{stats.in_progress}</p>
                                <p className="text-sm text-slate-500">In Progress</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{stats.completed}</p>
                                <p className="text-sm text-slate-500">Completed</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card rounded-xl p-4 mb-6"
                >
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by reference, DataFlow case, or applicant..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-slate-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-2.5 rounded-lg border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="sent_to_contact">Awaiting Review</option>
                                <option value="in_progress">In Progress</option>
                                <option value="verification_sent">Verification Sent</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                    </div>
                </motion.div>

                {/* Requests List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">
                        Verification Requests
                    </h3>

                    {filteredRequests.length === 0 ? (
                        <div className="glass-card rounded-xl p-12 text-center">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-600">
                                {requests.length === 0
                                    ? 'No verification requests assigned yet'
                                    : 'No requests match your search'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredRequests.map((request, index) => (
                                <motion.div
                                    key={request.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 * index }}
                                >
                                    <Link
                                        to={`/contact/request/${request.id}`}
                                        className="glass-card rounded-xl p-4 flex items-center gap-4 hover:shadow-lg transition-all group"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                                            <Building2 className="w-6 h-6 text-emerald-600" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-slate-800 truncate">
                                                    {request.request_reference}
                                                </h4>
                                                {request.priority !== 'normal' && (
                                                    <span className={`text-xs font-medium ${priorityConfig[request.priority]?.color}`}>
                                                        {priorityConfig[request.priority]?.label}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-600 truncate">
                                                {request.applicant_name || 'Unknown Applicant'}
                                                {request.dataflow_case_number && ` • DF: ${request.dataflow_case_number}`}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-xs text-slate-500">
                                                    {new Date(request.requested_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[request.status]?.bgColor} ${statusConfig[request.status]?.color}`}>
                                                {statusConfig[request.status]?.label || request.status}
                                            </span>
                                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
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
