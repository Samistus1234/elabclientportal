import { Link } from 'react-router-dom'
import { ToolConfig } from '@/lib/tools/toolsConfig'

interface ToolCardProps {
    tool: ToolConfig
    /** Kept for existing callers; cards no longer animate in. */
    index?: number
}

export default function ToolCard({ tool }: ToolCardProps) {
    const Icon = tool.icon
    return (
        <Link to={tool.path} className="tools-card">
            <Icon size={30} strokeWidth={1.8} aria-hidden />
            <h3>{tool.name}</h3>
            <p>{tool.description}</p>
            <span className="more">Open ›</span>
        </Link>
    )
}
