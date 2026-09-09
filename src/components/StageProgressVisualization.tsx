import { useState } from 'react'

interface Stage { id: string; name: string; slug: string; order_index: number }
interface StageProgressVisualizationProps {
    stages: Stage[]; currentStageId: string; completedStageIds?: string[];
    showLabels?: boolean; size?: 'sm' | 'md' | 'lg';
}
export default function StageProgressVisualization({ stages, currentStageId, completedStageIds = [] }: StageProgressVisualizationProps) {
    const [expanded, setExpanded] = useState(false)
    if (!stages?.length) return null
    const ordered = [...stages].sort((a,b) => a.order_index-b.order_index)
    const index = ordered.findIndex(s => s.id === currentStageId)
    const progress = index >= 0 ? Math.round((index+1)/ordered.length*100) : 0
    return <section className="quiet-stage-progress" aria-label="Application stages">
        <div className="quiet-stage-heading"><div><p>Current stage</p><h3>{ordered[index]?.name || 'Stage not available'}</h3></div><span>{index >= 0 ? `Stage ${index+1} of ${ordered.length}` : `${ordered.length} stages`}</span></div>
        <div className="record-progress"><progress value={progress} max={100} aria-label="Position in stage sequence"/><span>{progress}%</span></div>
        <p className="record-note">Position in the stage sequence, not an estimate of remaining processing time.</p>
        <button className="quiet-stage-toggle" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? 'Hide all stages' : 'View all stages'} <span aria-hidden="true">{expanded?'−':'+'}</span></button>
        {expanded && <><p className="record-note">{Math.max(index,0)} earlier stages · {Math.max(ordered.length-index-1,0)} remaining stages</p><ol className="quiet-stage-list">{ordered.map((stage,i) => <li key={stage.id} aria-current={i===index?'step':undefined}><span>{i+1}</span><div><strong>{stage.name}</strong><small>{i===index?'Current stage':completedStageIds.includes(stage.id)||i<index?'Earlier stage':'Upcoming stage'}</small></div></li>)}</ol></>}
    </section>
}
