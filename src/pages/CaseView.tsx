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
    RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import TimelineView from '@/components/TimelineView'
import AISummaryCard from '@/components/AISummaryCard'

interface CaseDetails {
    id: string
    case_reference: string
    status: string
    priority: string
    created_at: string
    updated_at: string
    start_date: string
    metadata: Record<string, any>
    pipeline: {
        name: string
        slug: string
    }
    current_stage: {
        name: string
        slug: string
    }
    person: {
        first_name: string
        last_name: string
    }
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

export default function CaseView() {
    const { caseId } = useParams<{ caseId: string }>()
    const [caseData, setCaseData] = useState<CaseDetails | null>(null)
    const [stageHistory, setStageHistory] = useState<StageHistoryItem[]>([])
    const [clientNotes, setClientNotes] = useState<ClientNote[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (caseId) {
            loadCaseDetails()
        }
    }, [caseId])

    const loadCaseDetails = async () => {
        try {
            // Load case details
            const { data: caseInfo, error: caseError } = await supabase
                .from('cases')
                .select(`
          id,
          case_reference,
          status,
          priority,
          created_at,
          updated_at,
          start_date,
          metadata,
          pipeline:pipelines(name, slug),
          current_stage:pipeline_stages!cases_current_stage_id_fkey(name, slug),
          person:persons(first_name, last_name)
        `)
                .eq('id', caseId)
                .single()

            if (caseError) throw caseError
            setCaseData(caseInfo as unknown as CaseDetails)

            // Load stage history
            const { data: historyData, error: historyError } = await supabase
                .from('case_stage_history')
                .select(`
          id,
          created_at,
          notes,
          from_stage:pipeline_stages!case_stage_history_from_stage_id_fkey(name),
          to_stage:pipeline_stages!case_stage_history_to_stage_id_fkey(name)
        `)
                .eq('case_id', caseId)
                .order('created_at', { ascending: false })

            if (!historyError) {
                setStageHistory((historyData || []) as unknown as StageHistoryItem[])
            }

            // Load client-visible notes
            const { data: notesData, error: notesError } = await supabase
                .from('case_notes')
                .select('id, content, created_at')
                .eq('case_id', caseId)
                .eq('is_client_visible', true)
                .order('created_at', { ascending: false })

            if (!notesError) {
                setClientNotes(notesData || [])
            }

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { icon: React.ReactNode; bgColor: string; textColor: string; label: string }> = {
            active: {
                icon: <Clock className="w-5 h-5" />,
                bgColor: 'bg-primary-100',
                textColor: 'text-primary-700',
                label: 'In Progress'
            },
            completed: {
                icon: <CheckCircle2 className="w-5 h-5" />,
                bgColor: 'bg-success-100',
                textColor: 'text-success-700',
                label: 'Completed'
            },
            on_hold: {
                icon: <AlertCircle className="w-5 h-5" />,
                bgColor: 'bg-warning-100',
                textColor: 'text-warning-700',
                label: 'On Hold'
            },
            cancelled: {
                icon: <AlertCircle className="w-5 h-5" />,
                bgColor: 'bg-red-100',
                textColor: 'text-red-700',
                label: 'Cancelled'
            }
        }
        return configs[status] || configs.active
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                    <p className="text-slate-600">Loading case details...</p>
                </div>
            </div>
        )
    }

    if (error || !caseData) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="glass-card rounded-2xl p-8 max-w-md text-center">
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
                </div>
            </div>
        )
    }

    const statusConfig = getStatusConfig(caseData.status)

    return (
        <div className="min-h-screen pb-12">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">
                                {caseData.pipeline?.name || 'Application'}
                            </h1>
                            <p className="text-slate-500 text-sm">
                                Started {caseData.start_date ? format(new Date(caseData.start_date), 'MMMM d, yyyy') : format(new Date(caseData.created_at), 'MMMM d, yyyy')}
                            </p>
                        </div>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                            {statusConfig.icon}
                            <span className="font-medium">{statusConfig.label}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-6 py-8">
                {/* Current Stage Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-2xl p-6 mb-6"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm">Current Stage</p>
                            <h2 className="text-xl font-bold text-slate-800">
                                {caseData.current_stage?.name || 'Processing'}
                            </h2>
                        </div>
                    </div>
                </motion.div>

                {/* AI Summary */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6"
                >
                    <AISummaryCard caseId={caseId!} caseData={caseData} />
                </motion.div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Timeline */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="glass-card rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="w-5 h-5 text-primary-600" />
                                <h3 className="text-lg font-semibold text-slate-800">Progress Timeline</h3>
                            </div>
                            <TimelineView stageHistory={stageHistory} />
                        </div>
                    </motion.div>

                    {/* Updates/Notes */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="glass-card rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <MessageSquare className="w-5 h-5 text-primary-600" />
                                <h3 className="text-lg font-semibold text-slate-800">Updates</h3>
                            </div>

                            {clientNotes.length === 0 ? (
                                <div className="text-center py-8">
                                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 text-sm">No updates yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {clientNotes.map((note) => (
                                        <div key={note.id} className="p-4 bg-slate-50 rounded-xl">
                                            <p className="text-slate-700 text-sm mb-2">{note.content}</p>
                                            <p className="text-slate-400 text-xs">
                                                {format(new Date(note.created_at), 'MMM d, yyyy • h:mm a')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Refresh Button */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center mt-8"
                >
                    <button
                        onClick={loadCaseDetails}
                        className="inline-flex items-center gap-2 text-slate-500 hover:text-primary-600 transition-colors text-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </motion.div>
            </main>
        </div>
    )
}
