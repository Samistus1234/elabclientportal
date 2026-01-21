import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Activity, CheckCircle2, Clock } from 'lucide-react'
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns'

interface ServiceAction {
    id: string
    service_name: string
    service_icon: string | null
    service_color: string | null
    action_type: string
    action_label: string | null
    status_found: string | null
    client_summary: string | null
    performed_at: string
}

interface ServiceActionsTimelineProps {
    caseId: string
}

export default function ServiceActionsTimeline({ caseId }: ServiceActionsTimelineProps) {
    const [actions, setActions] = useState<ServiceAction[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (caseId) {
            loadServiceActions()
        }
    }, [caseId])

    const loadServiceActions = async () => {
        try {
            // Use RPC function for secure access (matches portal pattern)
            const { data, error: rpcError } = await supabase
                .rpc('get_my_case_service_actions', { p_case_id: caseId })

            if (rpcError) {
                console.error('Error fetching service actions:', rpcError)
                // Don't show error to user, just show empty state
                setActions([])
                return
            }

            setActions(data || [])
        } catch (err) {
            console.error('Error loading service actions:', err)
        } finally {
            setLoading(false)
        }
    }

    // Format date with smart labels
    const formatDate = (dateString: string): string => {
        try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) return 'Recently'

            if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`
            if (isYesterday(date)) return `Yesterday at ${format(date, 'h:mm a')}`
            if (isThisWeek(date)) return format(date, "EEEE 'at' h:mm a")
            return format(date, "MMM d, yyyy 'at' h:mm a")
        } catch {
            return 'Recently'
        }
    }

    const formatRelativeTime = (dateString: string): string => {
        try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) return 'recently'
            return formatDistanceToNow(date, { addSuffix: true })
        } catch {
            return 'recently'
        }
    }

    // Group actions by date
    const groupActionsByDate = (actions: ServiceAction[]) => {
        const groups: { [key: string]: ServiceAction[] } = {}

        actions.forEach(action => {
            try {
                const date = new Date(action.performed_at)
                if (isNaN(date.getTime())) {
                    const key = 'Recent'
                    if (!groups[key]) groups[key] = []
                    groups[key].push(action)
                    return
                }

                let key: string
                if (isToday(date)) {
                    key = 'Today'
                } else if (isYesterday(date)) {
                    key = 'Yesterday'
                } else if (isThisWeek(date)) {
                    key = 'This Week'
                } else {
                    key = format(date, 'MMMM yyyy')
                }

                if (!groups[key]) groups[key] = []
                groups[key].push(action)
            } catch {
                const key = 'Recent'
                if (!groups[key]) groups[key] = []
                groups[key].push(action)
            }
        })

        return groups
    }

    // Loading state
    if (loading) {
        return (
            <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Service Activity</h3>
                        <p className="text-slate-500 text-xs">Actions performed on your application</p>
                    </div>
                </div>
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-4">
                            <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-1/3" />
                                <div className="h-3 bg-slate-200 rounded w-2/3" />
                                <div className="h-3 bg-slate-200 rounded w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // Empty state
    if (actions.length === 0) {
        return (
            <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Service Activity</h3>
                        <p className="text-slate-500 text-xs">Actions performed on your application</p>
                    </div>
                </div>
                <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mx-auto mb-4">
                        <Activity className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-600 font-medium">No service activity yet</p>
                    <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
                        When we check your application status on external portals, updates will appear here.
                    </p>
                </div>
            </div>
        )
    }

    const groupedActions = groupActionsByDate(actions)

    return (
        <div className="glass-card rounded-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Service Activity</h3>
                        <p className="text-slate-500 text-xs">Actions performed on your application</p>
                    </div>
                </div>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                    {actions.length} {actions.length === 1 ? 'update' : 'updates'}
                </span>
            </div>

            {/* Timeline */}
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {Object.entries(groupedActions).map(([dateGroup, groupActions], groupIndex) => (
                    <div key={dateGroup}>
                        {/* Date Group Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-px bg-gradient-to-r from-slate-200 to-transparent flex-1" />
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider px-2">
                                {dateGroup}
                            </span>
                            <div className="h-px bg-gradient-to-l from-slate-200 to-transparent flex-1" />
                        </div>

                        {/* Actions in this group */}
                        <div className="space-y-4">
                            {groupActions.map((action, index) => (
                                <motion.div
                                    key={action.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: (groupIndex * 0.1) + (index * 0.05) }}
                                    className="relative"
                                >
                                    {/* Connection line */}
                                    {index !== groupActions.length - 1 && (
                                        <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 to-transparent" />
                                    )}

                                    <div className="flex gap-4">
                                        {/* Service Icon */}
                                        <div
                                            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-md border-2 bg-white transition-transform hover:scale-110"
                                            style={{
                                                borderColor: action.service_color || '#10b981',
                                                boxShadow: `0 4px 12px ${action.service_color || '#10b981'}20`
                                            }}
                                        >
                                            {action.service_icon || '📋'}
                                        </div>

                                        {/* Content Card */}
                                        <div className="flex-1 pb-2">
                                            <div className="p-4 bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                                {/* Header Row */}
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div>
                                                        <h4 className="font-semibold text-slate-800">
                                                            {action.service_name}
                                                        </h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
                                                                style={{
                                                                    backgroundColor: `${action.service_color || '#10b981'}15`,
                                                                    color: action.service_color || '#10b981'
                                                                }}
                                                            >
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                {action.action_label || action.action_type}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                                                        {formatRelativeTime(action.performed_at)}
                                                    </span>
                                                </div>

                                                {/* Status Badge */}
                                                {action.status_found && (
                                                    <div className="flex items-center gap-2 mb-3 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-sm text-emerald-700">
                                                            Portal Status: <span className="font-semibold">{action.status_found}</span>
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Client Summary */}
                                                {action.client_summary && (
                                                    <p className="text-slate-600 text-sm leading-relaxed">
                                                        {action.client_summary}
                                                    </p>
                                                )}

                                                {/* Timestamp Footer */}
                                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-xs text-slate-400">
                                                        {formatDate(action.performed_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
