import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import {
    Calendar, ChevronRight, AlertCircle, Hash, User, GripVertical
} from 'lucide-react'

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

interface DraggableRequestCardProps {
    request: VerificationRequest
    isDragging?: boolean
}

export function DraggableRequestCard({ request }: DraggableRequestCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging,
    } = useSortable({ id: request.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isSortableDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`glass-card rounded-lg p-3 group border-l-4 border-l-transparent hover:border-l-emerald-500 transition-all ${
                isSortableDragging ? 'shadow-lg ring-2 ring-emerald-400' : ''
            }`}
        >
            <div className="flex gap-2">
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-400 hover:text-slate-600 touch-none"
                >
                    <GripVertical className="w-4 h-4" />
                </div>

                {/* Card Content - Clickable */}
                <Link
                    to={`/contact/request/${request.id}`}
                    className="flex-1 min-w-0"
                    onClick={(e) => {
                        // Prevent navigation while dragging
                        if (isSortableDragging) {
                            e.preventDefault()
                        }
                    }}
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
            </div>
        </div>
    )
}
