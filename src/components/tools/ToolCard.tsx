import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ToolConfig } from '@/lib/tools/toolsConfig'

interface ToolCardProps {
    tool: ToolConfig
    index: number
}

export default function ToolCard({ tool, index }: ToolCardProps) {
    const Icon = tool.icon

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Link
                to={tool.path}
                className="group block glass-card rounded-xl p-6 hover:shadow-lg transition-all duration-300"
            >
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors">
                                {tool.name}
                            </h3>
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{tool.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {tool.features.slice(0, 3).map((feature) => (
                                <span
                                    key={feature}
                                    className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full"
                                >
                                    {feature}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    )
}
