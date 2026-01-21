import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface Stage {
    id: string
    name: string
    slug: string
    order_index: number
}

interface StageProgressVisualizationProps {
    stages: Stage[]
    currentStageId: string
    completedStageIds?: string[]
    showLabels?: boolean
    size?: 'sm' | 'md' | 'lg'
}

export default function StageProgressVisualization({
    stages,
    currentStageId,
    completedStageIds = [],
}: StageProgressVisualizationProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    if (!stages || stages.length === 0) {
        return null
    }

    const sortedStages = [...stages].sort((a, b) => a.order_index - b.order_index)
    const currentIndex = sortedStages.findIndex(s => s.id === currentStageId)
    const currentStage = sortedStages[currentIndex]
    const progressPercentage = currentIndex >= 0
        ? ((currentIndex + 1) / sortedStages.length) * 100
        : 0

    const getStageStatus = (stage: Stage, index: number) => {
        if (completedStageIds.includes(stage.id) || index < currentIndex) {
            return 'completed'
        }
        if (stage.id === currentStageId) {
            return 'current'
        }
        return 'pending'
    }

    // Group stages into phases for visual clarity
    const completedCount = sortedStages.filter((_, i) => i < currentIndex).length
    const remainingCount = sortedStages.length - currentIndex - 1

    return (
        <div className="w-full space-y-4">
            {/* Main Progress Section */}
            <div className="flex items-center gap-6">
                {/* Circular Progress */}
                <div className="relative flex-shrink-0">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                            cx="50"
                            cy="50"
                            r="42"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="8"
                        />
                        {/* Progress circle */}
                        <motion.circle
                            cx="50"
                            cy="50"
                            r="42"
                            fill="none"
                            stroke="url(#progressGradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            initial={{ strokeDasharray: '0 264' }}
                            animate={{ strokeDasharray: `${(progressPercentage / 100) * 264} 264` }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                        />
                        <defs>
                            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#0ea5e9" />
                                <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-slate-700">
                            {Math.round(progressPercentage)}%
                        </span>
                    </div>
                </div>

                {/* Current Stage Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-2 h-2 rounded-full bg-primary-500"
                        />
                        <span className="text-xs font-medium text-primary-600 uppercase tracking-wide">
                            Current Stage
                        </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 truncate">
                        {currentStage?.name || 'Processing'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Step {currentIndex + 1} of {sortedStages.length}
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="hidden sm:flex items-center gap-4">
                    <div className="text-center px-4 py-2 bg-success-50 rounded-xl">
                        <p className="text-lg font-bold text-success-600">{completedCount}</p>
                        <p className="text-xs text-success-600/70">Completed</p>
                    </div>
                    <div className="text-center px-4 py-2 bg-slate-100 rounded-xl">
                        <p className="text-lg font-bold text-slate-600">{remainingCount}</p>
                        <p className="text-xs text-slate-500">Remaining</p>
                    </div>
                </div>
            </div>

            {/* Simplified Stage Indicator Bar */}
            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                />
                {/* Stage markers */}
                <div className="absolute inset-0 flex justify-between px-0.5">
                    {sortedStages.map((stage, index) => {
                        const status = getStageStatus(stage, index)
                        return (
                            <div
                                key={stage.id}
                                className={`w-1 h-full rounded-full transition-colors ${
                                    status === 'completed' ? 'bg-white/50' :
                                    status === 'current' ? 'bg-white' :
                                    'bg-slate-200'
                                }`}
                            />
                        )
                    })}
                </div>
            </div>

            {/* Expandable Stage List */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-500 hover:text-primary-600 transition-colors"
            >
                <span>{isExpanded ? 'Hide all stages' : 'View all stages'}</span>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2">
                            {sortedStages.map((stage, index) => {
                                const status = getStageStatus(stage, index)
                                return (
                                    <motion.div
                                        key={stage.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className={`
                                            flex items-center gap-3 p-3 rounded-xl transition-all
                                            ${status === 'current'
                                                ? 'bg-primary-50 border-2 border-primary-200'
                                                : status === 'completed'
                                                    ? 'bg-success-50/50'
                                                    : 'bg-slate-50'
                                            }
                                        `}
                                    >
                                        {/* Status Icon */}
                                        <div className={`
                                            flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                                            ${status === 'completed'
                                                ? 'bg-success-500'
                                                : status === 'current'
                                                    ? 'bg-primary-500'
                                                    : 'bg-slate-200'
                                            }
                                        `}>
                                            {status === 'completed' ? (
                                                <CheckCircle2 className="w-4 h-4 text-white" />
                                            ) : status === 'current' ? (
                                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                                            ) : (
                                                <Circle className="w-4 h-4 text-slate-400" />
                                            )}
                                        </div>

                                        {/* Stage Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`
                                                text-sm font-medium truncate
                                                ${status === 'current'
                                                    ? 'text-primary-700'
                                                    : status === 'completed'
                                                        ? 'text-success-700'
                                                        : 'text-slate-500'
                                                }
                                            `}>
                                                {stage.name}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                Step {index + 1}
                                            </p>
                                        </div>

                                        {/* Current Badge */}
                                        {status === 'current' && (
                                            <span className="flex-shrink-0 text-xs font-medium text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">
                                                Current
                                            </span>
                                        )}
                                    </motion.div>
                                )
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
