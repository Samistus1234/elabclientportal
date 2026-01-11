import { format } from 'date-fns'
import { CheckCircle2, ArrowRight, Clock, Sparkles, FileText, Timer, Award } from 'lucide-react'
import { motion } from 'framer-motion'

interface StageHistoryItem {
    id: string
    created_at: string
    notes: string | null
    from_stage: { name: string } | null
    to_stage: { name: string }
}

interface TimelineViewProps {
    stageHistory: StageHistoryItem[]
}

export default function TimelineView({ stageHistory }: TimelineViewProps) {
    if (stageHistory.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
            >
                <div className="relative inline-block">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-5">
                        <Clock className="w-8 h-8 text-slate-400" />
                    </div>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                        className="absolute -inset-2 border-2 border-dashed border-slate-200 rounded-[1.25rem]"
                    />
                </div>
                <p className="text-slate-600 font-semibold">Your journey begins here</p>
                <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
                    Updates will appear as your application progresses through each stage
                </p>
            </motion.div>
        )
    }

    return (
        <div className="relative">
            {/* Animated connecting line */}
            <div className="absolute left-5 top-6 bottom-6 w-1 overflow-hidden rounded-full">
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
                    className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent via-white/40 to-transparent"
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
                className="space-y-5"
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
                            className="relative flex gap-4 group"
                        >
                            {/* Enhanced node */}
                            <div className="relative z-10 flex-shrink-0">
                                <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    className={`
                                        w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 relative
                                        ${isLatest
                                            ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 shadow-xl shadow-indigo-300/50 ring-4 ring-indigo-100'
                                            : 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-200/50'
                                        }
                                    `}
                                >
                                    {isLatest ? (
                                        <Sparkles className="w-5 h-5 text-white" />
                                    ) : (
                                        <CheckCircle2 className="w-5 h-5 text-white" />
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
                                    absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold
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
                                    flex-1 rounded-xl p-4 transition-all duration-300 relative overflow-hidden
                                    ${isLatest
                                        ? 'bg-gradient-to-br from-white via-indigo-50/50 to-purple-50/50 border-2 border-indigo-200 shadow-lg shadow-indigo-100/50'
                                        : 'bg-white/80 backdrop-blur-sm border border-slate-200/80 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/30'
                                    }
                                `}
                            >
                                {/* Card decorative gradient */}
                                {isLatest && (
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 rounded-full blur-2xl -translate-y-12 translate-x-12" />
                                )}

                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`font-bold ${isLatest ? 'text-indigo-900' : 'text-slate-800'}`}>
                                                    {item.to_stage.name}
                                                </span>
                                                {isLatest && (
                                                    <motion.span
                                                        animate={{ opacity: [1, 0.6, 1] }}
                                                        transition={{ duration: 1.5, repeat: Infinity }}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                                                    >
                                                        <Sparkles className="w-2.5 h-2.5" />
                                                        Current
                                                    </motion.span>
                                                )}
                                            </div>

                                            {item.from_stage && (
                                                <div className="flex items-center gap-2 mt-1.5 text-sm text-slate-500">
                                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md text-xs">
                                                        <ArrowRight className="w-3 h-3 text-slate-400" />
                                                        <span>from <span className="font-medium text-slate-600">{item.from_stage.name}</span></span>
                                                    </div>
                                                    {daysDiff !== null && daysDiff > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                                            <Timer className="w-3 h-3" />
                                                            <span>{daysDiff}d</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-right flex-shrink-0 ml-3">
                                            <div className={`text-xs font-semibold ${isLatest ? 'text-indigo-600' : 'text-slate-600'}`}>
                                                {format(new Date(item.created_at), 'MMM d, yyyy')}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                {format(new Date(item.created_at), 'h:mm a')}
                                            </div>
                                        </div>
                                    </div>

                                    {item.notes && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mt-3 p-3 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-lg border border-slate-200/50"
                                        >
                                            <div className="flex items-start gap-2">
                                                <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                                                <p className="text-xs text-slate-600 leading-relaxed">
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

            {/* Journey indicator at bottom */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex items-center gap-3 mt-6 pt-4 border-t border-dashed border-slate-200"
            >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <Award className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                    <p className="text-xs font-medium text-slate-500">Application Journey</p>
                    <p className="text-[10px] text-slate-400">{stageHistory.length} stage{stageHistory.length !== 1 ? 's' : ''} completed</p>
                </div>
            </motion.div>
        </div>
    )
}
