import { format } from 'date-fns'
import { CheckCircle2, ArrowRight } from 'lucide-react'
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
            <div className="text-center py-8">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm">Your timeline will appear here as your application progresses.</p>
            </div>
        )
    }

    return (
        <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-primary-300 via-primary-200 to-transparent" />

            <div className="space-y-6">
                {stageHistory.map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative flex gap-4"
                    >
                        {/* Node */}
                        <div className={`
              relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0
              ${index === 0
                                ? 'bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-200'
                                : 'bg-white border-2 border-primary-200'
                            }
            `}>
                            <CheckCircle2 className={`w-5 h-5 ${index === 0 ? 'text-white' : 'text-primary-500'}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                {item.from_stage && (
                                    <>
                                        <span className="text-slate-500 text-sm">{item.from_stage.name}</span>
                                        <ArrowRight className="w-4 h-4 text-slate-400" />
                                    </>
                                )}
                                <span className={`font-medium ${index === 0 ? 'text-primary-600' : 'text-slate-700'}`}>
                                    {item.to_stage.name}
                                </span>
                            </div>
                            <p className="text-slate-400 text-xs mt-1">
                                {format(new Date(item.created_at), 'MMM d, yyyy • h:mm a')}
                            </p>
                            {item.notes && (
                                <p className="text-slate-600 text-sm mt-2 bg-slate-50 p-3 rounded-lg">
                                    {item.notes}
                                </p>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
