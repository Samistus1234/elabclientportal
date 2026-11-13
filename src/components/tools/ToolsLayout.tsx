import { Link } from 'react-router-dom'
import { ChevronRight, ShieldCheck } from 'lucide-react'
import '@/tools-v2.css'

interface ToolsLayoutProps {
    children: React.ReactNode
    title: string
    description: string
    /** Kept for the existing pages; the header always links back to all tools. */
    showBackButton?: boolean
}

/** Shared header for the free tools: logo, "Free tools" breadcrumb, link home. */
export function ToolsHeader({ current }: { current?: string }) {
    return (
        <header className="tools-header">
            <div className="tools-wrap">
                <Link to="/" aria-label="eLab home"><img src="/elab-logo-blue.png" alt="eLab Solutions International" width="148" height="28" /></Link>
                <nav className="tools-crumb" aria-label="Breadcrumb">
                    <ChevronRight size={14} aria-hidden />
                    {current ? <Link to="/tools">Free tools</Link> : <span aria-current="page">Free tools</span>}
                    {current && <><ChevronRight size={14} aria-hidden /><span aria-current="page">{current}</span></>}
                </nav>
                <Link to={current ? '/tools' : '/'} className="tools-home-link">{current ? 'All tools' : 'eLab home'}</Link>
            </div>
        </header>
    )
}

export default function ToolsLayout({ children, title, description }: ToolsLayoutProps) {
    return (
        <div className="tools-v2">
            <ToolsHeader current={title} />
            <main className="tools-page">
                <div className="tools-wrap">
                    <div className="tools-page-head">
                        <h1>{title}</h1>
                        <p>{description}</p>
                    </div>
                    <div className="tools-panel">{children}</div>
                    <p className="tools-privacy"><ShieldCheck size={16} aria-hidden />Your files are processed on your device and never uploaded.</p>
                </div>
            </main>
        </div>
    )
}
