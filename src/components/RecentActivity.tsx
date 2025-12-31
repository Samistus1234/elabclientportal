import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
    Activity,
    Bell,
    CheckCircle2,
    Clock,
    FileText,
    Sparkles,
    TrendingUp
} from 'lucide-react'

interface CaseData {
    id: string
    case_reference: string
    status: string
    updated_at: string
    pipeline: {
        name: string
        slug: string
    }
    current_stage: {
        name: string
        slug: string
    }
}

interface RecentActivityProps {
    cases: CaseData[]
}

export default function RecentActivity({ cases }: RecentActivityProps) {
    // Sort by most recently updated
    const recentCases = [...cases]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5)

    const getActivityIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return CheckCircle2
            case 'active':
                return TrendingUp
            case 'on_hold':
                return Bell
            default:
                return FileText
        }
    }

    const getActivityColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'from-success-400 to-success-600'
            case 'active':
                return 'from-primary-400 to-primary-600'
            case 'on_hold':
                return 'from-warning-400 to-warning-600'
            default:
                return 'from-slate-400 to-slate-600'
        }
    }

    if (cases.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-6"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Recent Activity</h3>
                        <p className="text-slate-500 text-xs">Latest updates on your applications</p>
                    </div>
                </div>
                <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No recent activity to show</p>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-800">Recent Activity</h3>
                    <p className="text-slate-500 text-xs">Latest updates on your applications</p>
                </div>
            </div>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary-200 via-accent-200 to-transparent" />

                <div className="space-y-4">
                    {recentCases.map((caseItem, index) => {
                        const Icon = getActivityIcon(caseItem.status)
                        const gradientColor = getActivityColor(caseItem.status)

                        return (
                            <motion.div
                                key={caseItem.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-start gap-4 group"
                            >
                                {/* Timeline node */}
                                <div className={`
                                    relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                                    bg-gradient-to-br ${gradientColor} shadow-lg
                                    group-hover:scale-110 transition-transform
                                `}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 bg-slate-50/50 rounded-xl p-4 group-hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start justify-between mb-1">
                                        <h4 className="font-medium text-slate-800 text-sm">
                                            {caseItem.pipeline?.name}
                                        </h4>
                                        <span className="text-xs text-slate-400">
                                            {formatDistanceToNow(new Date(caseItem.updated_at), { addSuffix: true })}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <span>Stage:</span>
                                        <span className="font-medium text-primary-600">
                                            {caseItem.current_stage?.name}
                                        </span>
                                    </div>

                                    {/* Status indicator */}
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className={`
                                            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                                            ${caseItem.status === 'active' ? 'bg-primary-100 text-primary-700' :
                                                caseItem.status === 'completed' ? 'bg-success-100 text-success-700' :
                                                    caseItem.status === 'on_hold' ? 'bg-warning-100 text-warning-700' :
                                                        'bg-slate-100 text-slate-600'}
                                        `}>
                                            <Clock className="w-3 h-3" />
                                            {caseItem.status.replace('_', ' ')}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>

            {cases.length > 5 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center mt-4 pt-4 border-t border-slate-100"
                >
                    <span className="text-sm text-slate-500">
                        And {cases.length - 5} more application{cases.length - 5 !== 1 ? 's' : ''}...
                    </span>
                </motion.div>
            )}
        </motion.div>
    )
}
