import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { format, formatDistanceToNow } from 'date-fns'
import {
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    Calendar,
    ArrowUpRight,
    Zap
} from 'lucide-react'

// Safe date parsing helper
const safeParseDate = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null
    try {
        const date = new Date(dateString)
        return isNaN(date.getTime()) ? null : date
    } catch {
        return null
    }
}

interface Stage {
    id: string
    name: string
    slug: string
    order_index: number
}

interface CaseData {
    id: string
    case_reference: string
    status: string
    priority: string
    created_at: string
    updated_at: string
    pipeline: {
        name: string
        slug: string
    }
    current_stage: {
        name: string
        slug: string
    }
    metadata?: Record<string, any>
}

interface ApplicationCardProps {
    caseItem: CaseData
    index: number
    stages?: Stage[]
}

const STATUS_CONFIG = {
    active: {
        icon: Clock,
        bgColor: 'bg-primary-100',
        textColor: 'text-primary-700',
        borderColor: 'border-primary-200',
        gradientFrom: 'from-primary-500',
        gradientTo: 'to-primary-600',
        label: 'In Progress',
        pulse: true
    },
    completed: {
        icon: CheckCircle2,
        bgColor: 'bg-success-100',
        textColor: 'text-success-700',
        borderColor: 'border-success-200',
        gradientFrom: 'from-success-500',
        gradientTo: 'to-success-600',
        label: 'Completed',
        pulse: false
    },
    on_hold: {
        icon: AlertCircle,
        bgColor: 'bg-warning-100',
        textColor: 'text-warning-700',
        borderColor: 'border-warning-200',
        gradientFrom: 'from-warning-500',
        gradientTo: 'to-warning-600',
        label: 'On Hold',
        pulse: false
    },
    cancelled: {
        icon: AlertCircle,
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        gradientFrom: 'from-red-500',
        gradientTo: 'to-red-600',
        label: 'Cancelled',
        pulse: false
    }
}

export default function ApplicationCard({ caseItem, index, stages }: ApplicationCardProps) {
    const statusConfig = STATUS_CONFIG[caseItem.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active
    const StatusIcon = statusConfig.icon

    // Calculate progress based on stages if available
    const calculateProgress = () => {
        if (!stages || stages.length === 0) {
            // Fallback based on status
            if (caseItem.status === 'completed') return 100
            if (caseItem.status === 'cancelled') return 0
            return 45 // Default for active
        }

        const sortedStages = [...stages].sort((a, b) => a.order_index - b.order_index)
        const currentStageSlug = caseItem.current_stage?.slug
        const currentIndex = sortedStages.findIndex(s => s.slug === currentStageSlug)

        if (currentIndex === -1) return 20
        return Math.round(((currentIndex + 1) / sortedStages.length) * 100)
    }

    const progress = calculateProgress()
    const updatedDate = safeParseDate(caseItem.updated_at)
    const createdDate = safeParseDate(caseItem.created_at)
    const lastUpdated = updatedDate ? formatDistanceToNow(updatedDate, { addSuffix: true }) : 'Recently'

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ y: -4 }}
            className="group"
        >
            <Link
                to={`/case/${caseItem.id}`}
                className="block relative overflow-hidden"
            >
                <div className={`
                    glass-card rounded-2xl p-6 border-l-4 ${statusConfig.borderColor}
                    hover:shadow-xl transition-all duration-300
                    group-hover:bg-white
                `}>
                    {/* Top Row */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                            {/* Status Icon with animation */}
                            <div className={`
                                relative w-12 h-12 rounded-xl bg-gradient-to-br ${statusConfig.gradientFrom} ${statusConfig.gradientTo}
                                flex items-center justify-center shadow-lg
                            `}>
                                <StatusIcon className="w-6 h-6 text-white" />
                                {statusConfig.pulse && (
                                    <motion.div
                                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className={`absolute inset-0 rounded-xl bg-gradient-to-br ${statusConfig.gradientFrom} ${statusConfig.gradientTo}`}
                                    />
                                )}
                            </div>

                            <div>
                                <h3 className="font-semibold text-lg text-slate-800 group-hover:text-primary-600 transition-colors flex items-center gap-2">
                                    {caseItem.pipeline?.name || 'Application'}
                                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </h3>
                                <p className="text-slate-500 text-sm flex items-center gap-2">
                                    <Zap className="w-3 h-3" />
                                    {caseItem.current_stage?.name || 'Processing'}
                                </p>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className={`
                            px-4 py-1.5 rounded-full text-sm font-medium
                            ${statusConfig.bgColor} ${statusConfig.textColor}
                            flex items-center gap-2
                        `}>
                            {statusConfig.pulse && (
                                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                            )}
                            {statusConfig.label}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-slate-500">Progress</span>
                            <span className={`font-semibold ${statusConfig.textColor}`}>{progress}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1, delay: 0.2 * index, ease: 'easeOut' }}
                                className={`h-full rounded-full bg-gradient-to-r ${statusConfig.gradientFrom} ${statusConfig.gradientTo}`}
                            />
                        </div>

                        {/* Mini stage indicators */}
                        {stages && stages.length > 0 && stages.length <= 6 && (
                            <div className="flex justify-between mt-2">
                                {[...stages].sort((a, b) => a.order_index - b.order_index).map((stage, i) => {
                                    const currentIdx = stages.findIndex(s => s.slug === caseItem.current_stage?.slug)
                                    const isComplete = i < currentIdx
                                    const isCurrent = stage.slug === caseItem.current_stage?.slug

                                    return (
                                        <div
                                            key={stage.id}
                                            className={`
                                                w-2 h-2 rounded-full transition-all
                                                ${isComplete ? `bg-gradient-to-br ${statusConfig.gradientFrom} ${statusConfig.gradientTo}` :
                                                    isCurrent ? 'bg-primary-400 ring-2 ring-primary-200' :
                                                        'bg-slate-200'}
                                            `}
                                            title={stage.name}
                                        />
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Bottom Row */}
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4 text-slate-400">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Started {createdDate ? format(createdDate, 'MMM d, yyyy') : 'N/A'}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Updated {lastUpdated}
                            </span>
                        </div>

                        <div className="flex items-center gap-1 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-sm font-medium">View Details</span>
                            <ChevronRight className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Hover gradient overlay */}
                    <div className={`
                        absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity
                        bg-gradient-to-r ${statusConfig.gradientFrom} ${statusConfig.gradientTo}
                        pointer-events-none rounded-2xl
                    `} />
                </div>
            </Link>
        </motion.div>
    )
}
