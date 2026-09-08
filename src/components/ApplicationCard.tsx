import { Link } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'

interface Stage {
    id: string
    name: string
    slug: string
    order_index: number
}

interface CaseData {
    id: string
    case_reference: string
    status: string
    priority: string
    created_at: string
    updated_at: string
    pipeline?: {
        id?: string
        name: string
        slug?: string
    } | null
    current_stage?: {
        id?: string
        name: string
        slug?: string
    } | null
    metadata?: Record<string, any>
}

interface ApplicationCardProps {
    caseItem: CaseData
    index: number
    stages?: Stage[]
}

export default function ApplicationCard({ caseItem, stages }: ApplicationCardProps) {
    const ordered = [...(stages || [])].sort((a,b) => a.order_index-b.order_index)
    const current = ordered.findIndex(s => s.id === caseItem.current_stage?.id || s.slug === caseItem.current_stage?.slug)
    const progress = caseItem.status === 'completed' ? 100 : caseItem.status === 'cancelled' ? 0 : current >= 0 ? Math.round((current+1)/ordered.length*100) : null
    const status = ({active:'In progress',completed:'Completed',on_hold:'On hold',cancelled:'Cancelled'} as Record<string,string>)[caseItem.status] || caseItem.status
    function date(value: string, relative = false) { const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Not available' : relative ? formatDistanceToNow(d, {addSuffix:true}) : format(d,'d MMM yyyy') }
    return <article className="application-record">
        <div className="record-heading"><h2><Link to={`/case/${caseItem.id}`}>{caseItem.pipeline?.name || 'Application'}</Link></h2><span className={`record-status status-${caseItem.status}`}>{status}</span></div>
        <p className="record-reference">{caseItem.case_reference}</p>
        <div className="record-stage"><p>Current stage</p><h3>{caseItem.current_stage?.name || 'Stage not available'}</h3></div>
        {progress !== null ? <><div className="record-progress"><progress aria-label="Application stage progress" value={progress} max={100}/><span>{progress}%</span></div><p className="record-note">{current >= 0 ? `Stage ${current+1} of ${ordered.length}. ` : ''}Stage progress does not indicate remaining processing time.</p></> : <p className="record-note">Stage progress is not available yet.</p>}
        {!!ordered.length && <details className="record-stages"><summary>View all stages</summary><ol>{ordered.map((stage,i) => <li key={stage.id} aria-current={i===current?'step':undefined}><span>{i+1}</span><div>{stage.name}<small>{i===current?'Current stage':caseItem.status==='completed' || i<current?'Earlier stage':'Upcoming stage'}</small></div></li>)}</ol></details>}
        <dl className="record-dates"><div><dt>Started</dt><dd>{date(caseItem.created_at)}</dd></div><div><dt>Last update</dt><dd>{date(caseItem.updated_at,true)}</dd></div></dl>
        <Link className="record-details" to={`/case/${caseItem.id}`}>View application details →</Link>
    </article>
}
