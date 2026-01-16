import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
    Building2, Calendar, ChevronRight, AlertCircle, Hash, User
} from 'lucide-react'

// Types
interface VerificationRequest {
    id: string
    request_reference: string
    dataflow_case_number: string | null
    status: string
    priority: string
    requested_at: string
    completed_at: string | null
    case_reference: string | null
    applicant_name: string | null
}

export interface KanbanColumnConfig {
    id: string
    name: string
    statuses: string[]
    color: string
    bgColor: string
}

interface PortalKanbanColumnProps {
    column: KanbanColumnConfig
    requests: VerificationRequest[]
}

const priorityConfig: Record<string, { label: string; color: string }> = {
    low: { label: 'Low', color: 'text-slate-500' },
    normal: { label: 'Normal', color: 'text-blue-500' },
    high: { label: 'High', color: 'text-orange-500' },
    urgent: { label: 'Urgent', color: 'text-red-500' },
}

export function PortalKanbanColumn({ column, requests }: PortalKanbanColumnProps) {
    return (
        <div className="flex-shrink-0 w-72 md:w-80">
            <div
                className="glass-card rounded-xl h-full flex flex-col overflow-hidden border-t-4"
                style={{ borderTopColor: column.color }}
            >
                {/* Header */}
                <div
                    className="px-4 py-3"
                    style={{ background: `linear-gradient(to bottom, ${column.color}15, transparent)` }}
                >
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800">{column.name}</h3>
                        <span
                            className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: column.color }}
                        >
                            {requests.length}
                        </span>
                    </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 max-h-[calc(100vh-420px)] min-h-[200px]">
                    {requests.map((request, index) => (
                        <motion.div
                            key={request.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Link
                                to={`/contact/request/${request.id}`}
                                className="block glass-card rounded-lg p-3 hover:shadow-md transition-all group border-l-4 border-l-transparent hover:border-l-emerald-500"
                            >
                                {/* Reference */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <span className="font-semibold text-sm text-slate-800 truncate">
                                        {request.request_reference}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors flex-shrink-0" />
                                </div>

                                {/* Priority Badge */}
                                {request.priority !== 'normal' && (
                                    <div className="mb-2">
                                        {request.priority === 'urgent' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                <AlertCircle className="w-3 h-3" />
                                                Urgent
                                            </span>
                                        )}
                                        {request.priority === 'high' && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                                High
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Applicant Name */}
                                <p className="text-xs text-slate-600 flex items-center gap-1.5 truncate mb-1">
                                    <User className="w-3 h-3 flex-shrink-0" />
                                    {request.applicant_name || 'Unknown Applicant'}
                                </p>

                                {/* DataFlow Case Number */}
                                {request.dataflow_case_number && (
                                    <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate mb-1">
                                        <Hash className="w-3 h-3 flex-shrink-0" />
                                        {request.dataflow_case_number}
                                    </p>
                                )}

                                {/* Date */}
                                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3 flex-shrink-0" />
                                    {new Date(request.requested_at).toLocaleDateString()}
                                </p>
                            </Link>
                        </motion.div>
                    ))}

                    {/* Empty State */}
                    {requests.length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs">No requests</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
