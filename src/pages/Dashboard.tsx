import { useEffect, useState } from 'react'
import { supabase, signOut } from '@/lib/supabase'
import { motion } from 'framer-motion'
import {
    LogOut,
    FileText,
    AlertCircle,
    Sparkles,
    LayoutGrid,
    List,
    RefreshCw,
    Bell
} from 'lucide-react'
import WelcomeHero from '@/components/WelcomeHero'
import ApplicationStatusChart from '@/components/ApplicationStatusChart'
import ApplicationCard from '@/components/ApplicationCard'
import RecentActivity from '@/components/RecentActivity'
import ServicesShowcase from '@/components/ServicesShowcase'
import QuickActions from '@/components/QuickActions'
import TestimonialsCarousel from '@/components/TestimonialsCarousel'
import MilestoneAchievements from '@/components/MilestoneAchievements'
import UpcomingDeadlines from '@/components/UpcomingDeadlines'
import DocumentChecklist from '@/components/DocumentChecklist'
import SupportHelpSection from '@/components/SupportHelpSection'
import AnimatedBackground from '@/components/AnimatedBackground'

interface CaseData {
    id: string
    case_reference: string
    status: string
    priority: string
    created_at: string
    updated_at: string
    pipeline: {
        name: string
        slug: string
    }
    current_stage: {
        name: string
        slug: string
        id: string
    }
    metadata: Record<string, any>
}

interface PersonData {
    id: string
    first_name: string
    last_name: string
    email: string
}

interface PipelineStage {
    id: string
    name: string
    slug: string
    order_index: number
    pipeline_id: string
}

export default function Dashboard() {
    const [person, setPerson] = useState<PersonData | null>(null)
    const [cases, setCases] = useState<CaseData[]>([])
    const [pipelineStages, setPipelineStages] = useState<Record<string, PipelineStage[]>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        loadClientData()
    }, [])

    const loadClientData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user?.email) throw new Error('No user found')

            // Find person by email
            const { data: personData, error: personError } = await supabase
                .from('persons')
                .select('id, first_name, last_name, email, primary_email')
                .or(`email.eq.${user.email},primary_email.eq.${user.email}`)
                .single()

            if (personError || !personData) {
                throw new Error('No account found for this email. Please contact support.')
            }

            setPerson(personData)

            // Load cases for this person
            const { data: casesData, error: casesError } = await supabase
                .from('cases')
                .select(`
                    id,
                    case_reference,
                    status,
                    priority,
                    created_at,
                    updated_at,
                    metadata,
                    pipeline:pipelines(id, name, slug),
                    current_stage:pipeline_stages!cases_current_stage_id_fkey(id, name, slug)
                `)
                .eq('person_id', personData.id)
                .order('created_at', { ascending: false })

            if (casesError) throw casesError

            const typedCases = (casesData || []) as unknown as CaseData[]
            setCases(typedCases)

            // Load pipeline stages for each unique pipeline
            const pipelineIds = [...new Set(typedCases.map(c => (c.pipeline as any)?.id).filter(Boolean))]

            if (pipelineIds.length > 0) {
                const { data: stagesData } = await supabase
                    .from('pipeline_stages')
                    .select('id, name, slug, order_index, pipeline_id')
                    .in('pipeline_id', pipelineIds)
                    .order('order_index', { ascending: true })

                if (stagesData) {
                    const stagesByPipeline: Record<string, PipelineStage[]> = {}
                    stagesData.forEach(stage => {
                        if (!stagesByPipeline[stage.pipeline_id]) {
                            stagesByPipeline[stage.pipeline_id] = []
                        }
                        stagesByPipeline[stage.pipeline_id].push(stage)
                    })
                    setPipelineStages(stagesByPipeline)
                }
            }

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadClientData()
        setRefreshing(false)
    }

    const handleSignOut = async () => {
        await signOut()
        window.location.href = '/login'
    }

    const activeCases = cases.filter(c => c.status === 'active').length
    const completedCases = cases.filter(c => c.status === 'completed').length

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
                <div className="flex flex-col items-center gap-4">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                        <div className="w-16 h-16 rounded-full border-4 border-primary-200 border-t-primary-600" />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-center"
                    >
                        <p className="text-slate-600 font-medium">Loading your dashboard...</p>
                        <p className="text-slate-400 text-sm">Preparing your personalized view</p>
                    </motion.div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card rounded-2xl p-8 max-w-md text-center"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Oops!</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button
                        onClick={handleSignOut}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                        Sign out and try again
                    </button>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-12 relative">
            {/* Animated Background */}
            <AnimatedBackground />

            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-100/50 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <motion.div
                                whileHover={{ rotate: 180 }}
                                transition={{ duration: 0.3 }}
                                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-200"
                            >
                                <Sparkles className="w-5 h-5 text-white" />
                            </motion.div>
                            <div>
                                <span className="font-bold text-slate-800">ELAB Portal</span>
                                <p className="text-xs text-slate-400 hidden sm:block">Healthcare Professional Services</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                            {/* Notification Bell */}
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                            </motion.button>

                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-50"
                                title="Refresh data"
                            >
                                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                            </button>

                            <div className="hidden sm:flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-2 rounded-xl">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-bold text-sm">
                                    {person?.first_name?.charAt(0)}{person?.last_name?.charAt(0)}
                                </div>
                                <span className="text-sm font-medium">{person?.first_name}</span>
                            </div>

                            <button
                                onClick={handleSignOut}
                                className="p-2 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
                                title="Sign out"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Welcome Hero */}
                <WelcomeHero
                    firstName={person?.first_name || 'there'}
                    totalApplications={cases.length}
                    activeApplications={activeCases}
                    completedApplications={completedCases}
                />

                {/* Quick Actions */}
                <QuickActions />

                {/* Services Cross-sell */}
                <ServicesShowcase />

                {/* Main Grid - Charts and Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Left Column - 2/3 width */}
                    <div className="lg:col-span-2 space-y-6">
                        {cases.length > 0 && (
                            <ApplicationStatusChart cases={cases} />
                        )}
                        <RecentActivity cases={cases} />
                        <TestimonialsCarousel />
                    </div>

                    {/* Right Column - 1/3 width */}
                    <div className="space-y-6">
                        <MilestoneAchievements
                            completedStages={completedCases}
                            totalStages={cases.length || 5}
                            daysActive={14}
                            documentsUploaded={3}
                        />
                        <UpcomingDeadlines />
                        <DocumentChecklist />
                    </div>
                </div>

                {/* Applications Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-8"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Your Applications</h2>
                            <p className="text-slate-500 text-sm mt-1">
                                Track the progress of all your applications
                            </p>
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'list'
                                    ? 'bg-primary-500 text-white shadow'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                title="List view"
                            >
                                <List className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'grid'
                                    ? 'bg-primary-500 text-white shadow'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                title="Grid view"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {cases.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-card rounded-2xl p-12 text-center"
                        >
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-6">
                                <FileText className="w-10 h-10 text-slate-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Applications Yet</h3>
                            <p className="text-slate-500 max-w-md mx-auto">
                                Your applications will appear here once they're created. Contact our team if you need assistance getting started.
                            </p>
                        </motion.div>
                    ) : (
                        <div className={viewMode === 'grid'
                            ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
                            : 'space-y-4'
                        }>
                            {cases.map((caseItem, index) => (
                                <ApplicationCard
                                    key={caseItem.id}
                                    caseItem={caseItem}
                                    index={index}
                                    stages={pipelineStages[(caseItem.pipeline as any)?.id]}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Support Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SupportHelpSection />
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-2xl p-6 flex flex-col justify-center items-center text-center"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mb-4 shadow-lg">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Ready to Excel?</h3>
                        <p className="text-slate-500 text-sm mb-4 max-w-sm">
                            Join thousands of healthcare professionals who have achieved their career goals with ELAB.
                        </p>
                        <motion.a
                            href="https://www.elab.academy"
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold shadow-lg shadow-primary-200 hover:shadow-xl transition-shadow inline-block"
                        >
                            Explore Our Services
                        </motion.a>
                    </motion.div>
                </div>

                {/* Footer */}
                <motion.footer
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center mt-12 pt-8 border-t border-slate-100"
                >
                    <p className="text-slate-400 text-sm">
                        © 2025 ELAB Services. Empowering Healthcare Professionals Worldwide.
                    </p>
                    <p className="text-slate-400 text-xs mt-2">
                        828 Lane Allen Road 219, Lexington, Kentucky, USA
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-400">
                        <a href="https://www.elab.academy/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-primary-500 transition-colors">Privacy Policy</a>
                        <span>•</span>
                        <a href="https://www.elab.academy/terms" target="_blank" rel="noopener noreferrer" className="hover:text-primary-500 transition-colors">Terms of Service</a>
                        <span>•</span>
                        <a href="mailto:info@elab.academy" className="hover:text-primary-500 transition-colors">Contact Us</a>
                        <span>•</span>
                        <a href="tel:+19294192327" className="hover:text-primary-500 transition-colors">+1 (929) 419-2327</a>
                    </div>
                </motion.footer>
            </main>
        </div>
    )
}
