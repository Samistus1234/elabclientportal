import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PortalLayout from '@/components/portal/PortalLayout'
import { ChevronRight } from 'lucide-react'
import { finishedLabel, getMyCases, getStages, isFinished, stepPosition, timeAgo, type MyCase, type Stage } from '@/lib/portalData'

export default function Applications() {
    const [cases, setCases] = useState<MyCase[] | null>(null)
    const [stages, setStages] = useState<Record<string, Stage[]>>({})
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let alive = true
        getMyCases()
            .then(async (cs) => {
                if (!alive) return
                setCases(cs)
                const byPipeline: Record<string, Stage[]> = {}
                await Promise.all(
                    Array.from(new Set(cs.map((c) => c.pipeline_id).filter(Boolean))).map(async (pid) => {
                        const c = cs.find((x) => x.pipeline_id === pid)!
                        byPipeline[pid as string] = await getStages(pid as string, c.pipeline_slug).catch(() => [])
                    }),
                )
                if (alive) setStages(byPipeline)
            })
            .catch(() => alive && setError("We couldn't load your applications. Please refresh the page."))
        return () => {
            alive = false
        }
    }, [])

    const groups: [string, MyCase[]][] = [
        ['In progress', (cases || []).filter((c) => !isFinished(c))],
        ['Finished', (cases || []).filter(isFinished)],
    ]

    return (
        <PortalLayout>
            <div className="pl-page pl-page-narrow">
                <div>
                    <h1 className="pl-h1">Applications</h1>
                    <div className="pl-sub">Every service eLab is handling for you.</div>
                </div>
                {error && <div className="pl-alert pl-alert-red">{error}</div>}
                {cases === null ? (
                    <div className="pl-card pl-card-pad"><div className="pl-skel" style={{ height: 64 }} role="status" aria-label="Loading" /></div>
                ) : cases.length === 0 ? (
                    <div className="pl-card"><div className="pl-empty" style={{ borderTop: 0 }}>You don't have an application with us yet.</div></div>
                ) : (
                    groups
                        .filter(([, list]) => list.length > 0)
                        .map(([label, list]) => (
                            <section key={label} className="pl-card">
                                <div className="pl-card-h"><h2>{label}</h2></div>
                                {list.map((c) => {
                                    const pos = stepPosition(stages[c.pipeline_id || ''], c.stage_id)
                                    const done = isFinished(c)
                                    return (
                                        <Link key={c.id} to={`/case/${c.id}`} className="pl-row" style={{ alignItems: 'center' }}>
                                            <div className="pl-row-t">
                                                <div className="pl-row-title" style={{ whiteSpace: 'normal' }}>{c.pipeline_name || 'Application'}</div>
                                                <div className="pl-row-sub" style={{ whiteSpace: 'normal' }}>{c.case_reference} · updated {timeAgo(c.updated_at)}</div>
                                                {/* A finished application shows its outcome, not the step it stopped on.
                                                    The label sits under the title so long step names never squeeze it. */}
                                                <div style={{ marginTop: 10 }}>
                                                    {done ? (
                                                        <span className={`pl-tag ${finishedLabel(c) === 'Completed' ? 'pl-tag-green' : 'pl-tag-grey'}`}>{finishedLabel(c)}</span>
                                                    ) : (
                                                        c.stage_name && <span className="pl-tag pl-tag-blue" style={{ display: 'inline-block', whiteSpace: 'normal' }}>{c.stage_name}</span>
                                                    )}
                                                </div>
                                                {pos && !done && (
                                                    <div style={{ marginTop: 12 }}>
                                                        <div className="pl-bar-track"><div className="pl-bar-fill" style={{ width: `${pos.pct}%` }} /></div>
                                                        <div className="pl-row-sub" style={{ marginTop: 6 }}>Step {pos.index} of {pos.count}</div>
                                                    </div>
                                                )}
                                            </div>
                                            <ChevronRight size={18} className="pl-chev" aria-hidden />
                                        </Link>
                                    )
                                })}
                            </section>
                        ))
                )}
            </div>
        </PortalLayout>
    )
}
