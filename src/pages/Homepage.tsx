import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWalkthrough } from '@/contexts/WalkthroughContext'
import { WalkthroughTour } from '@/contexts/WalkthroughContext'
import {
    Shield,
    FileCheck,
    Calendar,
    GraduationCap,
    BarChart3,
    Headphones,
    ArrowRight,
    CheckCircle2,
    Globe2,
    Lock,
    Clock,
    ClipboardCheck,
    UserPlus,
    Upload,
    Eye,
    Award,
    Play,
    ChevronRight,
    ChevronDown,
    MapPin,
    Mail,
    Phone,
    Menu,
    X,
    Star,
    Quote,
    TrendingUp,
    MessageCircle
} from 'lucide-react'

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================
const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
}

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
}

// Section wrapper with scroll animation
function AnimatedSection({ children, className = '', id, dataTour }: { children: React.ReactNode; className?: string; id?: string; dataTour?: string }) {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: '-100px' })

    return (
        <motion.section
            ref={ref}
            id={id}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={staggerContainer}
            className={className}
            data-tour={dataTour}
        >
            {children}
        </motion.section>
    )
}

// ============================================================================
// TYPING ANIMATION HOOK
// ============================================================================
function useTypingAnimation(words: string[], typingSpeed = 100, deletingSpeed = 50, pauseDuration = 2000) {
    const [currentWordIndex, setCurrentWordIndex] = useState(0)
    const [currentText, setCurrentText] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        const word = words[currentWordIndex]

        const timeout = setTimeout(() => {
            if (!isDeleting) {
                if (currentText.length < word.length) {
                    setCurrentText(word.slice(0, currentText.length + 1))
                } else {
                    setTimeout(() => setIsDeleting(true), pauseDuration)
                }
            } else {
                if (currentText.length > 0) {
                    setCurrentText(word.slice(0, currentText.length - 1))
                } else {
                    setIsDeleting(false)
                    setCurrentWordIndex((prev) => (prev + 1) % words.length)
                }
            }
        }, isDeleting ? deletingSpeed : typingSpeed)

        return () => clearTimeout(timeout)
    }, [currentText, isDeleting, currentWordIndex, words, typingSpeed, deletingSpeed, pauseDuration])

    return currentText
}

// ============================================================================
// ANIMATED COUNTER
// ============================================================================
function AnimatedCounter({ end, duration = 2, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
    const [count, setCount] = useState(0)
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true })

    useEffect(() => {
        if (!isInView) return

        let startTime: number
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp
            const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
            setCount(Math.floor(progress * end))
            if (progress < 1) requestAnimationFrame(animate)
        }
        requestAnimationFrame(animate)
    }, [isInView, end, duration])

    return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// ============================================================================
// PARTICLE BACKGROUND
// ============================================================================
function ParticleBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(50)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-white/20 rounded-full"
                    initial={{
                        x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                        y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                    }}
                    animate={{
                        y: [null, Math.random() * -500 - 100],
                        opacity: [0, 1, 0],
                    }}
                    transition={{
                        duration: Math.random() * 10 + 10,
                        repeat: Infinity,
                        delay: Math.random() * 5,
                        ease: 'linear',
                    }}
                />
            ))}
        </div>
    )
}

// ============================================================================
// NAVIGATION HEADER
// ============================================================================
function NavigationHeader() {
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const navLinks = [
        { name: 'Services', href: '#services' },
        { name: 'How It Works', href: '#how-it-works' },
        { name: 'Testimonials', href: '#testimonials' },
        { name: 'FAQ', href: '#faq' },
        { name: 'Free Tools', href: '/tools' },
        { name: 'Support', href: '/support' },
    ]

    return (
        <>
            {/* Skip to content link for accessibility */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-primary-600 focus:rounded-lg focus:shadow-lg"
            >
                Skip to main content
            </a>

            <motion.header
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5 }}
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                    isScrolled
                        ? 'bg-white/95 backdrop-blur-md shadow-lg'
                        : 'bg-transparent'
                }`}
            >
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-3">
                            <img
                                src="/elab-logo.png"
                                alt="ELAB Solutions"
                                className={`h-10 transition-all ${isScrolled ? '' : 'brightness-0 invert'}`}
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                }}
                            />
                            <span className={`hidden text-xl font-bold ${isScrolled ? 'text-slate-800' : 'text-white'}`}>
                                ELAB Solutions
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex items-center gap-8">
                            {navLinks.map((link) => (
                                <a
                                    key={link.name}
                                    href={link.href}
                                    className={`text-sm font-medium transition-colors hover:text-primary-500 ${
                                        isScrolled ? 'text-slate-600' : 'text-white/90'
                                    }`}
                                >
                                    {link.name}
                                </a>
                            ))}
                        </nav>

                        {/* Desktop CTAs */}
                        <div className="hidden lg:flex items-center gap-4">
                            <Link
                                to="/login"
                                className={`text-sm font-medium transition-colors ${
                                    isScrolled ? 'text-slate-600 hover:text-primary-600' : 'text-white/90 hover:text-white'
                                }`}
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/register"
                                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                    isScrolled
                                        ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-200'
                                        : 'bg-white text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                Get Started
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className={`lg:hidden p-2 rounded-lg transition-colors ${
                                isScrolled ? 'text-slate-600 hover:bg-slate-100' : 'text-white hover:bg-white/10'
                            }`}
                            aria-label="Toggle menu"
                            aria-expanded={isMobileMenuOpen}
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="lg:hidden bg-white border-t border-slate-100 shadow-xl"
                        >
                            <div className="max-w-7xl mx-auto px-6 py-6">
                                <nav className="flex flex-col gap-4">
                                    {navLinks.map((link) => (
                                        <a
                                            key={link.name}
                                            href={link.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="text-slate-600 hover:text-primary-600 font-medium py-2"
                                        >
                                            {link.name}
                                        </a>
                                    ))}
                                    <hr className="my-2 border-slate-200" />
                                    <Link
                                        to="/login"
                                        className="text-slate-600 hover:text-primary-600 font-medium py-2"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="w-full py-3 bg-primary-600 text-white text-center rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                                    >
                                        Get Started Free
                                    </Link>
                                </nav>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.header>
        </>
    )
}

// ============================================================================
// HOMEPAGE PREVIEW TOUR
// ============================================================================
const homepagePreviewTour: WalkthroughTour = {
    id: 'homepage-preview',
    name: 'Portal Preview',
    steps: [
        {
            id: 'welcome-preview',
            target: 'center',
            title: 'Welcome to ELAB Client Portal! 👋',
            content: 'Let us show you how our platform makes credential verification simple and stress-free. Click Next to explore!',
            placement: 'center'
        },
        {
            id: 'dashboard-preview',
            target: '[data-tour="dashboard-preview"]',
            title: 'Your Personal Dashboard',
            content: 'Once logged in, you\'ll have a beautiful dashboard showing all your applications, progress tracking, and important updates in real-time.',
            placement: 'left'
        },
        {
            id: 'services-preview',
            target: '[data-tour="services-section"]',
            title: 'Comprehensive Services',
            content: 'From license verification to exam booking, we handle DataFlow, DHA, SCFHS, and more. Everything you need in one place.',
            placement: 'top'
        },
        {
            id: 'get-started-preview',
            target: '[data-tour="cta-section"]',
            title: 'Ready to Get Started? 🚀',
            content: 'Join thousands of healthcare professionals who trust ELAB. Create your free account and start tracking your credentials today!',
            placement: 'top'
        }
    ]
}

// ============================================================================
// HERO SECTION
// ============================================================================
function HeroSection() {
    const [showDemoModal, setShowDemoModal] = useState(false)
    const { startTour } = useWalkthrough()
    const typingText = useTypingAnimation([
        'One Dashboard Away',
        'Fully Managed',
        'Globally Recognized',
        'Professionally Handled'
    ])

    return (
        <>
        {/* Demo Video Modal */}
        <AnimatePresence>
            {showDemoModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowDemoModal(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25 }}
                        className="relative w-full max-w-4xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setShowDemoModal(false)}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Demo options container */}
                        <div className="p-8 bg-gradient-to-br from-slate-800 to-slate-900">
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
                                    <Play className="w-10 h-10 text-white ml-1" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">Explore ELAB Client Portal</h3>
                                <p className="text-slate-400 max-w-md mx-auto">
                                    See how our platform makes credential verification simple and stress-free.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                                {/* Interactive Tour Option */}
                                <button
                                    onClick={() => {
                                        setShowDemoModal(false)
                                        setTimeout(() => startTour(homepagePreviewTour), 300)
                                    }}
                                    className="group p-6 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all text-left"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Eye className="w-6 h-6 text-white" />
                                    </div>
                                    <h4 className="text-lg font-semibold text-white mb-2">Interactive Tour</h4>
                                    <p className="text-slate-400 text-sm">
                                        Take a guided walkthrough of key features on this page.
                                    </p>
                                </button>

                                {/* Sign Up Option */}
                                <Link
                                    to="/register"
                                    onClick={() => setShowDemoModal(false)}
                                    className="group p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 rounded-2xl border border-blue-500/30 hover:border-blue-500/50 transition-all text-left"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <UserPlus className="w-6 h-6 text-white" />
                                    </div>
                                    <h4 className="text-lg font-semibold text-white mb-2">Start Free Account</h4>
                                    <p className="text-slate-400 text-sm">
                                        Create your account and explore the full portal experience.
                                    </p>
                                </Link>
                            </div>

                            <p className="text-center text-slate-500 text-sm mt-6">
                                Already have an account? <Link to="/login" onClick={() => setShowDemoModal(false)} className="text-blue-400 hover:text-blue-300">Sign in</Link>
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
        <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
                <ParticleBackground />

                {/* Animated gradient orbs */}
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.25, 0.2] }}
                    transition={{ duration: 10, repeat: Infinity, delay: 1 }}
                    className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
                    transition={{ duration: 6, repeat: Infinity, delay: 2 }}
                    className="absolute top-1/2 right-1/3 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"
                />

                {/* Grid pattern overlay */}
                <div
                    className="absolute inset-0 opacity-5"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '50px 50px'
                    }}
                />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 lg:py-32" id="main-content">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    {/* Left Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    >
                        {/* Live Stats Badge */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm mb-6"
                        >
                            <span className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                                </span>
                                <span className="text-emerald-400 font-semibold">127</span> applications processed this week
                            </span>
                        </motion.div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                            Your Global Healthcare Career,{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 inline-block min-w-[280px]">
                                {typingText}
                                <span className="animate-pulse">|</span>
                            </span>
                        </h1>

                        <p className="text-lg sm:text-xl text-slate-300 mb-8 leading-relaxed max-w-xl">
                            Track credentials, licensing applications, and exam bookings in real time — from anywhere in the world. <span className="text-white font-medium">No upfront fees. Start free.</span>
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-8">
                            <Link
                                to="/register"
                                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02]"
                            >
                                Get Started Free
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <button
                                onClick={() => setShowDemoModal(true)}
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold text-lg hover:bg-white/20 transition-all group"
                            >
                                <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                Watch Demo
                            </button>
                        </div>

                        {/* Trust indicators */}
                        <div className="flex items-center gap-6 text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>Free to start</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>2-4 week processing</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>24/7 support</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right - Dashboard Preview */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                        className="relative hidden lg:block"
                        data-tour="dashboard-preview"
                    >
                        {/* Floating Dashboard Mockup */}
                        <div className="relative">
                            {/* Glow effect behind card */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 blur-3xl scale-110" />

                            {/* Main Dashboard Card */}
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                                className="relative glass-card rounded-2xl p-6 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                        <BarChart3 className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold">Welcome back, Sarah</p>
                                        <p className="text-slate-400 text-sm">3 active applications</p>
                                    </div>
                                </div>

                                {/* Mini Status Cards */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                        <p className="text-slate-400 text-xs mb-2">DHA License</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: '75%' }}
                                                    transition={{ duration: 1.5, delay: 0.5 }}
                                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                                                />
                                            </div>
                                            <span className="text-white text-xs font-medium">75%</span>
                                        </div>
                                        <p className="text-amber-400 text-xs mt-2 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> In Progress
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                        <p className="text-slate-400 text-xs mb-2">DataFlow</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: '100%' }}
                                                    transition={{ duration: 1.5, delay: 0.7 }}
                                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500"
                                                />
                                            </div>
                                            <span className="text-white text-xs font-medium">100%</span>
                                        </div>
                                        <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Completed
                                        </p>
                                    </div>
                                </div>

                                {/* Recent Activity */}
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-slate-400 text-xs mb-3">Recent Activity</p>
                                    <div className="space-y-2">
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 1 }}
                                            className="flex items-center gap-3 text-sm"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                            <span className="text-slate-300">Document verified</span>
                                            <span className="text-slate-500 text-xs ml-auto">2h ago</span>
                                        </motion.div>
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 1.2 }}
                                            className="flex items-center gap-3 text-sm"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-blue-400" />
                                            <span className="text-slate-300">Application submitted</span>
                                            <span className="text-slate-500 text-xs ml-auto">Yesterday</span>
                                        </motion.div>
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 1.4 }}
                                            className="flex items-center gap-3 text-sm"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-purple-400" />
                                            <span className="text-slate-300">Payment confirmed</span>
                                            <span className="text-slate-500 text-xs ml-auto">2 days ago</span>
                                        </motion.div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Floating notification */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0, y: [0, -8, 0] }}
                                transition={{
                                    opacity: { delay: 1.5 },
                                    scale: { delay: 1.5 },
                                    y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }
                                }}
                                className="absolute -top-4 -right-4 p-4 rounded-xl bg-white shadow-xl border border-slate-100"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-slate-800 font-medium text-sm">License Approved!</p>
                                        <p className="text-slate-500 text-xs">DHA verification complete</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Stats card */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, x: -20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                transition={{ delay: 1.8 }}
                                className="absolute -bottom-6 -left-6 p-4 bg-white rounded-xl shadow-lg border border-slate-100"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-slate-800 font-semibold">98% Success</p>
                                        <p className="text-slate-500 text-xs">Approval rate</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
                <a href="#trust-strip" className="block" aria-label="Scroll down">
                    <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
                        <motion.div
                            animate={{ y: [0, 8, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-1.5 h-3 rounded-full bg-white/50"
                        />
                    </div>
                </a>
            </motion.div>
        </section>
        </>
    )
}

// ============================================================================
// LOGO STRIP (Licensing Authorities)
// ============================================================================
function LogoStrip() {
    const logos = [
        { name: 'DHA', full: 'Dubai Health Authority' },
        { name: 'SCFHS', full: 'Saudi Commission for Health Specialties' },
        { name: 'NHRA', full: 'National Health Regulatory Authority' },
        { name: 'DOH', full: 'Department of Health Abu Dhabi' },
        { name: 'Prometric', full: 'Prometric Testing' },
        { name: 'NCLEX', full: 'NCLEX Examination' },
    ]

    return (
        <section className="py-8 bg-slate-50 border-y border-slate-100 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <p className="text-center text-sm text-slate-500 mb-6">Trusted by healthcare authorities worldwide</p>
                <div className="flex items-center justify-center gap-8 md:gap-12 flex-wrap">
                    {logos.map((logo, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className="group relative"
                        >
                            <div className="px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all cursor-default">
                                <span className="text-slate-700 font-semibold">{logo.name}</span>
                            </div>
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-500">
                                {logo.full}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

// ============================================================================
// TRUST STRIP WITH ANIMATED COUNTERS
// ============================================================================
function TrustStrip() {
    const stats = [
        { icon: Award, value: 6, suffix: '+', label: 'Years Experience' },
        { icon: Globe2, value: 40, suffix: '+', label: 'Countries Served' },
        { icon: UserPlus, value: 12500, suffix: '+', label: 'Professionals Verified' },
        { icon: Headphones, value: 24, suffix: '/7', label: 'Support Available' },
    ]

    return (
        <section id="trust-strip" className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-6">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                    className="grid grid-cols-2 md:grid-cols-4 gap-8"
                >
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            variants={fadeInUp}
                            className="flex flex-col items-center text-center"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
                                <stat.icon className="w-7 h-7 text-primary-600" />
                            </div>
                            <p className="text-3xl md:text-4xl font-bold text-slate-800">
                                <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                            </p>
                            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}

// ============================================================================
// SERVICES GRID
// ============================================================================
function ServicesSection() {
    const services = [
        {
            icon: Shield,
            title: 'Credential Verification',
            description: 'DataFlow, primary source verification, and document authentication worldwide.',
            color: 'from-blue-500 to-cyan-500',
            href: '#'
        },
        {
            icon: FileCheck,
            title: 'Licensing Applications',
            description: 'DHA, SCFHS, NHRA, Mumaris+ — managed from submission to approval.',
            color: 'from-indigo-500 to-purple-500',
            href: '#'
        },
        {
            icon: Calendar,
            title: 'Exam Booking',
            description: 'Prometric, NCLEX, OET scheduling and preparation support.',
            color: 'from-emerald-500 to-teal-500',
            href: '#'
        },
        {
            icon: GraduationCap,
            title: 'Academic Evaluation',
            description: 'Transcript assessment and international credential recognition.',
            color: 'from-amber-500 to-orange-500',
            href: '#'
        },
        {
            icon: BarChart3,
            title: 'Real-Time Tracking',
            description: 'Monitor every step of your application with live status updates.',
            color: 'from-rose-500 to-pink-500',
            href: '#'
        },
        {
            icon: Headphones,
            title: 'Dedicated Support',
            description: 'Personal case managers available via chat, email, and WhatsApp.',
            color: 'from-violet-500 to-purple-500',
            href: '#'
        },
    ]

    return (
        <AnimatedSection id="services" className="py-24 bg-gradient-to-b from-slate-50 to-white scroll-mt-20" dataTour="services-section">
            <div className="max-w-7xl mx-auto px-6">
                <motion.div variants={fadeInUp} className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
                        Our Services
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
                        Everything You Need, In One Place
                    </h2>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        From verification to licensing — we handle the complexity so you can focus on your career.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service, index) => (
                        <motion.a
                            key={index}
                            href={service.href}
                            variants={fadeInUp}
                            className="group p-6 bg-white rounded-2xl border border-slate-200 hover:border-primary-300 transition-all duration-300 hover:shadow-xl hover:shadow-primary-100/50 hover:-translate-y-1 cursor-pointer block"
                        >
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                                <service.icon className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-800 mb-2 group-hover:text-primary-600 transition-colors">
                                {service.title}
                            </h3>
                            <p className="text-slate-600 leading-relaxed mb-4">
                                {service.description}
                            </p>
                            <span className="inline-flex items-center gap-1 text-primary-600 font-medium text-sm group-hover:gap-2 transition-all">
                                Learn more <ChevronRight className="w-4 h-4" />
                            </span>
                        </motion.a>
                    ))}
                </div>
            </div>
        </AnimatedSection>
    )
}

// ============================================================================
// HOW IT WORKS
// ============================================================================
function HowItWorksSection() {
    const steps = [
        {
            icon: UserPlus,
            title: 'Create Account',
            description: 'Sign up in under 2 minutes with your email or phone number.',
            color: 'bg-blue-500'
        },
        {
            icon: Upload,
            title: 'Submit Documents',
            description: "Upload your credentials securely. We'll tell you exactly what's needed.",
            color: 'bg-indigo-500'
        },
        {
            icon: Eye,
            title: 'Track Progress',
            description: 'Watch your application move through each stage in real time.',
            color: 'bg-purple-500'
        },
        {
            icon: Award,
            title: 'Get Verified',
            description: 'Receive your verification, license, or exam confirmation.',
            color: 'bg-emerald-500'
        },
    ]

    return (
        <AnimatedSection id="how-it-works" className="py-24 bg-white scroll-mt-20" dataTour="how-it-works">
            <div className="max-w-7xl mx-auto px-6">
                <motion.div variants={fadeInUp} className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-4">
                        Simple Process
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
                        Your Journey, Simplified
                    </h2>
                    <p className="text-lg text-slate-600">
                        Four steps to your healthcare career milestone.
                    </p>
                </motion.div>

                <div className="relative">
                    {/* Connection line - desktop */}
                    <div className="hidden lg:block absolute top-24 left-[12%] right-[12%] h-1 bg-gradient-to-r from-blue-200 via-purple-200 to-emerald-200 rounded-full" />

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
                        {steps.map((step, index) => (
                            <motion.div
                                key={index}
                                variants={fadeInUp}
                                className="relative text-center group"
                            >
                                {/* Step circle */}
                                <div className="relative z-10 mx-auto mb-6">
                                    <div className={`w-20 h-20 rounded-full ${step.color} flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform`}>
                                        <step.icon className="w-9 h-9 text-white" />
                                    </div>
                                    <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white border-2 border-slate-200 text-slate-700 text-sm font-bold flex items-center justify-center shadow-sm">
                                        {index + 1}
                                    </span>
                                </div>
                                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                                    {step.title}
                                </h3>
                                <p className="text-slate-600 leading-relaxed">
                                    {step.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <motion.div variants={fadeInUp} className="text-center mt-12">
                    <Link
                        to="/register"
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 hover:shadow-xl"
                    >
                        Start Your Journey
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </motion.div>
            </div>
        </AnimatedSection>
    )
}

// ============================================================================
// TESTIMONIALS
// ============================================================================
function TestimonialsSection() {
    const testimonials = [
        {
            name: 'Dr. Sarah Okonkwo',
            role: 'Registered Nurse',
            location: 'Nigeria → UAE',
            image: null,
            rating: 5,
            text: "ELAB made my DHA licensing process seamless. I could track everything in real-time and their support team was always available. Got my license in just 3 weeks!"
        },
        {
            name: 'Ahmed Hassan',
            role: 'Pharmacist',
            location: 'Egypt → Saudi Arabia',
            image: null,
            rating: 5,
            text: "The DataFlow verification was completed faster than I expected. The dashboard kept me informed at every step. Highly recommend their services!"
        },
        {
            name: 'Dr. Priya Sharma',
            role: 'General Physician',
            location: 'India → Qatar',
            image: null,
            rating: 5,
            text: "Professional handling from start to finish. They managed my SCFHS application perfectly. The team's expertise saved me so much time and stress."
        },
    ]

    return (
        <AnimatedSection id="testimonials" className="py-24 bg-gradient-to-b from-white to-slate-50 scroll-mt-20" dataTour="testimonials">
            <div className="max-w-7xl mx-auto px-6">
                <motion.div variants={fadeInUp} className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-medium mb-4">
                        Success Stories
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
                        Trusted by Healthcare Professionals Worldwide
                    </h2>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Join thousands who have successfully advanced their careers with ELAB.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={index}
                            variants={fadeInUp}
                            className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow relative"
                        >
                            {/* Quote icon */}
                            <Quote className="absolute top-6 right-6 w-10 h-10 text-primary-100" />

                            {/* Rating */}
                            <div className="flex gap-1 mb-4">
                                {[...Array(testimonial.rating)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                                ))}
                            </div>

                            {/* Text */}
                            <p className="text-slate-600 leading-relaxed mb-6">
                                "{testimonial.text}"
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold">
                                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800">{testimonial.name}</p>
                                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                                    <p className="text-xs text-primary-600">{testimonial.location}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </AnimatedSection>
    )
}

// ============================================================================
// DASHBOARD PREVIEW
// ============================================================================
function DashboardPreviewSection() {
    const features = [
        { icon: CheckCircle2, title: 'Live Status Updates', description: 'Every change reflected instantly in your dashboard.' },
        { icon: FileCheck, title: 'Document Tracking', description: 'Know which documents are received, pending, or need attention.' },
        { icon: Clock, title: 'Timeline History', description: 'See the complete journey of your application from day one.' },
        { icon: BarChart3, title: 'Multi-Application View', description: 'Managing multiple credentials? See them all in one place.' },
    ]

    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: '-100px' })

    return (
        <section ref={ref} className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    {/* Left Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-cyan-400 text-sm font-medium mb-4">
                            Powerful Dashboard
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            Complete Visibility,{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                                Zero Guesswork
                            </span>
                        </h2>
                        <p className="text-lg text-slate-400 mb-8">
                            See exactly where your applications stand — anytime, anywhere.
                        </p>

                        <div className="space-y-5">
                            {features.map((feature, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                                    transition={{ delay: 0.2 + index * 0.1 }}
                                    className="flex items-start gap-4"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                                        <feature.icon className="w-5 h-5 text-primary-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                                        <p className="text-slate-400 text-sm">{feature.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <Link
                            to="/register"
                            className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg"
                        >
                            Try It Free <ArrowRight className="w-4 h-4" />
                        </Link>
                    </motion.div>

                    {/* Right - Browser Mockup */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="relative"
                    >
                        <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                            {/* Browser chrome */}
                            <div className="bg-slate-700 px-4 py-3 flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                </div>
                                <div className="flex-1 mx-4">
                                    <div className="bg-slate-600 rounded-md px-3 py-1.5 text-slate-400 text-xs flex items-center gap-2">
                                        <Lock className="w-3 h-3" />
                                        portal.elabsolution.org/dashboard
                                    </div>
                                </div>
                            </div>
                            {/* Dashboard content */}
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800">My Applications</h3>
                                        <p className="text-sm text-slate-500">3 active, 2 completed</p>
                                    </div>
                                    <button className="px-4 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 transition-colors">
                                        + New Application
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {/* Application Card 1 */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                                        transition={{ delay: 0.5 }}
                                        className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                    <FileCheck className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">DHA License Application</p>
                                                    <p className="text-xs text-slate-500">DHA-2024-00123</p>
                                                </div>
                                            </div>
                                            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                                In Progress
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={isInView ? { width: '65%' } : {}}
                                                    transition={{ duration: 1, delay: 0.7 }}
                                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-slate-600">65%</span>
                                        </div>
                                    </motion.div>

                                    {/* Application Card 2 */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                                        transition={{ delay: 0.7 }}
                                        className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                                    <Shield className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">DataFlow Verification</p>
                                                    <p className="text-xs text-slate-500">DF-2024-00456</p>
                                                </div>
                                            </div>
                                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                                Completed
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={isInView ? { width: '100%' } : {}}
                                                    transition={{ duration: 1, delay: 0.9 }}
                                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500"
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-slate-600">100%</span>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

// ============================================================================
// GLOBAL FOOTPRINT
// ============================================================================
function GlobalFootprintSection() {
    const regions = [
        { name: 'Middle East', countries: 'UAE, Saudi Arabia, Qatar, Bahrain, Kuwait', icon: '🏥' },
        { name: 'Africa', countries: 'Nigeria, Kenya, South Africa, Ghana, Egypt', icon: '🌍' },
        { name: 'Europe', countries: 'UK, Ireland, Germany, France', icon: '🏛️' },
        { name: 'North America', countries: 'USA, Canada', icon: '🗽' },
    ]

    return (
        <AnimatedSection className="py-24 bg-slate-900 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-3xl" />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <motion.div variants={fadeInUp} className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-cyan-400 text-sm font-medium mb-4">
                        Global Reach
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Trusted Across Continents
                    </h2>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Supporting healthcare professionals from Lagos to London, Dubai to Dallas.
                    </p>
                </motion.div>

                {/* Stats */}
                <motion.div
                    variants={staggerContainer}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16"
                >
                    {[
                        { value: 12500, suffix: '+', label: 'Verified Professionals' },
                        { value: 40, suffix: '+', label: 'Countries Worldwide' },
                        { value: 6, suffix: '+', label: 'Years of Excellence' },
                        { value: 98, suffix: '%', label: 'Success Rate' },
                    ].map((stat, index) => (
                        <motion.div
                            key={index}
                            variants={fadeInUp}
                            className="text-center"
                        >
                            <p className="text-4xl sm:text-5xl font-bold text-white mb-2">
                                <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                            </p>
                            <p className="text-slate-400">{stat.label}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Regions */}
                <motion.div
                    variants={staggerContainer}
                    className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                    {regions.map((region, index) => (
                        <motion.div
                            key={index}
                            variants={fadeInUp}
                            className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-2xl">{region.icon}</span>
                                <h3 className="text-white font-semibold">{region.name}</h3>
                            </div>
                            <p className="text-slate-400 text-sm">{region.countries}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </AnimatedSection>
    )
}

// ============================================================================
// FAQ SECTION
// ============================================================================
function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0)

    const faqs = [
        {
            question: 'How long does the verification process take?',
            answer: 'Most verifications are completed within 2 to 4 weeks. However, timelines can vary depending on the type of verification and the responsiveness of source institutions. You can track the real-time status of your application through your dashboard.'
        },
        {
            question: 'What documents do I need to submit?',
            answer: 'Required documents vary by service type. Generally, you\'ll need: valid passport, professional certificates, academic transcripts, and proof of work experience. Our system will guide you through exactly what\'s needed for your specific application.'
        },
        {
            question: 'How do I track my application status?',
            answer: 'Once you create an account, you\'ll have access to a personalized dashboard showing real-time updates on all your applications. You\'ll also receive email and WhatsApp notifications for important milestones.'
        },
        {
            question: 'Is my personal data secure?',
            answer: 'Absolutely. We use bank-grade encryption (256-bit SSL) to protect all data. Your documents are stored in secure, compliant data centers. We never share your information with third parties without your explicit consent.'
        },
        {
            question: 'What if my application is rejected?',
            answer: 'Our 98% success rate speaks to our thorough review process. However, if an application faces issues, our case managers will work directly with you to address concerns and resubmit if possible. We provide full transparency on any challenges.'
        },
    ]

    return (
        <AnimatedSection id="faq" className="py-24 bg-white scroll-mt-20">
            <div className="max-w-3xl mx-auto px-6">
                <motion.div variants={fadeInUp} className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-violet-100 text-violet-700 text-sm font-medium mb-4">
                        FAQ
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-lg text-slate-600">
                        Everything you need to know about our services.
                    </p>
                </motion.div>

                <motion.div variants={staggerContainer} className="space-y-4">
                    {faqs.map((faq, index) => (
                        <motion.div
                            key={index}
                            variants={fadeInUp}
                            className="border border-slate-200 rounded-xl overflow-hidden"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full flex items-center justify-between p-6 text-left bg-white hover:bg-slate-50 transition-colors"
                                aria-expanded={openIndex === index}
                            >
                                <span className="font-semibold text-slate-800 pr-4">{faq.question}</span>
                                <ChevronDown
                                    className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${
                                        openIndex === index ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>
                            <AnimatePresence>
                                {openIndex === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </motion.div>

                <motion.div variants={fadeInUp} className="text-center mt-12">
                    <p className="text-slate-600 mb-4">Still have questions?</p>
                    <Link
                        to="/support"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
                    >
                        <MessageCircle className="w-5 h-5" />
                        Contact Support
                    </Link>
                </motion.div>
            </div>
        </AnimatedSection>
    )
}

// ============================================================================
// SUPPORT & REASSURANCE
// ============================================================================
function ReassuranceSection() {
    const points = [
        {
            icon: Headphones,
            title: 'Dedicated Case Managers',
            description: 'Real humans who know your file and respond within hours.'
        },
        {
            icon: Lock,
            title: 'Bank-Grade Security',
            description: 'Your documents are encrypted and stored with enterprise-level protection.'
        },
        {
            icon: ClipboardCheck,
            title: 'Compliance First',
            description: 'Every process follows regulatory requirements to the letter.'
        },
        {
            icon: Clock,
            title: '24/7 Portal Access',
            description: 'Check your status anytime — nights, weekends, holidays.'
        },
    ]

    return (
        <AnimatedSection className="py-24 bg-gradient-to-b from-primary-50 to-white">
            <div className="max-w-7xl mx-auto px-6">
                <motion.div variants={fadeInUp} className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-4">
                        Peace of Mind
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
                        You're Never Alone in This Journey
                    </h2>
                    <p className="text-lg text-slate-600">
                        Expert support, secure processes, and peace of mind — guaranteed.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {points.map((point, index) => (
                        <motion.div
                            key={index}
                            variants={fadeInUp}
                            className="text-center group"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-white shadow-lg shadow-primary-100 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                                <point.icon className="w-8 h-8 text-primary-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">
                                {point.title}
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                {point.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </AnimatedSection>
    )
}

// ============================================================================
// FINAL CTA
// ============================================================================
function FinalCTASection() {
    return (
        <section className="py-20 bg-gradient-to-r from-primary-600 via-blue-600 to-cyan-600 relative overflow-hidden" data-tour="cta-section">
            {/* Abstract shapes */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-white rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-white rounded-full blur-3xl" />
            </div>

            <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Ready to Take the Next Step?
                    </h2>
                    <p className="text-lg text-white/90 mb-8">
                        Join thousands of healthcare professionals who trust ELAB with their credentials.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/register"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-primary-600 font-semibold text-lg hover:bg-slate-50 transition-all shadow-lg hover:scale-105"
                        >
                            Create Free Account
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold text-lg hover:bg-white/20 transition-all"
                        >
                            Sign In
                        </Link>
                    </div>
                    <p className="text-white/70 text-sm mt-6">
                        No credit card required • Free to start • Cancel anytime
                    </p>
                </motion.div>
            </div>
        </section>
    )
}

// ============================================================================
// FOOTER
// ============================================================================
function Footer() {
    return (
        <footer className="bg-slate-900 text-slate-400">
            <div className="max-w-7xl mx-auto px-6 py-16">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand */}
                    <div className="lg:col-span-1">
                        <Link to="/" className="inline-block mb-4">
                            <img
                                src="/elab-logo.png"
                                alt="ELAB Solutions"
                                className="h-10 brightness-0 invert"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                }}
                            />
                        </Link>
                        <p className="text-sm leading-relaxed mb-4">
                            Your trusted partner in healthcare credentialing, licensing, and career mobility worldwide.
                        </p>
                        <div className="flex gap-3">
                            <a
                                href="https://x.com/elabsolution1"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                aria-label="Twitter"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                            </a>
                            <a
                                href="https://www.linkedin.com/company/elab-solutions-intl-llc/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                aria-label="LinkedIn"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                            </a>
                            <a
                                href="https://wa.me/2348165634195"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                aria-label="WhatsApp"
                            >
                                <MessageCircle className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Services */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Services</h4>
                        <ul className="space-y-3">
                            <li><a href="#services" className="hover:text-white transition-colors">Credential Verification</a></li>
                            <li><a href="#services" className="hover:text-white transition-colors">Licensing Applications</a></li>
                            <li><a href="#services" className="hover:text-white transition-colors">Exam Booking</a></li>
                            <li><a href="#services" className="hover:text-white transition-colors">Academic Evaluation</a></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Support</h4>
                        <ul className="space-y-3">
                            <li><Link to="/faq" className="hover:text-white transition-colors">Help Center</Link></li>
                            <li><Link to="/support" className="hover:text-white transition-colors">Contact Us</Link></li>
                            <li><a href="https://wa.me/2348165634195" className="hover:text-white transition-colors">WhatsApp</a></li>
                            <li><a href="mailto:support@elabsolution.org" className="hover:text-white transition-colors">Email Support</a></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">Contact</h4>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                <a href="mailto:support@elabsolution.org" className="hover:text-white transition-colors">
                                    support@elabsolution.org
                                </a>
                            </li>
                            <li className="flex items-start gap-3">
                                <Phone className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                <div>
                                    <a href="tel:+2348165634195" className="hover:text-white transition-colors block">+234 816 563 4195</a>
                                    <a href="tel:+19294192327" className="hover:text-white transition-colors block">+1 (929) 419-2327</a>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                <span className="text-sm">Nigeria • USA</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom */}
                <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm">
                        &copy; {new Date().getFullYear()} ELAB Solutions International. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm">
                        <a
                            href="https://www.elab.academy/privacy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-white transition-colors"
                        >
                            Privacy Policy
                        </a>
                        <a
                            href="https://www.elab.academy/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-white transition-colors"
                        >
                            Terms of Service
                        </a>
                        <a
                            href="https://www.elab.academy/privacy#cookies"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-white transition-colors"
                        >
                            Cookie Settings
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    )
}

// ============================================================================
// MAIN HOMEPAGE COMPONENT
// ============================================================================
export default function Homepage() {
    return (
        <div className="min-h-screen bg-white">
            <NavigationHeader />
            <main>
                <HeroSection />
                <LogoStrip />
                <TrustStrip />
                <ServicesSection />
                <HowItWorksSection />
                <TestimonialsSection />
                <DashboardPreviewSection />
                <GlobalFootprintSection />
                <FAQSection />
                <ReassuranceSection />
                <FinalCTASection />
            </main>
            <Footer />
        </div>
    )
}
