import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
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
    Zap,
    ChevronRight,
    Upload,
    Phone,
    Mail,
    ExternalLink,
    Activity,
    FolderOpen,
    HelpCircle,
    Home,
    BarChart3,
    Bell,
    Copy,
    Check
} from 'lucide-react'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import TimelineView from '@/components/TimelineView'
import AISummaryCard from '@/components/AISummaryCard'
import StageProgressVisualization from '@/components/StageProgressVisualization'
import ServiceActionsTimeline from '@/components/ServiceActionsTimeline'

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

const normalizeCase = (c: any): CaseDetails | null => {
    if (!c || c.error) return null
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

// ============================================================================
// TAB COMPONENT
// ============================================================================
type TabId = 'overview' | 'timeline' | 'documents' | 'support'

interface Tab {
    id: TabId
    label: string
    icon: React.ElementType
}

const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'timeline', label: 'Timeline', icon: Activity },
    { id: 'documents', label: 'Documents', icon: FolderOpen },
    { id: 'support', label: 'Support', icon: HelpCircle },
]

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================
interface StatCardProps {
    label: string
    value: string | number
    icon: React.ElementType
    color: 'blue' | 'green' | 'amber' | 'purple' | 'red'
    subtext?: string
}

function StatCard({ label, value, icon: Icon, color, subtext }: StatCardProps) {
    const colorConfig = {
        blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-500', text: 'text-blue-600' },
        green: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-500', text: 'text-emerald-600' },
        amber: { bg: 'bg-amber-50', iconBg: 'bg-amber-500', text: 'text-amber-600' },
        purple: { bg: 'bg-purple-50', iconBg: 'bg-purple-500', text: 'text-purple-600' },
        red: { bg: 'bg-red-50', iconBg: 'bg-red-500', text: 'text-red-600' },
    }
    const config = colorConfig[color]

    return (
        <motion.div
            whileHover={{ y: -2 }}
            className={`${config.bg} rounded-2xl p-4 border border-white/50`}
        >
            <div className="flex items-center gap-3 mb-2">
                <div className={`${config.iconBg} w-8 h-8 rounded-lg flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-slate-500 text-sm">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${config.text}`}>{value}</p>
            {subtext && <p className="text-slate-400 text-xs mt-1">{subtext}</p>}
        </motion.div>
    )
}

// ============================================================================
// LOADING SKELETON
// ============================================================================
function CaseViewSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
            {/* Header skeleton */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
                        <div className="h-4 w-4 bg-slate-200 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-200 rounded-2xl animate-pulse" />
                            <div>
                                <div className="h-6 w-48 bg-slate-200 rounded animate-pulse mb-2" />
                                <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                            </div>
                        </div>
                        <div className="h-10 w-28 bg-slate-200 rounded-full animate-pulse" />
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {/* Stats skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 bg-slate-200 rounded-2xl animate-pulse" />
                    ))}
                </div>

                {/* Tabs skeleton */}
                <div className="flex gap-2 mb-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-10 w-24 bg-slate-200 rounded-xl animate-pulse" />
                    ))}
                </div>

                {/* Content skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-80 bg-slate-200 rounded-2xl animate-pulse" />
                    <div className="h-80 bg-slate-200 rounded-2xl animate-pulse" />
                </div>
            </main>
        </div>
    )
}

// ============================================================================
// MOBILE BOTTOM ACTIONS
// ============================================================================
function MobileBottomActions({ caseReference }: { caseReference: string }) {
    const [copied, setCopied] = useState(false)

    const copyReference = () => {
        navigator.clipboard.writeText(caseReference)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-100 px-4 py-3 md:hidden"
        >
            <div className="flex items-center justify-around gap-2">
                <Link
                    to="/documents"
                    className="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-500 hover:text-primary-600 transition-colors"
                >
                    <Upload className="w-5 h-5" />
                    <span className="text-xs">Upload</span>
                </Link>
                <a
                    href="https://wa.me/2348165634195"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-500 hover:text-green-600 transition-colors"
                >
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-xs">Message</span>
                </a>
                <button
                    onClick={copyReference}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-500 hover:text-primary-600 transition-colors"
                >
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    <span className="text-xs">{copied ? 'Copied!' : 'Copy Ref'}</span>
                </button>
                <a
                    href="tel:+19294192327"
                    className="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-500 hover:text-primary-600 transition-colors"
                >
                    <Phone className="w-5 h-5" />
                    <span className="text-xs">Call</span>
                </a>
            </div>
        </motion.div>
    )
}

// ============================================================================
// DOCUMENT QUICK UPLOAD SECTION
// ============================================================================
function DocumentQuickSection() {
    return (
        <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Documents</h3>
                        <p className="text-slate-500 text-xs">Upload and manage files</p>
                    </div>
                </div>
                <Link
                    to="/documents"
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                >
                    View All
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            <Link
                to="/documents"
                className="block border-2 border-dashed border-slate-200 hover:border-primary-300 rounded-xl p-6 text-center transition-colors group"
            >
                <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-primary-100 flex items-center justify-center mx-auto mb-3 transition-colors">
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-primary-500 transition-colors" />
                </div>
                <p className="text-slate-600 font-medium mb-1">Upload Documents</p>
                <p className="text-slate-400 text-sm">Click to upload passport, certificates, or other files</p>
            </Link>

            <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Supported formats:</span>
                    <span className="text-slate-400">PDF, JPG, PNG, DOCX (max 10MB)</span>
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// SUPPORT SECTION
// ============================================================================
function SupportSection({ caseReference }: { caseReference: string }) {
    return (
        <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                        <HelpCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Need Help?</h3>
                        <p className="text-slate-500 text-xs">We're here to assist you</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <a
                        href="https://wa.me/2348165634195"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-slate-800">WhatsApp Support</p>
                            <p className="text-sm text-slate-500">Chat with our team instantly</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-green-600 transition-colors" />
                    </a>

                    <a
                        href="tel:+19294192327"
                        className="flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                            <Phone className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-slate-800">Call Us</p>
                            <p className="text-sm text-slate-500">+1 (929) 419-2327</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </a>

                    <a
                        href={`mailto:headoffice@elabsolution.org?subject=Support Request - ${caseReference}`}
                        className="flex items-center gap-4 p-4 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
                            <Mail className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-slate-800">Email Support</p>
                            <p className="text-sm text-slate-500">headoffice@elabsolution.org</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition-colors" />
                    </a>
                </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
                <h4 className="font-semibold text-slate-800 mb-4">Frequently Asked Questions</h4>
                <div className="space-y-3">
                    {[
                        { q: 'How long does verification take?', a: 'Most verifications are completed within 2-4 weeks.' },
                        { q: 'Can I upload additional documents?', a: 'Yes, visit the Documents tab to upload any additional files.' },
                        { q: 'How do I track my progress?', a: 'The Timeline tab shows all stage transitions and updates.' },
                    ].map((faq, i) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-xl">
                            <p className="font-medium text-slate-700 text-sm mb-1">{faq.q}</p>
                            <p className="text-slate-500 text-sm">{faq.a}</p>
                        </div>
                    ))}
                </div>
                <Link
                    to="/faq"
                    className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm mt-4"
                >
                    View all FAQs
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function CaseView() {
    const { caseId } = useParams<{ caseId: string }>()
    const [caseData, setCaseData] = useState<CaseDetails | null>(null)
    const [stageHistory, setStageHistory] = useState<StageHistoryItem[]>([])
    const [clientNotes, setClientNotes] = useState<ClientNote[]>([])
    const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)
    const [activeTab, setActiveTab] = useState<TabId>('overview')
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (caseId) {
            loadCaseDetails()
        }
    }, [caseId])

    const loadCaseDetails = async () => {
        try {
            const { data: caseResults, error: caseError } = await supabase
                .rpc('get_my_synced_case', { p_case_id: caseId })

            if (caseError) throw caseError

            const caseInfo = Array.isArray(caseResults) ? caseResults[0] : caseResults
            const typedCaseData = normalizeCase(caseInfo)

            if (!typedCaseData) {
                throw new Error('Case not found or you do not have access to this case.')
            }
            setCaseData(typedCaseData)

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

            try {
                const { data: historyData, error: historyError } = await supabase
                    .rpc('get_my_case_stage_history', { p_case_id: caseId })

                if (!historyError && historyData) {
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

    const copyReference = () => {
        if (caseData?.case_reference) {
            navigator.clipboard.writeText(caseData.case_reference)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
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

    const getDaysInStage = () => {
        if (stageHistory.length > 0) {
            const lastTransition = safeParseDate(stageHistory[0].created_at)
            if (lastTransition) {
                return differenceInDays(new Date(), lastTransition) || 1
            }
        }
        if (caseData?.created_at) {
            const created = safeParseDate(caseData.created_at)
            if (created) {
                return differenceInDays(new Date(), created) || 1
            }
        }
        return 1
    }

    const getTotalDays = () => {
        if (caseData?.created_at) {
            const created = safeParseDate(caseData.created_at)
            if (created) {
                return differenceInDays(new Date(), created) || 1
            }
        }
        return 1
    }

    const getProgress = () => {
        if (pipelineStages.length === 0) return 0
        const currentIndex = pipelineStages.findIndex(s => s.id === caseData?.current_stage?.id)
        if (currentIndex === -1) return 10
        return Math.round(((currentIndex + 1) / pipelineStages.length) * 100)
    }

    if (loading) return <CaseViewSkeleton />

    if (error || !caseData) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card rounded-2xl p-8 max-w-md text-center"
                >
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Case not found</h2>
                    <p className="text-slate-600 mb-6">{error || 'Unable to load case details.'}</p>
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
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
    const totalDays = getTotalDays()
    const progress = getProgress()

    return (
        <div className="min-h-screen pb-24 md:pb-12 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-sm mb-4" data-tour="breadcrumbs">
                        <Link to="/dashboard" className="text-slate-500 hover:text-primary-600 transition-colors flex items-center gap-1">
                            <Home className="w-4 h-4" />
                            <span className="hidden sm:inline">Dashboard</span>
                        </Link>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                        <span className="text-slate-800 font-medium truncate max-w-[200px]">
                            {caseData.pipeline?.name || 'Application'}
                        </span>
                    </nav>

                    {/* Title row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" data-tour="case-header">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${statusConfig.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                                <Sparkles className="w-7 h-7 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 truncate">
                                    {caseData.pipeline?.name || 'Application'}
                                </h1>
                                <div className="flex items-center gap-3 mt-1">
                                    <button
                                        onClick={copyReference}
                                        className="flex items-center gap-1.5 text-slate-500 hover:text-primary-600 transition-colors text-sm"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span className="font-mono">{caseData.case_reference}</span>
                                    </button>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-400 text-sm hidden sm:inline">
                                        Started {safeFormatDate(caseData.start_date || caseData.created_at, 'MMM d, yyyy')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                            </motion.button>
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                                {statusConfig.icon}
                                <span className="font-medium text-sm">{statusConfig.label}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                {/* Quick Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
                    data-tour="quick-stats"
                >
                    <StatCard label="Progress" value={`${progress}%`} icon={TrendingUp} color="blue" subtext={`${pipelineStages.length} total stages`} />
                    <StatCard label="Current Stage" value={daysInStage} icon={Zap} color="amber" subtext={daysInStage === 1 ? 'day' : 'days'} />
                    <StatCard label="Total Duration" value={totalDays} icon={Calendar} color="purple" subtext={totalDays === 1 ? 'day' : 'days'} />
                    <StatCard label="Stage Transitions" value={stageHistory.length} icon={Activity} color="green" subtext="updates recorded" />
                </motion.div>

                {/* Stage Progress Visualization */}
                {pipelineStages.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card rounded-2xl p-6 mb-6"
                        data-tour="stage-progress"
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

                {/* Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide"
                    data-tour="tabs-nav"
                >
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                                activeTab === tab.id
                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </motion.div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            {/* AI Summary */}
                            <div data-tour="ai-summary">
                                <AISummaryCard
                                    caseId={caseId!}
                                    caseData={{
                                        status: caseData.status,
                                        pipeline: caseData.pipeline || undefined,
                                        current_stage: caseData.current_stage || undefined,
                                        metadata: caseData.metadata
                                    }}
                                />
                            </div>

                            {/* Current Stage & Updates */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Current Stage Card */}
                                <div className="glass-card rounded-2xl p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg">
                                                <Zap className="w-7 h-7 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-sm mb-1">Current Stage</p>
                                                <h2 className="text-xl font-bold text-slate-800">
                                                    {caseData.current_stage?.name || 'Processing'}
                                                </h2>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            Updated {safeFormatDistanceToNow(caseData.updated_at)}
                                        </span>
                                    </div>
                                </div>

                                {/* Updates/Notes */}
                                <div className="glass-card rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
                                            <Bell className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-800">Latest Updates</h3>
                                            <p className="text-slate-500 text-xs">Messages from our team</p>
                                        </div>
                                    </div>

                                    {clientNotes.length === 0 ? (
                                        <div className="text-center py-6">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                                <FileText className="w-6 h-6 text-slate-300" />
                                            </div>
                                            <p className="text-slate-500 text-sm">No updates yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-[200px] overflow-y-auto">
                                            {clientNotes.slice(0, 2).map((note) => (
                                                <div key={note.id} className="p-3 bg-slate-50 rounded-xl">
                                                    <p className="text-slate-700 text-sm line-clamp-2">{note.content}</p>
                                                    <p className="text-slate-400 text-xs mt-2">
                                                        {safeFormatDate(note.created_at, 'MMM d, yyyy')}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Service Actions */}
                            <ServiceActionsTimeline caseId={caseData.id} />
                        </motion.div>
                    )}

                    {activeTab === 'timeline' && (
                        <motion.div
                            key="timeline"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                        >
                            {/* Progress Timeline */}
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

                            {/* Updates/Notes */}
                            <div className="glass-card rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
                                        <MessageSquare className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800">All Updates</h3>
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
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
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
                    )}

                    {activeTab === 'documents' && (
                        <motion.div
                            key="documents"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <DocumentQuickSection />
                        </motion.div>
                    )}

                    {activeTab === 'support' && (
                        <motion.div
                            key="support"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <SupportSection caseReference={caseData.case_reference} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Case Info Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 pt-6 border-t border-slate-100"
                >
                    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-slate-400">
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

            {/* Mobile Bottom Actions */}
            <MobileBottomActions caseReference={caseData.case_reference} />
        </div>
    )
}
