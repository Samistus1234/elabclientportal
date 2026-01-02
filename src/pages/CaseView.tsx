import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import {
    ArrowLeft,
    Clock,
    CheckCircle2,
    AlertCircle,
    FileText,
    MessageSquare,
    Sparkles,
    RefreshCw,
    Calendar,
    TrendingUp,
    Target,
    Zap
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import TimelineView from '@/components/TimelineView'
import AISummaryCard from '@/components/AISummaryCard'
import StageProgressVisualization from '@/components/StageProgressVisualization'

interface CaseDetails {
    id: string
    case_reference: string
    status: string
    priority: string
    created_at: string
    updated_at: string
    start_date: string | null
    metadata: Record<string, any>
    pipeline: {
        id: string
        name: string
        slug: string
    } | null
    current_stage: {
        id: string
        name: string
        slug: string
    } | null
    person?: {
        first_name: string
        last_name: string
    }
}

// Normalize the flat RPC response to match the expected interface
const normalizeCase = (c: any): CaseDetails | null => {
    // Handle null, undefined, or error responses from RPC
    if (!c || c.error) return null

    // Handle both prefixed (out_) and non-prefixed column names
    const id = c.out_id || c.id
    if (!id) return null

    return {
        id: id,
        case_reference: c.out_case_reference || c.case_reference || '',
        status: c.out_status || c.status || 'active',
        priority: c.out_priority || c.priority || 'normal',
        created_at: c.out_created_at || c.created_at || new Date().toISOString(),
        updated_at: c.out_updated_at || c.updated_at || new Date().toISOString(),
        start_date: c.out_start_date || c.start_date || null,
        metadata: c.out_metadata || c.metadata || {},
        pipeline: (c.out_pipeline_name || c.pipeline_name) ? {
            id: c.out_pipeline_id || c.pipeline_id,
            name: c.out_pipeline_name || c.pipeline_name,
            slug: c.out_pipeline_slug || c.pipeline_slug || ''
        } : null,
        current_stage: (c.out_current_stage_name || c.current_stage_name) ? {
            id: c.out_current_stage_id || c.current_stage_id,
            name: c.out_current_stage_name || c.current_stage_name,
            slug: c.out_current_stage_slug || c.current_stage_slug || ''
        } : null,
    }
}

// Safe date parsing to prevent RangeError with invalid dates
const safeParseDate = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null
    try {
        const date = new Date(dateString)
        return isNaN(date.getTime()) ? null : date
    } catch {
        return null
    }
}

const safeFormatDate = (dateString: string | null | undefined, formatStr: string): string => {
    const date = safeParseDate(dateString)
    if (!date) return 'N/A'
    return format(date, formatStr)
}

const safeFormatDistanceToNow = (dateString: string | null | undefined): string => {
    const date = safeParseDate(dateString)
    if (!date) return 'recently'
    return formatDistanceToNow(date, { addSuffix: true })
}

interface StageHistoryItem {
    id: string
    created_at: string
    notes: string | null
    from_stage: { name: string } | null
    to_stage: { name: string }
}

interface ClientNote {
    id: string
    content: string
    created_at: string
}

interface PipelineStage {
    id: string
    name: string
    slug: string
    order_index: number
}

export default function CaseView() {
    const { caseId } = useParams<{ caseId: string }>()
    const [caseData, setCaseData] = useState<CaseDetails | null>(null)
    const [stageHistory, setStageHistory] = useState<StageHistoryItem[]>([])
    const [clientNotes, setClientNotes] = useState<ClientNote[]>([])
    const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        if (caseId) {
            loadCaseDetails()
        }
    }, [caseId])

    const loadCaseDetails = async () => {
        try {
            // Load case details using RPC function (bypasses RLS)
            // Returns array, so we take first result
            const { data: caseResults, error: caseError } = await supabase
                .rpc('get_my_synced_case', { p_case_id: caseId })

            if (caseError) throw caseError

            // RPC returns array - get first result
            const caseInfo = Array.isArray(caseResults) ? caseResults[0] : caseResults

            const typedCaseData = normalizeCase(caseInfo)
            if (!typedCaseData) {
                throw new Error('Case not found or you do not have access to this case.')
            }
            setCaseData(typedCaseData)

            // Load pipeline stages
            if (typedCaseData.pipeline?.id) {
                const { data: stagesData } = await supabase
                    .from('pipeline_stages')
                    .select('id, name, slug, order_index')
                    .eq('pipeline_id', typedCaseData.pipeline.id)
                    .order('order_index', { ascending: true })

                if (stagesData) {
                    setPipelineStages(stagesData)
                }
            }

            // Load stage history using RPC to bypass RLS
            try {
                const { data: historyData, error: historyError } = await supabase
                    .rpc('get_my_case_stage_history', { p_case_id: caseId })

                if (!historyError && historyData) {
                    // Normalize history data from flat to nested format
                    const normalizedHistory = historyData.map((h: any) => ({
                        id: h.id,
                        created_at: h.created_at,
                        notes: h.notes,
                        from_stage: h.from_stage_name ? { name: h.from_stage_name } : null,
                        to_stage: { name: h.to_stage_name || 'Unknown' }
                    }))
                    setStageHistory(normalizedHistory)
                }
            } catch (historyErr) {
                console.log('Stage history not available:', historyErr)
            }

            // Load client-visible notes using RPC to bypass RLS
            try {
                const { data: notesData, error: notesError } = await supabase
                    .rpc('get_my_case_notes', { p_case_id: caseId })

                if (!notesError && notesData) {
                    setClientNotes(notesData || [])
                }
            } catch (notesErr) {
                console.log('Client notes not available:', notesErr)
            }

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadCaseDetails()
        setRefreshing(false)
    }

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { icon: React.ReactNode; bgColor: string; textColor: string; label: string; gradient: string }> = {
            active: {
                icon: <Clock className="w-5 h-5" />,
                bgColor: 'bg-primary-100',
                textColor: 'text-primary-700',
                gradient: 'from-primary-500 to-primary-600',
                label: 'In Progress'
            },
            completed: {
                icon: <CheckCircle2 className="w-5 h-5" />,
                bgColor: 'bg-success-100',
                textColor: 'text-success-700',
                gradient: 'from-success-500 to-success-600',
                label: 'Completed'
            },
            on_hold: {
                icon: <AlertCircle className="w-5 h-5" />,
                bgColor: 'bg-warning-100',
                textColor: 'text-warning-700',
                gradient: 'from-warning-500 to-warning-600',
                label: 'On Hold'
            },
            cancelled: {
                icon: <AlertCircle className="w-5 h-5" />,
                bgColor: 'bg-red-100',
                textColor: 'text-red-700',
                gradient: 'from-red-500 to-red-600',
                label: 'Cancelled'
            }
        }
        return configs[status] || configs.active
    }

    // Calculate days in current stage
    const getDaysInStage = () => {
        if (stageHistory.length > 0) {
            const lastTransition = safeParseDate(stageHistory[0].created_at)
            if (lastTransition) {
                const now = new Date()
                const diffTime = Math.abs(now.getTime() - lastTransition.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                return diffDays
            }
        }
        if (caseData?.created_at) {
            const created = safeParseDate(caseData.created_at)
            if (created) {
                const now = new Date()
                const diffTime = Math.abs(now.getTime() - created.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                return diffDays
            }
        }
        return 0
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                        <div className="w-16 h-16 rounded-full border-4 border-primary-200 border-t-primary-600" />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <p className="text-slate-600 font-medium">Loading application details...</p>
                    </motion.div>
                </div>
            </div>
        )
    }

    if (error || !caseData) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card rounded-2xl p-8 max-w-md text-center"
                >
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Case not found</h2>
                    <p className="text-slate-600 mb-6">{error || 'Unable to load case details.'}</p>
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                </motion.div>
            </div>
        )
    }

    const statusConfig = getStatusConfig(caseData.status)
    const daysInStage = getDaysInStage()

    return (
        <div className="min-h-screen pb-12">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <Link
                            to="/dashboard"
                            className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </Link>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 text-slate-500 hover:text-primary-600 transition-colors text-sm disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${statusConfig.gradient} flex items-center justify-center shadow-lg`}>
                                <Sparkles className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">
                                    {caseData.pipeline?.name || 'Application'}
                                </h1>
                                <p className="text-slate-500 text-sm flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Started {safeFormatDate(caseData.start_date || caseData.created_at, 'MMMM d, yyyy')}
                                </p>
                            </div>
                        </div>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                            {statusConfig.icon}
                            <span className="font-medium">{statusConfig.label}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Stage Progress Visualization */}
                {pipelineStages.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-2xl p-6 mb-6"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                                <Target className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-800">Application Progress</h2>
                                <p className="text-slate-500 text-xs">Track your journey through each stage</p>
                            </div>
                        </div>
                        <StageProgressVisualization
                            stages={pipelineStages}
                            currentStageId={caseData.current_stage?.id || ''}
                            size="md"
                        />
                    </motion.div>
                )}

                {/* Current Stage Card with Quick Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
                >
                    {/* Current Stage */}
                    <div className="glass-card rounded-2xl p-6 md:col-span-2">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg">
                                    <Zap className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-sm mb-1">Current Stage</p>
                                    <h2 className="text-2xl font-bold text-slate-800">
                                        {caseData.current_stage?.name || 'Processing'}
                                    </h2>
                                    <p className="text-slate-400 text-sm mt-1">
                                        Last updated {safeFormatDistanceToNow(caseData.updated_at)}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="inline-flex items-center gap-1 bg-primary-50 text-primary-600 px-3 py-1 rounded-full text-sm font-medium">
                                    <TrendingUp className="w-4 h-4" />
                                    Active
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Days in Stage */}
                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning-400 to-warning-600 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-slate-500 text-sm">Days in Stage</p>
                        </div>
                        <p className="text-4xl font-bold text-slate-800">{daysInStage}</p>
                        <p className="text-slate-400 text-sm mt-1">
                            {daysInStage === 1 ? 'day' : 'days'}
                        </p>
                    </div>
                </motion.div>

                {/* AI Summary */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6"
                >
                    <AISummaryCard
                        caseId={caseId!}
                        caseData={{
                            status: caseData.status,
                            pipeline: caseData.pipeline || undefined,
                            current_stage: caseData.current_stage || undefined,
                            metadata: caseData.metadata
                        }}
                    />
                </motion.div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Timeline */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="glass-card rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">Progress Timeline</h3>
                                    <p className="text-slate-500 text-xs">Stage transitions history</p>
                                </div>
                            </div>
                            <TimelineView stageHistory={stageHistory} />
                        </div>
                    </motion.div>

                    {/* Updates/Notes */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <div className="glass-card rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">Updates</h3>
                                    <p className="text-slate-500 text-xs">Messages from our team</p>
                                </div>
                            </div>

                            {clientNotes.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                        <FileText className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 text-sm">No updates yet.</p>
                                    <p className="text-slate-400 text-xs mt-1">Updates will appear here as your case progresses.</p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                    {clientNotes.map((note, index) => (
                                        <motion.div
                                            key={note.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="p-4 bg-gradient-to-br from-slate-50 to-accent-50/30 rounded-xl border border-slate-100"
                                        >
                                            <p className="text-slate-700 text-sm mb-3 leading-relaxed">{note.content}</p>
                                            <div className="flex items-center gap-2 text-slate-400 text-xs">
                                                <Calendar className="w-3 h-3" />
                                                {safeFormatDate(note.created_at, 'MMM d, yyyy • h:mm a')}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Case Info Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 pt-6 border-t border-slate-100"
                >
                    <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
                        <span className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Ref: {caseData.case_reference}
                        </span>
                        <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Created: {safeFormatDate(caseData.created_at, 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Updated: {safeFormatDate(caseData.updated_at, 'MMM d, yyyy')}
                        </span>
                    </div>
                </motion.div>
            </main>
        </div>
    )
}
