import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getRecruiterCase, getRecruiterCaseStageHistory, getPortalUserInfo, createServiceRequest } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { jsPDF } from 'jspdf'
import {
    ArrowLeft,
    Clock,
    CheckCircle2,
    AlertCircle,
    Calendar,
    User,
    Briefcase,
    Shield,
    RefreshCw,
    Mail,
    Phone,
    TrendingUp,
    FileText,
    Download,
    CreditCard,
    Receipt,
    Sparkles,
    ArrowRight,
    Star,
    Zap,
    X,
    Send,
    Loader2,
    Timer,
    Award,
    Target
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface CaseDetails {
    out_id: string
    out_case_reference: string
    out_external_case_number: string | null
    out_status: string
    out_priority: string
    out_created_at: string
    out_updated_at: string
    out_start_date: string | null
    out_share_updates_with_candidate: boolean
    out_person_id: string
    out_person_first_name: string
    out_person_last_name: string
    out_person_email: string
    out_person_phone: string | null
    out_pipeline_id: string
    out_pipeline_name: string
    out_current_stage_id: string
    out_current_stage_name: string
}

interface StageHistoryItem {
    id: string
    created_at: string
    notes: string | null
    from_stage_name: string | null
    to_stage_name: string
}

interface ServiceRequestModal {
    isOpen: boolean
    serviceName: string
    serviceCategory: string
    notes: string
}

export default function RecruiterCaseView() {
    const { caseId } = useParams<{ caseId: string }>()
    const navigate = useNavigate()
    const [caseData, setCaseData] = useState<CaseDetails | null>(null)
    const [stageHistory, setStageHistory] = useState<StageHistoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Service request modal state
    const [serviceModal, setServiceModal] = useState<ServiceRequestModal>({
        isOpen: false,
        serviceName: '',
        serviceCategory: '',
        notes: ''
    })
    const [submittingRequest, setSubmittingRequest] = useState(false)
    const [requestSuccess, setRequestSuccess] = useState(false)

    useEffect(() => {
        loadData()
    }, [caseId])

    const loadData = async () => {
        try {
            // Verify user is a recruiter
            const { data: userInfo } = await getPortalUserInfo()
            if (!userInfo || userInfo.user_type !== 'recruiter') {
                navigate('/dashboard')
                return
            }

            if (!caseId) {
                setError('Case ID is required')
                setLoading(false)
                return
            }

            // Load case details
            const { data: caseResult, error: caseError } = await getRecruiterCase(caseId)
            if (caseError) throw caseError
            if (!caseResult) {
                setError('Case not found or you do not have access')
                setLoading(false)
                return
            }
            setCaseData(caseResult)

            // Load stage history
            const { data: historyResult } = await getRecruiterCaseStageHistory(caseId)
            setStageHistory(historyResult || [])

        } catch (err: any) {
            console.error('Error loading case:', err)
            setError(err.message || 'Failed to load case details')
        } finally {
            setLoading(false)
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadData()
        setRefreshing(false)
    }

    const openServiceRequest = (serviceName: string, category: string) => {
        setServiceModal({
            isOpen: true,
            serviceName,
            serviceCategory: category,
            notes: ''
        })
        setRequestSuccess(false)
    }

    const closeServiceModal = () => {
        setServiceModal({
            isOpen: false,
            serviceName: '',
            serviceCategory: '',
            notes: ''
        })
        setRequestSuccess(false)
    }

    const submitServiceRequest = async () => {
        if (!caseData) return

        setSubmittingRequest(true)
        try {
            const { error } = await createServiceRequest({
                candidateName: `${caseData.out_person_first_name} ${caseData.out_person_last_name}`,
                candidateEmail: caseData.out_person_email,
                candidatePhone: caseData.out_person_phone || undefined,
                requestedService: serviceModal.serviceName,
                serviceCategory: serviceModal.serviceCategory,
                relatedCaseId: caseData.out_id,
                relatedCaseReference: caseData.out_case_reference,
                relatedPipelineName: caseData.out_pipeline_name,
                urgency: 'normal',
                notes: serviceModal.notes || undefined
            })

            if (error) throw error

            setRequestSuccess(true)
            // Auto-close after 2 seconds
            setTimeout(() => {
                closeServiceModal()
            }, 2500)
        } catch (err: any) {
            console.error('Error submitting service request:', err)
            alert('Failed to submit request. Please try again.')
        } finally {
            setSubmittingRequest(false)
        }
    }

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
            active: {
                icon: <Clock className="w-5 h-5" />,
                bg: 'bg-blue-100',
                text: 'text-blue-700',
                label: 'In Progress'
            },
            completed: {
                icon: <CheckCircle2 className="w-5 h-5" />,
                bg: 'bg-green-100',
                text: 'text-green-700',
                label: 'Completed'
            },
            on_hold: {
                icon: <AlertCircle className="w-5 h-5" />,
                bg: 'bg-amber-100',
                text: 'text-amber-700',
                label: 'On Hold'
            },
            cancelled: {
                icon: <AlertCircle className="w-5 h-5" />,
                bg: 'bg-red-100',
                text: 'text-red-700',
                label: 'Cancelled'
            }
        }
        return configs[status] || configs.active
    }

    const getPriorityConfig = (priority: string) => {
        const configs: Record<string, { bg: string; text: string; border: string; label: string }> = {
            urgent: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', label: 'Urgent' },
            high: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', label: 'High Priority' },
            normal: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', label: 'Normal' },
            low: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', label: 'Low' }
        }
        return configs[priority] || null
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
                    <p className="text-slate-600 font-medium">Loading case details...</p>
                </div>
            </div>
        )
    }

    if (error || !caseData) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl p-8 max-w-md text-center shadow-lg"
                >
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Case not found</h2>
                    <p className="text-slate-600 mb-6">{error || 'Unable to load case details.'}</p>
                    <Link
                        to="/recruiter/dashboard"
                        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                </motion.div>
            </div>
        )
    }

    const statusConfig = getStatusConfig(caseData.out_status)

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <Link
                            to="/recruiter/dashboard"
                            className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </Link>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors text-sm disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold">
                                    {caseData.out_person_first_name?.charAt(0) || '?'}
                                    {caseData.out_person_last_name?.charAt(0) || ''}
                                </div>
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold">
                                        {caseData.out_person_first_name} {caseData.out_person_last_name}
                                    </h1>
                                    <p className="text-white/80 mt-1">
                                        {caseData.out_pipeline_name}
                                    </p>
                                    <p className="text-white/60 text-sm mt-1">
                                        Ref: {caseData.out_external_case_number || caseData.out_case_reference}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                                    {statusConfig.icon}
                                    <span className="font-medium">{statusConfig.label}</span>
                                </div>
                                {/* Priority Badge */}
                                {getPriorityConfig(caseData.out_priority) && caseData.out_priority !== 'normal' && (
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityConfig(caseData.out_priority)?.bg} ${getPriorityConfig(caseData.out_priority)?.text} ${getPriorityConfig(caseData.out_priority)?.border}`}>
                                        {getPriorityConfig(caseData.out_priority)?.label}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                {/* Privacy Notice */}
                {!caseData.out_share_updates_with_candidate && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3"
                    >
                        <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                            <p className="text-amber-800 font-medium">Private Processing</p>
                            <p className="text-amber-600 text-sm">
                                Updates for this candidate are sent to you. The candidate does not receive direct notifications.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Current Stage Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-sm p-6 mb-6"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Current Stage</p>
                            <h2 className="text-xl font-bold text-slate-800">
                                {caseData.out_current_stage_name || 'Processing'}
                            </h2>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500">
                        Last updated {formatDistanceToNow(new Date(caseData.out_updated_at), { addSuffix: true })}
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Candidate Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl shadow-sm p-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                <User className="w-5 h-5 text-indigo-600" />
                            </div>
                            <h3 className="font-semibold text-slate-800">Candidate Details</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wider">Full Name</p>
                                <p className="text-slate-800 font-medium">
                                    {caseData.out_person_first_name} {caseData.out_person_last_name}
                                </p>
                            </div>
                            {caseData.out_person_email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <p className="text-slate-600 text-sm">{caseData.out_person_email}</p>
                                </div>
                            )}
                            {caseData.out_person_phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <p className="text-slate-600 text-sm">{caseData.out_person_phone}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Case Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl shadow-sm p-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="font-semibold text-slate-800">Case Information</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wider">Service</p>
                                <p className="text-slate-800 font-medium">{caseData.out_pipeline_name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wider">Reference</p>
                                <p className="text-slate-800 font-medium">
                                    {caseData.out_external_case_number || caseData.out_case_reference}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <p className="text-slate-600 text-sm">
                                    Started {format(new Date(caseData.out_start_date || caseData.out_created_at), 'MMMM d, yyyy')}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Premium Enhanced Timeline */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-white via-white to-indigo-50/30 rounded-2xl shadow-lg border border-slate-100/50 p-6 mt-6 overflow-hidden relative"
                >
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-100/20 to-purple-100/20 rounded-full blur-3xl -translate-y-32 translate-x-32" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-100/20 to-teal-100/20 rounded-full blur-3xl translate-y-24 -translate-x-24" />

                    <div className="relative z-10">
                        {/* Header with progress indicator */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                                        <Target className="w-7 h-7 text-white" />
                                    </div>
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute inset-0 rounded-2xl bg-emerald-400"
                                    />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Progress Timeline</h3>
                                    <p className="text-sm text-slate-500">Track your application journey</p>
                                </div>
                            </div>
                            {stageHistory.length > 0 && (
                                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-full border border-emerald-100">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span className="text-sm font-medium text-emerald-700">{stageHistory.length} stages completed</span>
                                </div>
                            )}
                        </div>

                        {stageHistory.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-16"
                            >
                                <div className="relative inline-block">
                                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-6">
                                        <Clock className="w-10 h-10 text-slate-400" />
                                    </div>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                                        className="absolute -inset-2 border-2 border-dashed border-slate-200 rounded-[2rem]"
                                    />
                                </div>
                                <p className="text-slate-600 font-semibold text-lg">Your journey begins here</p>
                                <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">
                                    Updates will appear as your application progresses through each stage
                                </p>
                            </motion.div>
                        ) : (
                            <div className="relative">
                                {/* Animated connecting line */}
                                <div className="absolute left-6 top-8 bottom-8 w-1 overflow-hidden rounded-full">
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: '100%' }}
                                        transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                                        className="w-full bg-gradient-to-b from-indigo-500 via-purple-500 to-emerald-400 rounded-full"
                                    />
                                    {/* Shimmer effect */}
                                    <motion.div
                                        animate={{ y: ['-100%', '200%'] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: 1 }}
                                        className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent via-white/40 to-transparent"
                                    />
                                </div>

                                <motion.div
                                    initial="hidden"
                                    animate="visible"
                                    variants={{
                                        hidden: { opacity: 0 },
                                        visible: {
                                            opacity: 1,
                                            transition: { staggerChildren: 0.15, delayChildren: 0.2 }
                                        }
                                    }}
                                    className="space-y-6"
                                >
                                    {stageHistory.map((item, index) => {
                                        const isLatest = index === 0

                                        // Calculate days since previous stage
                                        const nextItem = stageHistory[index + 1]
                                        const daysDiff = nextItem
                                            ? Math.ceil((new Date(item.created_at).getTime() - new Date(nextItem.created_at).getTime()) / (1000 * 60 * 60 * 24))
                                            : null

                                        return (
                                            <motion.div
                                                key={item.id}
                                                variants={{
                                                    hidden: { opacity: 0, x: -30, scale: 0.95 },
                                                    visible: {
                                                        opacity: 1,
                                                        x: 0,
                                                        scale: 1,
                                                        transition: { type: 'spring', stiffness: 100, damping: 15 }
                                                    }
                                                }}
                                                className="relative flex gap-5 group"
                                            >
                                                {/* Enhanced node */}
                                                <div className="relative z-10 flex-shrink-0">
                                                    <motion.div
                                                        whileHover={{ scale: 1.1 }}
                                                        className={`
                                                            w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 relative
                                                            ${isLatest
                                                                ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 shadow-xl shadow-indigo-300/50 ring-4 ring-indigo-100'
                                                                : 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-200/50'
                                                            }
                                                        `}
                                                    >
                                                        {isLatest ? (
                                                            <Sparkles className="w-6 h-6 text-white" />
                                                        ) : (
                                                            <CheckCircle2 className="w-6 h-6 text-white" />
                                                        )}

                                                        {/* Pulse animation for latest */}
                                                        {isLatest && (
                                                            <motion.div
                                                                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                                                                transition={{ duration: 2, repeat: Infinity }}
                                                                className="absolute inset-0 rounded-xl bg-indigo-400"
                                                            />
                                                        )}
                                                    </motion.div>

                                                    {/* Stage number badge */}
                                                    <div className={`
                                                        absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                                                        ${isLatest
                                                            ? 'bg-amber-400 text-amber-900 shadow-lg'
                                                            : 'bg-slate-200 text-slate-600'
                                                        }
                                                    `}>
                                                        {stageHistory.length - index}
                                                    </div>
                                                </div>

                                                {/* Glassmorphism card */}
                                                <motion.div
                                                    whileHover={{ y: -2 }}
                                                    className={`
                                                        flex-1 rounded-2xl p-5 transition-all duration-300 relative overflow-hidden
                                                        ${isLatest
                                                            ? 'bg-gradient-to-br from-white via-indigo-50/50 to-purple-50/50 border-2 border-indigo-200 shadow-xl shadow-indigo-100/50'
                                                            : 'bg-white/80 backdrop-blur-sm border border-slate-200/80 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/30'
                                                        }
                                                    `}
                                                >
                                                    {/* Card decorative gradient */}
                                                    {isLatest && (
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 rounded-full blur-2xl -translate-y-16 translate-x-16" />
                                                    )}

                                                    <div className="relative z-10">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className={`font-bold text-lg ${isLatest ? 'text-indigo-900' : 'text-slate-800'}`}>
                                                                        {item.to_stage_name}
                                                                    </span>
                                                                    {isLatest && (
                                                                        <motion.span
                                                                            animate={{ opacity: [1, 0.6, 1] }}
                                                                            transition={{ duration: 1.5, repeat: Infinity }}
                                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                                                                        >
                                                                            <Sparkles className="w-3 h-3" />
                                                                            Current Stage
                                                                        </motion.span>
                                                                    )}
                                                                </div>

                                                                {item.from_stage_name && (
                                                                    <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                                                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg">
                                                                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                                                            <span>from <span className="font-medium text-slate-600">{item.from_stage_name}</span></span>
                                                                        </div>
                                                                        {daysDiff !== null && daysDiff > 0 && (
                                                                            <div className="flex items-center gap-1 text-xs text-slate-400">
                                                                                <Timer className="w-3 h-3" />
                                                                                <span>{daysDiff} day{daysDiff !== 1 ? 's' : ''}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="text-right flex-shrink-0 ml-4">
                                                                <div className={`text-sm font-semibold ${isLatest ? 'text-indigo-600' : 'text-slate-600'}`}>
                                                                    {format(new Date(item.created_at), 'MMM d, yyyy')}
                                                                </div>
                                                                <div className="text-xs text-slate-400 mt-0.5">
                                                                    {format(new Date(item.created_at), 'h:mm a')}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {item.notes && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                className="mt-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/50"
                                                            >
                                                                <div className="flex items-start gap-2">
                                                                    <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                                                    <p className="text-sm text-slate-600 leading-relaxed">
                                                                        {item.notes}
                                                                    </p>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            </motion.div>
                                        )
                                    })}
                                </motion.div>

                                {/* Journey start indicator */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1 }}
                                    className="flex items-center gap-4 mt-8 pt-6 border-t border-dashed border-slate-200"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                        <Award className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-600">Journey Started</p>
                                        <p className="text-xs text-slate-400">
                                            {caseData && format(new Date(caseData.out_start_date || caseData.out_created_at), 'MMMM d, yyyy')}
                                        </p>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white rounded-2xl shadow-sm p-6 mt-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-orange-600" />
                        </div>
                        <h3 className="font-semibold text-slate-800">Quick Actions</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button
                            onClick={() => {
                                // Generate professional PDF invoice
                                const doc = new jsPDF()
                                const pageWidth = doc.internal.pageSize.getWidth()

                                // Header - Company Name
                                doc.setFillColor(79, 70, 229) // Indigo
                                doc.rect(0, 0, pageWidth, 40, 'F')
                                doc.setTextColor(255, 255, 255)
                                doc.setFontSize(24)
                                doc.setFont('helvetica', 'bold')
                                doc.text('ELAB SOLUTIONS INTERNATIONAL', pageWidth / 2, 20, { align: 'center' })
                                doc.setFontSize(12)
                                doc.setFont('helvetica', 'normal')
                                doc.text('Healthcare Credential Verification Services', pageWidth / 2, 30, { align: 'center' })

                                // Invoice Title
                                doc.setTextColor(79, 70, 229)
                                doc.setFontSize(20)
                                doc.setFont('helvetica', 'bold')
                                doc.text('INVOICE', pageWidth / 2, 55, { align: 'center' })

                                // Invoice details box
                                doc.setDrawColor(200, 200, 200)
                                doc.setFillColor(249, 250, 251)
                                doc.roundedRect(15, 65, pageWidth - 30, 25, 3, 3, 'FD')
                                doc.setTextColor(100, 100, 100)
                                doc.setFontSize(10)
                                doc.setFont('helvetica', 'normal')
                                doc.text(`Invoice No: INV-${caseData.out_case_reference}`, 20, 75)
                                doc.text(`Date: ${format(new Date(), 'MMMM d, yyyy')}`, 20, 82)
                                doc.text(`Reference: ${caseData.out_external_case_number || caseData.out_case_reference}`, pageWidth - 20, 75, { align: 'right' })
                                doc.text(`Status: ${caseData.out_status.toUpperCase()}`, pageWidth - 20, 82, { align: 'right' })

                                // Candidate Information Section
                                doc.setTextColor(79, 70, 229)
                                doc.setFontSize(14)
                                doc.setFont('helvetica', 'bold')
                                doc.text('CANDIDATE INFORMATION', 15, 105)
                                doc.setDrawColor(79, 70, 229)
                                doc.line(15, 108, pageWidth - 15, 108)

                                doc.setTextColor(60, 60, 60)
                                doc.setFontSize(11)
                                doc.setFont('helvetica', 'normal')
                                doc.text(`Name: ${caseData.out_person_first_name} ${caseData.out_person_last_name}`, 15, 118)
                                doc.text(`Email: ${caseData.out_person_email || 'N/A'}`, 15, 126)
                                doc.text(`Phone: ${caseData.out_person_phone || 'N/A'}`, 15, 134)

                                // Service Details Section
                                doc.setTextColor(79, 70, 229)
                                doc.setFontSize(14)
                                doc.setFont('helvetica', 'bold')
                                doc.text('SERVICE DETAILS', 15, 155)
                                doc.line(15, 158, pageWidth - 15, 158)

                                doc.setTextColor(60, 60, 60)
                                doc.setFontSize(11)
                                doc.setFont('helvetica', 'normal')
                                doc.text(`Service: ${caseData.out_pipeline_name}`, 15, 168)
                                doc.text(`Current Stage: ${caseData.out_current_stage_name || 'Processing'}`, 15, 176)
                                doc.text(`Started: ${format(new Date(caseData.out_start_date || caseData.out_created_at), 'MMMM d, yyyy')}`, 15, 184)

                                // Payment Information
                                doc.setTextColor(79, 70, 229)
                                doc.setFontSize(14)
                                doc.setFont('helvetica', 'bold')
                                doc.text('PAYMENT INFORMATION', 15, 205)
                                doc.line(15, 208, pageWidth - 15, 208)

                                doc.setFillColor(243, 244, 246)
                                doc.roundedRect(15, 215, pageWidth - 30, 30, 3, 3, 'F')
                                doc.setTextColor(60, 60, 60)
                                doc.setFontSize(10)
                                doc.text('For payment inquiries and pricing, please contact:', 20, 225)
                                doc.setFont('helvetica', 'bold')
                                doc.setTextColor(79, 70, 229)
                                doc.text('headoffice@elabsolution.org', 20, 235)
                                doc.text('+234 816 563 4195 | +1 (929) 419-2327', pageWidth - 20, 235, { align: 'right' })

                                // Footer
                                doc.setFillColor(79, 70, 229)
                                doc.rect(0, 270, pageWidth, 27, 'F')
                                doc.setTextColor(255, 255, 255)
                                doc.setFontSize(9)
                                doc.setFont('helvetica', 'normal')
                                doc.text('ELAB Solutions International | www.elabsolution.org', pageWidth / 2, 280, { align: 'center' })
                                doc.text('Thank you for choosing ELAB Solutions!', pageWidth / 2, 288, { align: 'center' })

                                // Save PDF
                                doc.save(`Invoice-${caseData.out_case_reference}.pdf`)
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-200"
                        >
                            <Receipt className="w-5 h-5" />
                            <span className="font-medium">Generate Invoice</span>
                        </button>
                        <button
                            onClick={() => {
                                // Download case summary as PDF
                                const doc = new jsPDF()
                                const pageWidth = doc.internal.pageSize.getWidth()

                                // Header
                                doc.setFillColor(59, 130, 246) // Blue
                                doc.rect(0, 0, pageWidth, 35, 'F')
                                doc.setTextColor(255, 255, 255)
                                doc.setFontSize(20)
                                doc.setFont('helvetica', 'bold')
                                doc.text('CASE SUMMARY REPORT', pageWidth / 2, 22, { align: 'center' })

                                // Reference Box
                                doc.setFillColor(239, 246, 255)
                                doc.roundedRect(15, 45, pageWidth - 30, 20, 3, 3, 'F')
                                doc.setTextColor(59, 130, 246)
                                doc.setFontSize(12)
                                doc.text(`Reference: ${caseData.out_case_reference}`, 20, 57)
                                doc.setTextColor(100, 100, 100)
                                doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, pageWidth - 20, 57, { align: 'right' })

                                // Candidate Section
                                doc.setTextColor(59, 130, 246)
                                doc.setFontSize(14)
                                doc.setFont('helvetica', 'bold')
                                doc.text('CANDIDATE INFORMATION', 15, 80)
                                doc.setDrawColor(59, 130, 246)
                                doc.line(15, 83, pageWidth - 15, 83)

                                doc.setTextColor(60, 60, 60)
                                doc.setFontSize(11)
                                doc.setFont('helvetica', 'normal')
                                doc.text(`Full Name: ${caseData.out_person_first_name} ${caseData.out_person_last_name}`, 15, 93)
                                doc.text(`Email: ${caseData.out_person_email || 'N/A'}`, 15, 101)
                                doc.text(`Phone: ${caseData.out_person_phone || 'N/A'}`, 15, 109)

                                // Case Details Section
                                doc.setTextColor(59, 130, 246)
                                doc.setFontSize(14)
                                doc.setFont('helvetica', 'bold')
                                doc.text('CASE DETAILS', 15, 130)
                                doc.line(15, 133, pageWidth - 15, 133)

                                doc.setTextColor(60, 60, 60)
                                doc.setFontSize(11)
                                doc.setFont('helvetica', 'normal')
                                doc.text(`Service: ${caseData.out_pipeline_name}`, 15, 143)
                                doc.text(`External Reference: ${caseData.out_external_case_number || 'N/A'}`, 15, 151)
                                doc.text(`Current Stage: ${caseData.out_current_stage_name || 'Processing'}`, 15, 159)
                                doc.text(`Status: ${caseData.out_status.toUpperCase()}`, 15, 167)
                                doc.text(`Started: ${format(new Date(caseData.out_start_date || caseData.out_created_at), 'MMMM d, yyyy')}`, 15, 175)
                                doc.text(`Last Updated: ${format(new Date(caseData.out_updated_at), 'MMMM d, yyyy h:mm a')}`, 15, 183)

                                // Stage History Section
                                doc.setTextColor(59, 130, 246)
                                doc.setFontSize(14)
                                doc.setFont('helvetica', 'bold')
                                doc.text('PROGRESS TIMELINE', 15, 204)
                                doc.line(15, 207, pageWidth - 15, 207)

                                if (stageHistory.length > 0) {
                                    let yPos = 217
                                    stageHistory.slice(0, 5).forEach((stage, index) => {
                                        doc.setFillColor(index === 0 ? 59 : 200, index === 0 ? 130 : 200, index === 0 ? 246 : 200)
                                        doc.circle(20, yPos - 2, 3, 'F')
                                        doc.setTextColor(60, 60, 60)
                                        doc.setFontSize(10)
                                        doc.setFont('helvetica', 'bold')
                                        doc.text(stage.to_stage_name, 28, yPos)
                                        doc.setFont('helvetica', 'normal')
                                        doc.setTextColor(120, 120, 120)
                                        doc.text(format(new Date(stage.created_at), 'MMM d, yyyy h:mm a'), pageWidth - 20, yPos, { align: 'right' })
                                        yPos += 10
                                    })
                                } else {
                                    doc.setTextColor(150, 150, 150)
                                    doc.setFontSize(10)
                                    doc.text('No stage transitions recorded yet', 15, 217)
                                }

                                // Footer
                                doc.setFillColor(59, 130, 246)
                                doc.rect(0, 275, pageWidth, 22, 'F')
                                doc.setTextColor(255, 255, 255)
                                doc.setFontSize(9)
                                doc.text('ELAB Solutions International | www.elabsolution.org | headoffice@elabsolution.org', pageWidth / 2, 287, { align: 'center' })

                                doc.save(`CaseSummary-${caseData.out_case_reference}.pdf`)
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200"
                        >
                            <Download className="w-5 h-5" />
                            <span className="font-medium">Download Summary</span>
                        </button>
                        <a
                            href="mailto:headoffice@elabsolution.org?subject=Payment%20Inquiry%20-%20Case%20"
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all shadow-lg shadow-purple-200"
                        >
                            <CreditCard className="w-5 h-5" />
                            <span className="font-medium">Make Payment</span>
                        </a>
                    </div>
                </motion.div>

                {/* Smart Cross-Sell Recommendations */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 mt-6 border border-indigo-100"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">Recommended Next Steps</h3>
                            <p className="text-sm text-slate-500">
                                Based on {caseData.out_pipeline_name}, we recommend these services
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* FOR MUMARIS CASES - Cross-sell these services */}
                        {caseData.out_pipeline_name?.toLowerCase().includes('mumaris') && (
                            <>
                                {/* Prometric Exam Booking */}
                                <div className="bg-white rounded-xl p-4 border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-lg transition-all relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-purple-500 text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
                                        Recommended
                                    </div>
                                    <div className="flex items-start gap-3 mb-3 mt-2">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                            <Calendar className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-800">Prometric Exam Booking</h4>
                                            <p className="text-xs text-indigo-600 font-medium">Next step after Mumaris</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Book your healthcare licensing exam with guaranteed slots and full support
                                    </p>
                                    <button
                                        onClick={() => openServiceRequest('Prometric Exam Booking', 'exam')}
                                        className="inline-flex items-center gap-2 w-full justify-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all"
                                    >
                                        Book Exam <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Prometric Tutorial */}
                                <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                            Boost Pass Rate
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-slate-800 mb-1">Prometric Tutorial</h4>
                                    <p className="text-sm text-slate-500 mb-3">
                                        Expert-led exam preparation classes to maximize success
                                    </p>
                                    <button
                                        onClick={() => openServiceRequest('Prometric Tutorial', 'tutorial')}
                                        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                    >
                                        Enroll Now <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* CGFNS / Trumerit */}
                                <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                            <Shield className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                            5% Partner Discount
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-slate-800 mb-1">CGFNS / Trumerit Evaluation</h4>
                                    <p className="text-sm text-slate-500 mb-3">
                                        Credential evaluation for US nursing licensure pathway
                                    </p>
                                    <button
                                        onClick={() => openServiceRequest('CGFNS / Trumerit Evaluation', 'verification')}
                                        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                    >
                                        Request Evaluation <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* OET Exam */}
                                <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                            <Star className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                            Popular
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-slate-800 mb-1">OET Exam Registration</h4>
                                    <p className="text-sm text-slate-500 mb-3">
                                        Occupational English Test for healthcare professionals
                                    </p>
                                    <button
                                        onClick={() => openServiceRequest('OET Exam Registration', 'exam')}
                                        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                    >
                                        Register Now <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* DataFlow */}
                                <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                            5% Partner Discount
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-slate-800 mb-1">DataFlow Verification</h4>
                                    <p className="text-sm text-slate-500 mb-3">
                                        Primary source verification for Gulf countries
                                    </p>
                                    <button
                                        onClick={() => openServiceRequest('DataFlow Verification', 'verification')}
                                        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                    >
                                        Start DataFlow <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </>
                        )}

                        {/* FOR DATAFLOW CASES - Cross-sell these services */}
                        {caseData.out_pipeline_name?.toLowerCase().includes('dataflow') && (
                            <>
                                {/* Mumaris Registration */}
                                <div className="bg-white rounded-xl p-4 border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-lg transition-all relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-purple-500 text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
                                        Recommended
                                    </div>
                                    <div className="flex items-start gap-3 mb-3 mt-2">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                            <Shield className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-800">MumarisPlus Registration</h4>
                                            <p className="text-xs text-emerald-600 font-medium">Saudi licensing system</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Register with Saudi Commission for Health Specialties
                                    </p>
                                    <button
                                        onClick={() => openServiceRequest('MumarisPlus Registration', 'licensing')}
                                        className="inline-flex items-center gap-2 w-full justify-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all"
                                    >
                                        Start Mumaris <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Prometric Exam Booking */}
                                <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                            <Calendar className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                            Next Step
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-slate-800 mb-1">Prometric Exam Booking</h4>
                                    <p className="text-sm text-slate-500 mb-3">
                                        Book your licensing exam with guaranteed slots
                                    </p>
                                    <button
                                        onClick={() => openServiceRequest('Prometric Exam Booking', 'exam')}
                                        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                    >
                                        Book Exam <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Prometric Tutorial */}
                                <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                            Boost Pass Rate
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-slate-800 mb-1">Prometric Tutorial</h4>
                                    <p className="text-sm text-slate-500 mb-3">
                                        Expert preparation classes for exam success
                                    </p>
                                    <button
                                        onClick={() => openServiceRequest('Prometric Tutorial', 'tutorial')}
                                        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                    >
                                        Enroll Now <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* HAAD/DHA Licensing */}
                                <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                            <Briefcase className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                            UAE Licensing
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-slate-800 mb-1">HAAD/DHA Licensing</h4>
                                    <p className="text-sm text-slate-500 mb-3">
                                        Complete UAE healthcare licensing support
                                    </p>
                                    <button
                                        onClick={() => openServiceRequest('HAAD/DHA Licensing', 'licensing')}
                                        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                    >
                                        Start Licensing <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </>
                        )}

                        {/* FOR EXAM BOOKING CASES */}
                        {caseData.out_pipeline_name?.toLowerCase().includes('exam') && (
                            <>
                                {/* Prometric Tutorial */}
                                <div className="bg-white rounded-xl p-4 border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-lg transition-all relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
                                        Highly Recommended
                                    </div>
                                    <div className="flex items-start gap-3 mb-3 mt-2">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                            <Star className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-800">Exam Tutorial Classes</h4>
                                            <p className="text-xs text-amber-600 font-medium">Increase pass rate by 40%</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Expert-led preparation to maximize exam success
                                    </p>
                                    <button
                                        onClick={() => openServiceRequest('Exam Tutorial Classes', 'tutorial')}
                                        className="inline-flex items-center gap-2 w-full justify-center px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all"
                                    >
                                        Enroll in Tutorial <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* DataFlow */}
                                <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                            5% Discount
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-slate-800 mb-1">DataFlow Verification</h4>
                                    <p className="text-sm text-slate-500 mb-3">
                                        Start credential verification process
                                    </p>
                                    <button
                                        onClick={() => openServiceRequest('DataFlow Verification', 'verification')}
                                        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                    >
                                        Start DataFlow <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Mumaris */}
                                <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                            <Shield className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                            Saudi License
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-slate-800 mb-1">MumarisPlus Registration</h4>
                                    <p className="text-sm text-slate-500 mb-3">
                                        Saudi healthcare licensing system
                                    </p>
                                    <button
                                        onClick={() => openServiceRequest('MumarisPlus Registration', 'licensing')}
                                        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                    >
                                        Start Mumaris <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Contact CTA */}
                    <div className="mt-6 p-4 bg-white/70 rounded-xl border border-indigo-200 text-center">
                        <p className="text-slate-600 mb-2">
                            Need a custom package for your candidates?
                        </p>
                        <button
                            onClick={() => openServiceRequest('Custom Package Request', 'custom')}
                            className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all"
                        >
                            Request Custom Package
                        </button>
                    </div>
                </motion.div>
            </main>

            {/* Service Request Modal */}
            {serviceModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Request Service</h3>
                                    <p className="text-indigo-100 text-sm">{serviceModal.serviceName}</p>
                                </div>
                                <button
                                    onClick={closeServiceModal}
                                    className="p-1 rounded-full hover:bg-white/20 transition-colors"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            {requestSuccess ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center py-6"
                                >
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800 mb-2">Request Submitted!</h4>
                                    <p className="text-slate-500 text-sm">
                                        Our team will review your request and contact you shortly.
                                    </p>
                                </motion.div>
                            ) : (
                                <>
                                    {/* Candidate Info */}
                                    <div className="bg-slate-50 rounded-xl p-4 mb-4">
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Candidate</p>
                                        <p className="font-medium text-slate-800">
                                            {caseData?.out_person_first_name} {caseData?.out_person_last_name}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {caseData?.out_person_email}
                                        </p>
                                        <p className="text-xs text-indigo-600 mt-2">
                                            Current Service: {caseData?.out_pipeline_name}
                                        </p>
                                    </div>

                                    {/* Service Info */}
                                    <div className="mb-4">
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Requested Service</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                                <Sparkles className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">{serviceModal.serviceName}</p>
                                                <p className="text-xs text-slate-500 capitalize">{serviceModal.serviceCategory}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="mb-4">
                                        <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">
                                            Additional Notes (Optional)
                                        </label>
                                        <textarea
                                            value={serviceModal.notes}
                                            onChange={(e) => setServiceModal({ ...serviceModal, notes: e.target.value })}
                                            placeholder="Any specific requirements or questions..."
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                            rows={3}
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        onClick={submitServiceRequest}
                                        disabled={submittingRequest}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submittingRequest ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5" />
                                                Submit Request
                                            </>
                                        )}
                                    </button>

                                    <p className="text-xs text-slate-400 text-center mt-3">
                                        Our team will contact you within 24 hours
                                    </p>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}
