import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Wrench, Shield, Zap, Globe, FileText, Image, Settings } from 'lucide-react'
import ToolCard from '@/components/tools/ToolCard'
import { toolCategories, getToolsByCategory } from '@/lib/tools/toolsConfig'

const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
}

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
}

const categoryIcons = {
    pdf: FileText,
    image: Image,
    utility: Settings
}

export default function ToolsHome() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/tools" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center">
                                <Wrench className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-semibold text-slate-800">Free Tools</span>
                        </Link>
                        <Link
                            to="/"
                            className="text-sm text-slate-600 hover:text-primary-600 transition-colors"
                        >
                            Back to Portal
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden py-16 sm:py-24">
                {/* Background decoration */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-200/30 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={staggerContainer}
                        className="text-center max-w-3xl mx-auto"
                    >
                        <motion.div
                            variants={fadeInUp}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6"
                        >
                            <Zap className="w-4 h-4" />
                            100% Free - No Sign Up Required
                        </motion.div>

                        <motion.h1
                            variants={fadeInUp}
                            className="text-4xl sm:text-5xl font-bold text-slate-800 mb-4"
                        >
                            Free Online Tools
                        </motion.h1>

                        <motion.p
                            variants={fadeInUp}
                            className="text-lg text-slate-600 mb-8"
                        >
                            Powerful tools for PDF manipulation, image processing, and more.
                            All processing happens in your browser - your files never leave your device.
                        </motion.p>

                        {/* Trust badges */}
                        <motion.div
                            variants={fadeInUp}
                            className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500"
                        >
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-green-500" />
                                <span>100% Secure</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-blue-500" />
                                <span>No Upload Required</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-yellow-500" />
                                <span>Instant Processing</span>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Tools Grid by Category */}
            <section className="py-12 sm:py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {toolCategories.map((category, categoryIndex) => {
                        const categoryTools = getToolsByCategory(category.id)
                        const CategoryIcon = categoryIcons[category.id as keyof typeof categoryIcons]

                        return (
                            <motion.div
                                key={category.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: categoryIndex * 0.1 }}
                                className="mb-12"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-blue-100 flex items-center justify-center">
                                        <CategoryIcon className="w-5 h-5 text-primary-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">
                                            {category.name}
                                        </h2>
                                        <p className="text-sm text-slate-500">
                                            {category.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {categoryTools.map((tool, toolIndex) => (
                                        <ToolCard
                                            key={tool.id}
                                            tool={tool}
                                            index={toolIndex}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <Shield className="w-4 h-4" />
                            <span>Your files are processed locally and never uploaded to any server</span>
                        </div>
                        <Link
                            to="/"
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                            ELAB Client Portal
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
