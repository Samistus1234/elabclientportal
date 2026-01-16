import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Building2 } from 'lucide-react'
import { DraggableRequestCard } from './DraggableRequestCard'

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

export function PortalKanbanColumn({ column, requests }: PortalKanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
    })

    const requestIds = requests.map((r) => r.id)

    return (
        <div className="flex-shrink-0 w-72 md:w-80">
            <div
                ref={setNodeRef}
                className={`glass-card rounded-xl h-full flex flex-col overflow-hidden border-t-4 transition-all ${
                    isOver ? 'ring-2 ring-emerald-400 ring-offset-2' : ''
                }`}
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
                    <SortableContext items={requestIds} strategy={verticalListSortingStrategy}>
                        {requests.map((request) => (
                            <DraggableRequestCard key={request.id} request={request} />
                        ))}
                    </SortableContext>

                    {/* Empty State */}
                    {requests.length === 0 && (
                        <div className={`text-center py-8 text-slate-400 ${isOver ? 'bg-emerald-50 rounded-lg' : ''}`}>
                            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs">{isOver ? 'Drop here' : 'No requests'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
