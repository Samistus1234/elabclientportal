import { useEffect, useState, useMemo } from 'react'
import { supabase, signOut } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
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
    MessageCircle,
    Settings,
    Search,
    TrendingUp,
    Briefcase,
    Award,
    Calendar,
    ChevronDown,
    Home,
    FolderOpen,
    HelpCircle,
    ChevronRight,
    Zap,
    Target,
    Upload,
    Phone,
    Mail,
    Activity,
    PlayCircle
} from 'lucide-react'
import { Link } from 'react-router-dom'
import ApplicationStatusChart from '@/components/ApplicationStatusChart'
import ApplicationCard from '@/components/ApplicationCard'
import RecentActivity from '@/components/RecentActivity'
import TestimonialsCarousel from '@/components/TestimonialsCarousel'
import MilestoneAchievements from '@/components/MilestoneAchievements'
import UpcomingDeadlines from '@/components/UpcomingDeadlines'
import DocumentChecklist from '@/components/DocumentChecklist'
import SupportHelpSection from '@/components/SupportHelpSection'
import SmartCrossSellRecommendations from '@/components/SmartCrossSellRecommendations'
import { useWalkthrough } from '@/contexts/WalkthroughContext'
import { portalOverviewTour } from '@/data/walkthroughTours'

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
    pipeline_id?: string
    pipeline_name?: string
    pipeline_slug?: string
    current_stage_id?: string
    current_stage_name?: string
    current_stage_slug?: string
}

const normalizeCase = (c: any): CaseData => {
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

// ============================================================================
// ANIMATED COUNTER COMPONENT
// ============================================================================
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
    const [displayValue, setDisplayValue] = useState(0)

    useEffect(() => {
        let startTime: number
        let animationFrame: number

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp
            const progress = Math.min((timestamp - startTime) / duration, 1)
            setDisplayValue(Math.floor(progress * value))

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate)
            }
        }

        animationFrame = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(animationFrame)
    }, [value, duration])

    return <>{displayValue}</>
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================
interface StatCardProps {
    title: string
    value: number
    icon: React.ElementType
    trend?: { value: number; positive: boolean }
    color: 'blue' | 'green' | 'amber' | 'purple'
    delay?: number
}

function StatCard({ title, value, icon: Icon, trend, color, delay = 0 }: StatCardProps) {
    const colorConfig = {
        blue: {
            bg: 'bg-blue-50',
            iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
            text: 'text-blue-600',
            border: 'border-blue-100'
        },
        green: {
            bg: 'bg-emerald-50',
            iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
            text: 'text-emerald-600',
            border: 'border-emerald-100'
        },
        amber: {
            bg: 'bg-amber-50',
            iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
            text: 'text-amber-600',
            border: 'border-amber-100'
        },
        purple: {
            bg: 'bg-purple-50',
            iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
            text: 'text-purple-600',
            border: 'border-purple-100'
        }
    }

    const config = colorConfig[color]

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, duration: 0.4, ease: 'easeOut' }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`${config.bg} border ${config.border} rounded-2xl p-5 relative overflow-hidden group cursor-default`}
        >
            {/* Background decoration */}
            <div className={`absolute -right-4 -top-4 w-24 h-24 ${config.iconBg} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />

            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
                    <p className={`text-3xl font-bold ${config.text}`}>
                        <AnimatedNumber value={value} />
                    </p>
                    {trend && (
                        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                            <TrendingUp className={`w-3 h-3 ${!trend.positive && 'rotate-180'}`} />
                            <span>{trend.positive ? '+' : ''}{trend.value}% this month</span>
                        </div>
                    )}
                </div>
                <div className={`${config.iconBg} w-12 h-12 rounded-xl flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </motion.div>
    )
}

// ============================================================================
// ONBOARDING PROGRESS COMPONENT
// ============================================================================
interface OnboardingStep {
    id: string
    title: string
    description: string
    completed: boolean
    href?: string
}

function OnboardingProgress({ steps, onDismiss }: { steps: OnboardingStep[]; onDismiss: () => void }) {
    const completedCount = steps.filter(s => s.completed).length
    const progress = (completedCount / steps.length) * 100

    if (completedCount === steps.length) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card rounded-2xl p-6 mb-6 relative overflow-hidden"
        >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-accent-500/5" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                            <Target className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">Complete Your Setup</h3>
                            <p className="text-sm text-slate-500">{completedCount} of {steps.length} steps completed</p>
                        </div>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                    />
                </div>

                {/* Steps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            {step.href ? (
                                <Link
                                    to={step.href}
                                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                                        step.completed
                                            ? 'bg-emerald-50 border border-emerald-100'
                                            : 'bg-white border border-slate-100 hover:border-primary-200 hover:shadow-md'
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        step.completed
                                            ? 'bg-emerald-500'
                                            : 'bg-slate-100'
                                    }`}>
                                        {step.completed ? (
                                            <CheckCircle className="w-4 h-4 text-white" />
                                        ) : (
                                            <span className="text-sm font-medium text-slate-400">{index + 1}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-sm font-medium truncate ${step.completed ? 'text-emerald-700' : 'text-slate-700'}`}>
                                            {step.title}
                                        </p>
                                        <p className="text-xs text-slate-400 truncate">{step.description}</p>
                                    </div>
                                    {!step.completed && <ChevronRight className="w-4 h-4 text-slate-300 ml-auto flex-shrink-0" />}
                                </Link>
                            ) : (
                                <div className={`flex items-center gap-3 p-3 rounded-xl ${
                                    step.completed
                                        ? 'bg-emerald-50 border border-emerald-100'
                                        : 'bg-white border border-slate-100'
                                }`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        step.completed ? 'bg-emerald-500' : 'bg-slate-100'
                                    }`}>
                                        {step.completed ? (
                                            <CheckCircle className="w-4 h-4 text-white" />
                                        ) : (
                                            <span className="text-sm font-medium text-slate-400">{index + 1}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-sm font-medium truncate ${step.completed ? 'text-emerald-700' : 'text-slate-700'}`}>
                                            {step.title}
                                        </p>
                                        <p className="text-xs text-slate-400 truncate">{step.description}</p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}

// ============================================================================
// QUICK ACTIONS BAR
// ============================================================================
function QuickActionsBar() {
    const actions = [
        { icon: Upload, label: 'Upload', href: '/documents', color: 'text-blue-600', bg: 'bg-blue-100 hover:bg-blue-200' },
        { icon: MessageCircle, label: 'Message', href: 'https://wa.me/2348165634195', external: true, color: 'text-green-600', bg: 'bg-green-100 hover:bg-green-200' },
        { icon: Calendar, label: 'Schedule', href: 'https://calendar.app.google/ZD4U6SwmwGCvsfJT8', external: true, color: 'text-purple-600', bg: 'bg-purple-100 hover:bg-purple-200' },
        { icon: HelpCircle, label: 'Help', href: '/faq', color: 'text-amber-600', bg: 'bg-amber-100 hover:bg-amber-200' },
    ]

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide"
        >
            {actions.map((action, index) => {
                const content = (
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`${action.bg} rounded-xl px-4 py-3 flex items-center gap-2 transition-colors cursor-pointer`}
                    >
                        <action.icon className={`w-4 h-4 ${action.color}`} />
                        <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{action.label}</span>
                    </motion.div>
                )

                if (action.external) {
                    return (
                        <a key={index} href={action.href} target="_blank" rel="noopener noreferrer">
                            {content}
                        </a>
                    )
                }

                return (
                    <Link key={index} to={action.href}>
                        {content}
                    </Link>
                )
            })}

            {/* Contact info */}
            <div className="hidden lg:flex items-center gap-4 ml-auto pl-4 border-l border-slate-200">
                <a href="tel:+19294192327" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">+1 (929) 419-2327</span>
                </a>
                <a href="mailto:headoffice@elabsolution.org" className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">headoffice@elabsolution.org</span>
                </a>
            </div>
        </motion.div>
    )
}

// ============================================================================
// WELCOME SECTION
// ============================================================================
function WelcomeSection({ firstName, stats }: { firstName: string; stats: { total: number; active: number; completed: number } }) {
    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour >= 5 && hour < 12) return 'Good morning'
        if (hour >= 12 && hour < 17) return 'Good afternoon'
        if (hour >= 17 && hour < 21) return 'Good evening'
        return 'Good night'
    }

    const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl mb-6"
        >
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900">
                <motion.div
                    animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-0 right-0 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute bottom-0 left-0 w-80 h-80 bg-accent-500/20 rounded-full blur-3xl"
                />
            </div>

            <div className="relative z-10 p-8 md:p-10">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                    {/* Left: Greeting */}
                    <div className="flex-1">
                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-primary-300 text-sm font-medium mb-2"
                        >
                            {getGreeting()}
                        </motion.p>
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl md:text-4xl font-bold text-white mb-3"
                        >
                            Welcome back, {firstName}!
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-slate-400 text-lg max-w-lg"
                        >
                            {stats.active > 0
                                ? `You have ${stats.active} active application${stats.active > 1 ? 's' : ''} in progress. We're here to help!`
                                : stats.completed > 0
                                    ? "All your applications are complete! Great job!"
                                    : "Welcome to your personalized portal. Let's get started!"}
                        </motion.p>

                        {/* Quick stats pills */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="flex items-center gap-3 mt-6"
                        >
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                                <Zap className="w-4 h-4 text-amber-400" />
                                <span className="text-white text-sm font-medium">{stats.active} Active</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                <span className="text-white text-sm font-medium">{stats.completed} Completed</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right: Progress Circle */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex-shrink-0 hidden md:block"
                    >
                        <div className="relative w-40 h-40">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="50%" cy="50%" r="45%" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                                <motion.circle
                                    cx="50%" cy="50%" r="45%"
                                    fill="none"
                                    stroke="url(#progressGradient)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 72}`}
                                    initial={{ strokeDashoffset: 2 * Math.PI * 72 }}
                                    animate={{ strokeDashoffset: 2 * Math.PI * 72 * (1 - progress / 100) }}
                                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
                                />
                                <defs>
                                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#06b6d4" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="text-4xl font-bold text-white"
                                >
                                    {progress}%
                                </motion.span>
                                <span className="text-slate-400 text-sm">Complete</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    )
}

// ============================================================================
// MOBILE BOTTOM NAVIGATION
// ============================================================================
function MobileBottomNav({ onStartTour }: { onStartTour: () => void }) {
    const navItems = [
        { icon: Home, label: 'Home', href: '/dashboard', active: true },
        { icon: FolderOpen, label: 'Docs', href: '/documents' },
        { icon: HelpCircle, label: 'FAQ', href: '/faq' },
        { icon: Settings, label: 'Settings', href: '/settings' },
    ]

    return (
        <motion.nav
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-100 px-2 py-2 md:hidden"
        >
            <div className="flex items-center justify-around">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        to={item.href}
                        className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-colors ${
                            item.active ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                ))}
                {/* Tour button */}
                <button
                    onClick={onStartTour}
                    className="flex flex-col items-center gap-0.5 p-2 rounded-xl transition-colors text-primary-500 hover:text-primary-600 active:bg-primary-50"
                >
                    <PlayCircle className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Tour</span>
                </button>
            </div>
        </motion.nav>
    )
}

// ============================================================================
// LOADING SKELETON
// ============================================================================
function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
            {/* Header skeleton */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-100/50 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse" />
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-slate-200 rounded-lg animate-pulse" />
                            <div className="h-10 w-10 bg-slate-200 rounded-lg animate-pulse" />
                            <div className="h-10 w-32 bg-slate-200 rounded-xl animate-pulse" />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Welcome skeleton */}
                <div className="h-48 bg-slate-200 rounded-3xl animate-pulse mb-6" />

                {/* Stats skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-32 bg-slate-200 rounded-2xl animate-pulse" />
                    ))}
                </div>

                {/* Content skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
                        <div className="h-48 bg-slate-200 rounded-2xl animate-pulse" />
                    </div>
                    <div className="space-y-6">
                        <div className="h-40 bg-slate-200 rounded-2xl animate-pulse" />
                        <div className="h-40 bg-slate-200 rounded-2xl animate-pulse" />
                    </div>
                </div>
            </main>
        </div>
    )
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
export default function Dashboard() {
    const [person, setPerson] = useState<PersonData | null>(null)
    const [cases, setCases] = useState<CaseData[]>([])
    const [pipelineStages, setPipelineStages] = useState<Record<string, PipelineStage[]>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
    const [refreshing, setRefreshing] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const [showProfileMenu, setShowProfileMenu] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [showOnboarding, setShowOnboarding] = useState(true)

    // Walkthrough tour
    const { startTour, isActive: isTourActive } = useWalkthrough()

    const notifications = [
        { id: '1', type: 'success', title: 'Welcome to ELAB Client Portal!', message: 'Your account has been set up successfully.', time: 'Just now', read: false },
        { id: '2', type: 'info', title: 'Document Upload Available', message: 'You can now upload documents for your application.', time: '1 hour ago', read: false },
        { id: '3', type: 'reminder', title: 'Complete Your Profile', message: 'Add your contact details to stay updated.', time: '2 hours ago', read: true }
    ]

    const unreadCount = notifications.filter(n => !n.read).length

    // Computed values
    const activeCases = cases.filter(c => c.status === 'active').length
    const completedCases = cases.filter(c => c.status === 'completed').length
    const onHoldCases = cases.filter(c => c.status === 'on_hold').length

    // Filtered cases
    const filteredCases = useMemo(() => {
        return cases.filter(c => {
            const matchesSearch = searchQuery === '' ||
                c.pipeline?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.case_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.current_stage?.name?.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesStatus = statusFilter === 'all' || c.status === statusFilter

            return matchesSearch && matchesStatus
        })
    }, [cases, searchQuery, statusFilter])

    // Onboarding steps
    const onboardingSteps: OnboardingStep[] = [
        { id: '1', title: 'Profile Setup', description: 'Complete your profile', completed: true },
        { id: '2', title: 'Upload Documents', description: 'Add required files', completed: false, href: '/documents' },
        { id: '3', title: 'Review Application', description: 'Check your status', completed: cases.length > 0 },
        { id: '4', title: 'Contact Advisor', description: 'Get personalized help', completed: false, href: '/support' },
    ]

    useEffect(() => {
        loadClientData()
    }, [])

    // Auto-start walkthrough tour for first-time users
    useEffect(() => {
        if (!loading && person && !isTourActive) {
            const hasSeenTour = localStorage.getItem('elab_dashboard_tour_seen')
            if (!hasSeenTour) {
                // Delay to allow page to fully render
                const timer = setTimeout(() => {
                    startTour(portalOverviewTour)
                    localStorage.setItem('elab_dashboard_tour_seen', 'true')
                }, 1500)
                return () => clearTimeout(timer)
            }
        }
    }, [loading, person, startTour, isTourActive])

    // Function to manually start the tour
    const handleStartTour = () => {
        startTour(portalOverviewTour)
    }

    const loadClientData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user?.email) throw new Error('No user found')

            const { data: personData, error: personError } = await supabase.rpc('get_my_person_info')
            const personInfo = Array.isArray(personData) ? personData[0] : personData

            if (personError || !personInfo) {
                throw new Error('No account found for this email. Please contact support.')
            }

            setPerson(personInfo)

            const { data: casesData, error: casesError } = await supabase.rpc('get_my_synced_cases')
            if (casesError) throw casesError

            const typedCases = (casesData || []).map(normalizeCase)
            setCases(typedCases)

            const pipelineIds = [...new Set(typedCases.map((c: CaseData) => c.pipeline?.id || c.pipeline_id).filter(Boolean))] as string[]

            if (pipelineIds.length > 0) {
                const stagesByPipeline: Record<string, PipelineStage[]> = {}
                await Promise.all(pipelineIds.map(async (pipelineId) => {
                    const { data: stagesData } = await supabase.rpc('get_pipeline_stages', { p_pipeline_id: pipelineId })
                    if (stagesData) {
                        stagesByPipeline[pipelineId] = stagesData.map((s: any) => ({ ...s, pipeline_id: pipelineId }))
                    }
                }))
                setPipelineStages(stagesByPipeline)
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

    if (loading) return <DashboardSkeleton />

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
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
                    <button onClick={handleSignOut} className="text-primary-600 hover:text-primary-700 font-medium">
                        Sign out and try again
                    </button>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-20 md:pb-12 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-100/50 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <Link to="/dashboard" className="flex items-center gap-3" data-tour="header-logo">
                            <img src="/elab-logo.png" alt="ELAB Solutions" className="h-10 sm:h-12" />
                        </Link>

                        {/* Search bar - hidden on mobile */}
                        <div className="hidden md:flex items-center flex-1 max-w-md mx-8" data-tour="search-bar">
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search applications..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Right side actions */}
                        <div className="flex items-center gap-2">
                            {/* Take Tour Button */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleStartTour}
                                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-primary-500/10 to-accent-500/10 hover:from-primary-500/20 hover:to-accent-500/20 text-primary-600 transition-all"
                                title="Take a tour of the portal"
                            >
                                <PlayCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">Tour</span>
                            </motion.button>

                            {/* Refresh */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                            </motion.button>

                            {/* Notifications */}
                            <div className="relative" data-tour="notifications">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="relative p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                                >
                                    <Bell className="w-5 h-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                                    )}
                                </motion.button>

                                <AnimatePresence>
                                    {showNotifications && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50"
                                            >
                                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                                                    <h3 className="font-semibold text-slate-800">Notifications</h3>
                                                    <button onClick={() => setShowNotifications(false)} className="p-1 rounded-lg hover:bg-slate-200 text-slate-400">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="max-h-80 overflow-y-auto">
                                                    {notifications.map((notification) => (
                                                        <div
                                                            key={notification.id}
                                                            className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/50' : ''}`}
                                                        >
                                                            <div className="flex gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                                    notification.type === 'success' ? 'bg-green-100' : notification.type === 'info' ? 'bg-blue-100' : 'bg-amber-100'
                                                                }`}>
                                                                    {notification.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                                                                     notification.type === 'info' ? <MessageCircle className="w-4 h-4 text-blue-600" /> :
                                                                     <Clock className="w-4 h-4 text-amber-600" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`text-sm ${!notification.read ? 'font-medium text-slate-800' : 'text-slate-700'}`}>{notification.title}</p>
                                                                    <p className="text-xs text-slate-500 mt-0.5">{notification.message}</p>
                                                                    <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Profile Menu */}
                            <div className="relative" data-tour="profile-menu">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-slate-100 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
                                        {person?.first_name?.charAt(0)}{person?.last_name?.charAt(0)}
                                    </div>
                                    <span className="hidden sm:block text-sm font-medium text-slate-700">{person?.first_name}</span>
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                </motion.button>

                                <AnimatePresence>
                                    {showProfileMenu && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50"
                                            >
                                                <div className="px-4 py-3 border-b border-slate-100">
                                                    <p className="font-medium text-slate-800">{person?.first_name} {person?.last_name}</p>
                                                    <p className="text-xs text-slate-500 truncate">{person?.email}</p>
                                                </div>
                                                <div className="p-2">
                                                    <Link to="/settings" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors">
                                                        <Settings className="w-4 h-4" />
                                                        <span className="text-sm">Settings</span>
                                                    </Link>
                                                    <Link to="/documents" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors">
                                                        <FolderOpen className="w-4 h-4" />
                                                        <span className="text-sm">Documents</span>
                                                    </Link>
                                                    <Link to="/support" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors">
                                                        <HelpCircle className="w-4 h-4" />
                                                        <span className="text-sm">Support</span>
                                                    </Link>
                                                    <button
                                                        onClick={() => { setShowProfileMenu(false); handleStartTour(); }}
                                                        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-primary-50 text-primary-600 transition-colors w-full"
                                                    >
                                                        <PlayCircle className="w-4 h-4" />
                                                        <span className="text-sm">Take a Tour</span>
                                                    </button>
                                                </div>
                                                <div className="p-2 border-t border-slate-100">
                                                    <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 transition-colors w-full">
                                                        <LogOut className="w-4 h-4" />
                                                        <span className="text-sm">Sign out</span>
                                                    </button>
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Welcome Section */}
                <div data-tour="welcome-section">
                    <WelcomeSection
                        firstName={person?.first_name || 'there'}
                        stats={{ total: cases.length, active: activeCases, completed: completedCases }}
                    />
                </div>

                {/* Quick Actions */}
                <div data-tour="quick-actions">
                    <QuickActionsBar />
                </div>

                {/* Onboarding Progress */}
                <AnimatePresence>
                    {showOnboarding && (
                        <div data-tour="onboarding">
                            <OnboardingProgress
                                steps={onboardingSteps}
                                onDismiss={() => setShowOnboarding(false)}
                            />
                        </div>
                    )}
                </AnimatePresence>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-tour="stats-cards">
                    <StatCard title="Total Applications" value={cases.length} icon={Briefcase} color="blue" delay={0} />
                    <StatCard title="In Progress" value={activeCases} icon={Activity} color="amber" delay={0.1} />
                    <StatCard title="Completed" value={completedCases} icon={Award} color="green" delay={0.2} />
                    <StatCard title="On Hold" value={onHoldCases} icon={Clock} color="purple" delay={0.3} />
                </div>

                {/* Smart Cross-Sell Recommendations */}
                <div data-tour="recommendations">
                    <SmartCrossSellRecommendations cases={cases} />
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {cases.length > 0 && <ApplicationStatusChart cases={cases} />}
                        <div data-tour="recent-activity">
                            <RecentActivity cases={cases} />
                        </div>
                        <TestimonialsCarousel />
                    </div>

                    {/* Right Column */}
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
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8" data-tour="applications">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Your Applications</h2>
                            <p className="text-slate-500 text-sm mt-1">Track the progress of all your applications</p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Mobile search */}
                            <div className="relative flex-1 sm:hidden">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                />
                            </div>

                            {/* Status filter */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
                                data-tour="status-filter"
                            >
                                <option value="all">All Status</option>
                                <option value="active">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="on_hold">On Hold</option>
                            </select>

                            {/* View toggle */}
                            <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-200" data-tour="view-toggle">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-primary-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {filteredCases.length === 0 ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-12 text-center">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-6">
                                <FileText className="w-10 h-10 text-slate-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">
                                {cases.length === 0 ? 'No Applications Yet' : 'No Results Found'}
                            </h3>
                            <p className="text-slate-500 max-w-md mx-auto">
                                {cases.length === 0
                                    ? 'Your applications will appear here once they\'re created. Contact our team if you need assistance getting started.'
                                    : 'Try adjusting your search or filter criteria to find what you\'re looking for.'}
                            </p>
                        </motion.div>
                    ) : (
                        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-4'}>
                            {filteredCases.map((caseItem, index) => (
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-tour="support-section">
                    <SupportHelpSection />
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 flex flex-col justify-center items-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mb-4 shadow-lg">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Ready to Excel?</h3>
                        <p className="text-slate-500 text-sm mb-4 max-w-sm">
                            Join thousands of healthcare professionals who have achieved their career goals with ELAB.
                        </p>
                        <motion.a
                            href="https://www.elabsolution.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow inline-block"
                        >
                            Explore Our Services
                        </motion.a>
                    </motion.div>
                </div>

                {/* Footer */}
                <motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center mt-12 pt-8 border-t border-slate-100">
                    <p className="text-slate-400 text-sm">© 2025 ELAB Services. Empowering Healthcare Professionals Worldwide.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 mt-3 text-slate-400 text-xs">
                        <p>4, Addo Road, Suite 10, Stephen Taiwo Shopping Complex, Ajah, Lagos, Nigeria</p>
                        <span className="hidden sm:inline">|</span>
                        <p>828 Lane Allen Road 219, Lexington, Kentucky, USA</p>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-400">
                        <Link to="/privacy" className="hover:text-primary-500 transition-colors">Privacy Policy</Link>
                        <span>•</span>
                        <Link to="/terms" className="hover:text-primary-500 transition-colors">Terms of Service</Link>
                        <span>•</span>
                        <Link to="/support/refund-policy" className="hover:text-primary-500 transition-colors">Refund Policy</Link>
                        <span>•</span>
                        <a href="mailto:headoffice@elabsolution.org" className="hover:text-primary-500 transition-colors">Contact Us</a>
                    </div>
                </motion.footer>
            </main>

            {/* Mobile Bottom Navigation */}
            <div data-tour="mobile-nav">
                <MobileBottomNav onStartTour={handleStartTour} />
            </div>
        </div>
    )
}
