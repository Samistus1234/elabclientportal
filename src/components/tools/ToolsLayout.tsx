import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Wrench } from 'lucide-react'

interface ToolsLayoutProps {
    children: React.ReactNode
    title: string
    description: string
    showBackButton?: boolean
}

export default function ToolsLayout({ children, title, description, showBackButton = true }: ToolsLayoutProps) {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            {showBackButton && (
                                <button
                                    onClick={() => navigate('/tools')}
                                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                                </button>
                            )}
                            <Link to="/tools" className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center">
                                    <Wrench className="w-4 h-4 text-white" />
                                </div>
                                <span className="font-semibold text-slate-800">Free Tools</span>
                            </Link>
                        </div>
                        <Link
                            to="/"
                            className="text-sm text-slate-600 hover:text-primary-600 transition-colors"
                        >
                            Back to Portal
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tool Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">{title}</h1>
                    <p className="text-slate-600">{description}</p>
                </motion.div>

                {/* Tool Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card rounded-2xl p-6 sm:p-8"
                >
                    {children}
                </motion.div>

                {/* Privacy Notice */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500"
                >
                    <Shield className="w-4 h-4" />
                    <span>Your files are processed locally and never leave your browser</span>
                </motion.div>
            </main>
        </div>
    )
}
