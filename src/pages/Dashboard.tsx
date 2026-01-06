import { useEffect, useState } from 'react'
import { supabase, signOut } from '@/lib/supabase'
import { motion } from 'framer-motion'
import {
    LogOut,
    FileText,
    AlertCircle,
    LayoutGrid,
    List,
    RefreshCw,
    Bell,
    Sparkles,
    X,
    CheckCircle,
    Clock,
    MessageCircle
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
        id?: string
        name: string
        slug: string
    } | null
    current_stage: {
        id?: string
        name: string
        slug: string
    } | null
    metadata: Record<string, any>
    // Flat fields from RPC (if returned that way)
    pipeline_id?: string
    pipeline_name?: string
    pipeline_slug?: string
    current_stage_id?: string
    current_stage_name?: string
    current_stage_slug?: string
}

// Helper to normalize case data from RPC
const normalizeCase = (c: any): CaseData => {
    // Handle both prefixed (out_) and non-prefixed column names
    return {
        id: c.out_id || c.id,
        case_reference: c.out_case_reference || c.case_reference || c.caseReference || '',
        status: c.out_status || c.status || 'active',
        priority: c.out_priority || c.priority || 'normal',
        created_at: c.out_created_at || c.created_at || c.createdAt || new Date().toISOString(),
        updated_at: c.out_updated_at || c.updated_at || c.updatedAt || new Date().toISOString(),
        metadata: c.out_metadata || c.metadata || {},
        pipeline: c.pipeline || (c.out_pipeline_name || c.pipeline_name) ? {
            id: c.out_pipeline_id || c.pipeline_id,
            name: c.out_pipeline_name || c.pipeline_name,
            slug: c.out_pipeline_slug || c.pipeline_slug || ''
        } : null,
        current_stage: c.current_stage || (c.out_current_stage_name || c.current_stage_name) ? {
            id: c.out_current_stage_id || c.current_stage_id,
            name: c.out_current_stage_name || c.current_stage_name,
            slug: c.out_current_stage_slug || c.current_stage_slug || ''
        } : null,
    }
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
    const [showNotifications, setShowNotifications] = useState(false)

    // Demo notifications - these would come from real data in production
    const notifications = [
        {
            id: '1',
            type: 'success',
            title: 'Welcome to ELAB Client Portal!',
            message: 'Your account has been set up successfully.',
            time: 'Just now',
            read: false
        },
        {
            id: '2',
            type: 'info',
            title: 'Document Upload Available',
            message: 'You can now upload documents for your application.',
            time: '1 hour ago',
            read: false
        },
        {
            id: '3',
            type: 'reminder',
            title: 'Complete Your Profile',
            message: 'Add your contact details to stay updated.',
            time: '2 hours ago',
            read: true
        }
    ]

    const unreadCount = notifications.filter(n => !n.read).length

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

            // Load cases for this person using RPC function
            const { data: casesData, error: casesError } = await supabase
                .rpc('get_my_synced_cases')

            if (casesError) throw casesError

            // Normalize the data from RPC to match expected structure
            const typedCases = (casesData || []).map(normalizeCase)
            setCases(typedCases)

            // Load pipeline stages for each unique pipeline
            const pipelineIds = [...new Set(typedCases.map((c: CaseData) => c.pipeline?.id || c.pipeline_id).filter(Boolean))]

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
                            <img
                                src="/elab-logo.png"
                                alt="ELAB Solutions International"
                                className="h-10 sm:h-12"
                            />
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                            {/* Notification Bell */}
                            <div className="relative">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                                >
                                    <Bell className="w-5 h-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                                    )}
                                </motion.button>

                                {/* Notification Dropdown */}
                                {showNotifications && (
                                    <>
                                        {/* Backdrop */}
                                        <div
                                            className="fixed inset-0 z-30"
                                            onClick={() => setShowNotifications(false)}
                                        />

                                        <motion.div
                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-40"
                                        >
                                            {/* Header */}
                                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                                                <h3 className="font-semibold text-slate-800">Notifications</h3>
                                                <button
                                                    onClick={() => setShowNotifications(false)}
                                                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Notifications List */}
                                            <div className="max-h-80 overflow-y-auto">
                                                {notifications.length === 0 ? (
                                                    <div className="py-8 text-center">
                                                        <Bell className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                                        <p className="text-slate-500 text-sm">No notifications</p>
                                                    </div>
                                                ) : (
                                                    notifications.map((notification) => (
                                                        <div
                                                            key={notification.id}
                                                            className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${
                                                                !notification.read ? 'bg-blue-50/50' : ''
                                                            }`}
                                                        >
                                                            <div className="flex gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                                    notification.type === 'success' ? 'bg-green-100' :
                                                                    notification.type === 'info' ? 'bg-blue-100' :
                                                                    'bg-amber-100'
                                                                }`}>
                                                                    {notification.type === 'success' ? (
                                                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                                                    ) : notification.type === 'info' ? (
                                                                        <MessageCircle className="w-4 h-4 text-blue-600" />
                                                                    ) : (
                                                                        <Clock className="w-4 h-4 text-amber-600" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`text-sm ${!notification.read ? 'font-medium text-slate-800' : 'text-slate-700'}`}>
                                                                        {notification.title}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                                        {notification.message}
                                                                    </p>
                                                                    <p className="text-xs text-slate-400 mt-1">
                                                                        {notification.time}
                                                                    </p>
                                                                </div>
                                                                {!notification.read && (
                                                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            {/* Footer */}
                                            {notifications.length > 0 && (
                                                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
                                                    <button className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-1">
                                                        Mark all as read
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    </>
                                )}
                            </div>

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
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 mt-3 text-slate-400 text-xs">
                        <p>4, Addo Road, Suite 10, Stephen Taiwo Shopping Complex, Ajah, Lagos, Nigeria</p>
                        <span className="hidden sm:inline">|</span>
                        <p>828 Lane Allen Road 219, Lexington, Kentucky, USA</p>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-400">
                        <a href="https://www.elab.academy/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-primary-500 transition-colors">Privacy Policy</a>
                        <span>•</span>
                        <a href="https://www.elab.academy/terms" target="_blank" rel="noopener noreferrer" className="hover:text-primary-500 transition-colors">Terms of Service</a>
                        <span>•</span>
                        <a href="mailto:support@elabsolution.org" className="hover:text-primary-500 transition-colors">Contact Us</a>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-400">
                        <a href="tel:+2348165634195" className="hover:text-primary-500 transition-colors">+234 816 563 4195</a>
                        <span>•</span>
                        <a href="tel:+19294192327" className="hover:text-primary-500 transition-colors">+1 (929) 419-2327</a>
                    </div>
                </motion.footer>
            </main>
        </div>
    )
}
