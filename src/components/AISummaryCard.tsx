import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, Lightbulb, Target, AlertTriangle } from 'lucide-react'

interface AISummaryCardProps {
    caseId: string
    caseData: {
        status: string
        pipeline?: { name: string; slug: string }
        current_stage?: { name: string; slug: string }
        metadata?: Record<string, any>
    }
}

interface AISummary {
    summary: string
    nextSteps: string[]
    estimatedProgress: number
    alerts?: string[]
}

export default function AISummaryCard({ caseId, caseData }: AISummaryCardProps) {
    const [summary, setSummary] = useState<AISummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [, setError] = useState<string | null>(null)
    const [expanded, setExpanded] = useState(true)

    useEffect(() => {
        generateSummary()
    }, [caseId])

    const generateSummary = async () => {
        setLoading(true)
        setError(null)

        try {
            // Call the AI summary edge function
            const { data, error: fnError } = await supabase.functions.invoke('client-case-summary', {
                body: { caseId }
            })

            if (fnError) {
                // Fallback to static summary if AI fails
                setSummary(generateFallbackSummary())
            } else {
                setSummary(data)
            }
        } catch (err) {
            // Use fallback summary
            setSummary(generateFallbackSummary())
        } finally {
            setLoading(false)
        }
    }

    const generateFallbackSummary = (): AISummary => {
        const stageName = caseData.current_stage?.name || 'Processing'
        const pipelineName = caseData.pipeline?.name || 'Application'

        // Generate contextual summary based on stage
        let summary = `Your ${pipelineName} application is currently in the "${stageName}" stage.`
        let nextSteps: string[] = []
        let progress = 30

        const stageSlug = caseData.current_stage?.slug || ''

        if (stageSlug.includes('new') || stageSlug.includes('intake')) {
            summary = `We've received your ${pipelineName} application and it's being reviewed by our team.`
            nextSteps = ['Our team will review your initial documents', 'You may receive requests for additional information']
            progress = 15
        } else if (stageSlug.includes('document') || stageSlug.includes('pending')) {
            summary = `We're waiting for some documents to proceed with your ${pipelineName} application.`
            nextSteps = ['Please check your email for document requests', 'Upload any requested documents as soon as possible']
            progress = 35
        } else if (stageSlug.includes('review') || stageSlug.includes('processing')) {
            summary = `Your ${pipelineName} application is being actively processed by our specialists.`
            nextSteps = ['Our team is working on your case', 'We will update you on any developments']
            progress = 55
        } else if (stageSlug.includes('submit') || stageSlug.includes('verification')) {
            summary = `Your ${pipelineName} application has been submitted and is awaiting verification.`
            nextSteps = ['Verification typically takes 2-4 weeks', 'We will notify you once verification is complete']
            progress = 75
        } else if (stageSlug.includes('complete') || stageSlug.includes('approved')) {
            summary = `Congratulations! Your ${pipelineName} has been completed successfully.`
            nextSteps = ['Check your email for final documentation', 'Contact us if you need any additional assistance']
            progress = 100
        }

        return { summary, nextSteps, estimatedProgress: progress }
    }

    if (loading) {
        return (
            <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white animate-pulse" />
                    </div>
                    <div>
                        <div className="skeleton h-4 w-32 mb-2" />
                        <div className="skeleton h-3 w-24" />
                    </div>
                </div>
                <div className="skeleton h-16 w-full mb-4" />
                <div className="skeleton h-8 w-full" />
            </div>
        )
    }

    if (!summary) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl overflow-hidden"
        >
            {/* Header */}
            <div
                className="p-6 cursor-pointer hover:bg-slate-50/50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-200">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">Case Summary</h3>
                            <p className="text-slate-500 text-xs">Your application overview</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                generateSummary()
                            }}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                            title="Refresh summary"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        {expanded ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            {expanded && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-6"
                >
                    {/* Progress Bar */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-slate-600">Estimated Progress</span>
                            <span className="font-semibold text-primary-600">{summary.estimatedProgress}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${summary.estimatedProgress}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                            />
                        </div>
                    </div>

                    {/* Summary Text */}
                    <div className="bg-gradient-to-br from-slate-50 to-accent-50/30 rounded-xl p-4 mb-4">
                        <p className="text-slate-700 leading-relaxed">{summary.summary}</p>
                    </div>

                    {/* Next Steps */}
                    {summary.nextSteps && summary.nextSteps.length > 0 && (
                        <div className="mb-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                                <Target className="w-4 h-4 text-primary-500" />
                                <span>What's Next</span>
                            </div>
                            <ul className="space-y-2">
                                {summary.nextSteps.map((step, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                                        <Lightbulb className="w-4 h-4 text-warning-500 shrink-0 mt-0.5" />
                                        <span>{step}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Alerts */}
                    {summary.alerts && summary.alerts.length > 0 && (
                        <div className="bg-warning-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-warning-700 mb-2">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Action Required</span>
                            </div>
                            <ul className="space-y-1">
                                {summary.alerts.map((alert, index) => (
                                    <li key={index} className="text-sm text-warning-600">• {alert}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </motion.div>
            )}
        </motion.div>
    )
}
