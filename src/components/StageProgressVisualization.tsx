import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

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
    showLabels = true,
    size = 'md'
}: StageProgressVisualizationProps) {
    if (!stages || stages.length === 0) {
        return null
    }

    const sortedStages = [...stages].sort((a, b) => a.order_index - b.order_index)
    const currentIndex = sortedStages.findIndex(s => s.id === currentStageId)
    const progressPercentage = currentIndex >= 0
        ? ((currentIndex + 1) / sortedStages.length) * 100
        : 0

    const sizeConfig = {
        sm: {
            node: 'w-8 h-8',
            icon: 'w-4 h-4',
            text: 'text-xs',
            gap: 'gap-1'
        },
        md: {
            node: 'w-10 h-10',
            icon: 'w-5 h-5',
            text: 'text-sm',
            gap: 'gap-2'
        },
        lg: {
            node: 'w-12 h-12',
            icon: 'w-6 h-6',
            text: 'text-base',
            gap: 'gap-3'
        }
    }

    const config = sizeConfig[size]

    const getStageStatus = (stage: Stage, index: number) => {
        if (completedStageIds.includes(stage.id) || index < currentIndex) {
            return 'completed'
        }
        if (stage.id === currentStageId) {
            return 'current'
        }
        return 'pending'
    }

    return (
        <div className="w-full">
            {/* Progress Bar Background */}
            <div className="relative mb-6">
                {/* Connector Line */}
                <div className="absolute top-5 left-0 right-0 h-1 bg-slate-200 rounded-full mx-6" />

                {/* Animated Progress Line */}
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `calc(${progressPercentage}% - 48px)` }}
                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                    className="absolute top-5 left-6 h-1 bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500 rounded-full"
                    style={{
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 2s linear infinite'
                    }}
                />

                {/* Stage Nodes */}
                <div className="relative flex justify-between">
                    {sortedStages.map((stage, index) => {
                        const status = getStageStatus(stage, index)

                        return (
                            <motion.div
                                key={stage.id}
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 + 0.2 }}
                                className="flex flex-col items-center"
                            >
                                {/* Node */}
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    className={`
                                        ${config.node} rounded-full flex items-center justify-center
                                        transition-all duration-300 relative z-10
                                        ${status === 'completed'
                                            ? 'bg-gradient-to-br from-success-400 to-success-600 shadow-lg shadow-success-200'
                                            : status === 'current'
                                                ? 'bg-gradient-to-br from-primary-400 via-primary-500 to-accent-500 shadow-lg shadow-primary-200 ring-4 ring-primary-100'
                                                : 'bg-white border-2 border-slate-200'
                                        }
                                    `}
                                >
                                    {status === 'completed' ? (
                                        <CheckCircle2 className={`${config.icon} text-white`} />
                                    ) : status === 'current' ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                        >
                                            <Loader2 className={`${config.icon} text-white`} />
                                        </motion.div>
                                    ) : (
                                        <Circle className={`${config.icon} text-slate-300`} />
                                    )}

                                    {/* Pulse animation for current stage */}
                                    {status === 'current' && (
                                        <motion.div
                                            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="absolute inset-0 rounded-full bg-primary-400"
                                        />
                                    )}
                                </motion.div>

                                {/* Label */}
                                {showLabels && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 + 0.4 }}
                                        className={`mt-3 text-center max-w-[80px] md:max-w-[120px]`}
                                    >
                                        <p className={`
                                            ${config.text} font-medium leading-tight
                                            ${status === 'current'
                                                ? 'text-primary-600'
                                                : status === 'completed'
                                                    ? 'text-success-600'
                                                    : 'text-slate-400'
                                            }
                                        `}>
                                            {stage.name}
                                        </p>
                                        {status === 'current' && (
                                            <motion.span
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-xs text-primary-500 font-normal"
                                            >
                                                Current
                                            </motion.span>
                                        )}
                                    </motion.div>
                                )}
                            </motion.div>
                        )
                    })}
                </div>
            </div>

            {/* Progress Summary */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="flex items-center justify-between text-sm bg-gradient-to-r from-slate-50 to-primary-50 rounded-xl p-4"
            >
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                    <span className="text-slate-600">
                        Stage {currentIndex + 1} of {sortedStages.length}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-600">Progress:</span>
                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600">
                        {Math.round(progressPercentage)}%
                    </span>
                </div>
            </motion.div>
        </div>
    )
}
