import { motion } from 'framer-motion'
import {
    CheckCircle2,
    Circle,
    Clock,
    ArrowRight,
    Sparkles,
    Trophy
} from 'lucide-react'

interface Stage {
    id: string
    name: string
    slug: string
    order_index: number
}

interface EnhancedProgressTimelineProps {
    stages: Stage[]
    currentStageSlug?: string
    status: string
    animate?: boolean
}

const STATUS_COLORS = {
    active: {
        completed: 'from-primary-500 to-primary-600',
        current: 'from-primary-400 to-primary-500',
        pending: 'bg-slate-200',
        text: 'text-primary-600'
    },
    completed: {
        completed: 'from-success-500 to-success-600',
        current: 'from-success-500 to-success-600',
        pending: 'from-success-500 to-success-600',
        text: 'text-success-600'
    },
    on_hold: {
        completed: 'from-warning-500 to-warning-600',
        current: 'from-warning-400 to-warning-500',
        pending: 'bg-slate-200',
        text: 'text-warning-600'
    },
    cancelled: {
        completed: 'from-red-500 to-red-600',
        current: 'from-red-400 to-red-500',
        pending: 'bg-slate-200',
        text: 'text-red-600'
    }
}

export default function EnhancedProgressTimeline({
    stages,
    currentStageSlug,
    status,
    animate = true
}: EnhancedProgressTimelineProps) {
    const sortedStages = [...stages].sort((a, b) => a.order_index - b.order_index)
    const currentIndex = sortedStages.findIndex(s => s.slug === currentStageSlug)
    const progress = status === 'completed'
        ? 100
        : status === 'cancelled'
            ? 0
            : currentIndex === -1
                ? 20
                : Math.round(((currentIndex + 1) / sortedStages.length) * 100)

    const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.active

    // Show compact view if too many stages
    const isCompact = sortedStages.length > 5

    return (
        <div className="w-full">
            {/* Progress Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <motion.div
                        animate={status === 'active' ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`w-6 h-6 rounded-full bg-gradient-to-br ${colors.completed} flex items-center justify-center`}
                    >
                        {status === 'completed' ? (
                            <Trophy className="w-3.5 h-3.5 text-white" />
                        ) : status === 'active' ? (
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                        ) : (
                            <Clock className="w-3.5 h-3.5 text-white" />
                        )}
                    </motion.div>
                    <span className="text-sm font-medium text-slate-700">Progress</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${colors.text}`}>{progress}%</span>
                    {status === 'completed' && (
                        <span className="text-xs text-success-600 font-medium bg-success-50 px-2 py-0.5 rounded-full">
                            Complete!
                        </span>
                    )}
                </div>
            </div>

            {/* Main Progress Bar */}
            <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
                {/* Animated background shimmer */}
                {status === 'active' && (
                    <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    />
                )}

                {/* Progress fill */}
                <motion.div
                    initial={animate ? { width: 0 } : { width: `${progress}%` }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    className={`h-full rounded-full bg-gradient-to-r ${colors.completed} relative`}
                >
                    {/* Glow effect */}
                    <div className={`absolute right-0 top-0 w-4 h-full bg-gradient-to-r from-transparent ${colors.completed} blur-sm`} />
                </motion.div>
            </div>

            {/* Timeline Stages */}
            {isCompact ? (
                // Compact view for many stages
                <div className="relative">
                    {/* Connecting line */}
                    <div className="absolute top-3 left-3 right-3 h-0.5 bg-slate-200 rounded-full" />
                    <motion.div
                        initial={animate ? { width: 0 } : { width: `${progress}%` }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                        className={`absolute top-3 left-3 h-0.5 rounded-full bg-gradient-to-r ${colors.completed}`}
                    />

                    {/* Stage dots */}
                    <div className="flex justify-between relative">
                        {sortedStages.map((stage, i) => {
                            const isComplete = i < currentIndex || status === 'completed'
                            const isCurrent = stage.slug === currentStageSlug && status !== 'completed'

                            return (
                                <motion.div
                                    key={stage.id}
                                    initial={animate ? { scale: 0 } : { scale: 1 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.1 + i * 0.1 }}
                                    className="flex flex-col items-center"
                                >
                                    <div className={`
                                        relative w-6 h-6 rounded-full flex items-center justify-center
                                        ${isComplete ? `bg-gradient-to-br ${colors.completed}` :
                                            isCurrent ? `bg-gradient-to-br ${colors.current} ring-4 ring-primary-100` :
                                                'bg-slate-200'}
                                        transition-all duration-300
                                    `}>
                                        {isComplete ? (
                                            <CheckCircle2 className="w-4 h-4 text-white" />
                                        ) : isCurrent ? (
                                            <motion.div
                                                animate={{ scale: [1, 1.3, 1] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                                className="w-2 h-2 bg-white rounded-full"
                                            />
                                        ) : (
                                            <Circle className="w-3 h-3 text-slate-400" />
                                        )}
                                    </div>

                                    {/* Stage name tooltip on hover */}
                                    <div className={`
                                        mt-2 text-xs font-medium truncate max-w-16 text-center
                                        ${isComplete ? colors.text : isCurrent ? 'text-slate-800' : 'text-slate-400'}
                                    `}>
                                        {i + 1}
                                    </div>

                                    {/* Full name on hover */}
                                    {(isCurrent || i === 0 || i === sortedStages.length - 1) && (
                                        <div className="hidden sm:block text-xs text-slate-500 mt-1 max-w-20 truncate text-center">
                                            {stage.name}
                                        </div>
                                    )}
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                // Detailed view for fewer stages
                <div className="space-y-3">
                    {sortedStages.map((stage, i) => {
                        const isComplete = i < currentIndex || status === 'completed'
                        const isCurrent = stage.slug === currentStageSlug && status !== 'completed'
                        const isLast = i === sortedStages.length - 1

                        return (
                            <motion.div
                                key={stage.id}
                                initial={animate ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 + i * 0.1 }}
                                className="flex items-center gap-3"
                            >
                                {/* Stage indicator */}
                                <div className="relative flex-shrink-0">
                                    <div className={`
                                        w-10 h-10 rounded-xl flex items-center justify-center
                                        ${isComplete ? `bg-gradient-to-br ${colors.completed} shadow-lg` :
                                            isCurrent ? `bg-gradient-to-br ${colors.current} ring-4 ring-primary-100 shadow-lg` :
                                                'bg-slate-100'}
                                        transition-all duration-300
                                    `}>
                                        {isComplete ? (
                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                        ) : isCurrent ? (
                                            <motion.div
                                                animate={{ scale: [1, 1.3, 1] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                            >
                                                <Clock className="w-5 h-5 text-white" />
                                            </motion.div>
                                        ) : (
                                            <span className="text-sm font-medium text-slate-400">{i + 1}</span>
                                        )}
                                    </div>

                                    {/* Connecting line */}
                                    {!isLast && (
                                        <div className={`
                                            absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-4
                                            ${isComplete ? `bg-gradient-to-b ${colors.completed}` : 'bg-slate-200'}
                                        `} />
                                    )}
                                </div>

                                {/* Stage info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`
                                            font-medium truncate
                                            ${isComplete ? colors.text : isCurrent ? 'text-slate-800' : 'text-slate-400'}
                                        `}>
                                            {stage.name}
                                        </span>
                                        {isCurrent && (
                                            <motion.span
                                                animate={{ opacity: [1, 0.5, 1] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                                className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium"
                                            >
                                                Current
                                            </motion.span>
                                        )}
                                        {isComplete && !isCurrent && (
                                            <span className="text-xs text-success-600">
                                                <CheckCircle2 className="w-3 h-3 inline" />
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Arrow for current */}
                                {isCurrent && (
                                    <motion.div
                                        animate={{ x: [0, 5, 0] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                    >
                                        <ArrowRight className="w-4 h-4 text-primary-500" />
                                    </motion.div>
                                )}
                            </motion.div>
                        )
                    })}
                </div>
            )}

            {/* Completion celebration for completed cases */}
            {status === 'completed' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 p-3 bg-gradient-to-r from-success-50 to-emerald-50 rounded-xl border border-success-200"
                >
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-success-600" />
                        <span className="text-sm font-medium text-success-700">
                            Congratulations! Your application has been completed successfully.
                        </span>
                    </div>
                </motion.div>
            )}
        </div>
    )
}
