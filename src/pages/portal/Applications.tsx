import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PortalLayout from '@/components/portal/PortalLayout'
import { getMyCases, getStages, isFinished, stepPosition, timeAgo, type MyCase, type Stage } from '@/lib/portalData'

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 820 }}>
                <div>
                    <h1 className="pl-h1">Applications</h1>
                    <div className="pl-sub">Every service eLab is handling for you.</div>
                </div>
                {error && <div className="pl-alert pl-alert-red">{error}</div>}
                {cases === null ? (
                    <div className="pl-card pl-card-pad"><div className="pl-skel" style={{ height: 64 }} /></div>
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
                                    return (
                                        <Link key={c.id} to={`/case/${c.id}`} className="pl-row" style={{ flexWrap: 'wrap' }}>
                                            <div className="pl-row-t">
                                                <div className="pl-row-title">{c.pipeline_name || 'Application'}</div>
                                                <div className="pl-row-sub">{c.case_reference} · updated {timeAgo(c.updated_at)}</div>
                                            </div>
                                            {c.stage_name && <span className="pl-tag pl-tag-blue">{c.stage_name}</span>}
                                            {pos && !isFinished(c) && (
                                                <div style={{ flexBasis: '100%' }}>
                                                    <div className="pl-bar-track"><div className="pl-bar-fill" style={{ width: `${pos.pct}%` }} /></div>
                                                    <div className="pl-row-sub" style={{ marginTop: 5 }}>Step {pos.index} of {pos.count}</div>
                                                </div>
                                            )}
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
