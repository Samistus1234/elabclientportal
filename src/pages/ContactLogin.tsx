import { useState, useEffect } from 'react'
import { signInWithPassword, getPortalUserInfo } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import {
    Mail,
    Lock,
    ArrowRight,
    Eye,
    EyeOff,
    Building2,
    CheckCircle2,
    Shield,
    FileCheck,
    Globe,
    Sparkles,
    Users,
    AlertCircle
} from 'lucide-react'

// Animated floating orb component
function FloatingOrb({ className, delay = 0 }: { className: string; delay?: number }) {
    return (
        <motion.div
            className={`absolute rounded-full blur-3xl opacity-30 ${className}`}
            animate={{
                y: [0, -30, 0],
                x: [0, 20, 0],
                scale: [1, 1.1, 1],
            }}
            transition={{
                duration: 8,
                repeat: Infinity,
                delay,
                ease: 'easeInOut',
            }}
        />
    )
}

// Grid pattern background
function GridPattern() {
    return (
        <div className="absolute inset-0 overflow-hidden opacity-[0.03]">
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px',
                }}
            />
        </div>
    )
}

// Feature badge component
function FeatureBadge({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2"
        >
            <Icon className="w-4 h-4 text-emerald-300" />
            <span className="text-white/90 text-sm">{text}</span>
        </motion.div>
    )
}

export default function ContactLogin() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [showRegisteredMessage, setShowRegisteredMessage] = useState(false)
    const [email, setEmail] = useState('')

    useEffect(() => {
        if (searchParams.get('registered') === 'true') {
            setShowRegisteredMessage(true)
        }
    }, [searchParams])

    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Focus states for glow effect
    const [focusedField, setFocusedField] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const { error, session } = await signInWithPassword(email, password)

        if (error) {
            setError(error.message)
            setIsLoading(false)
        } else if (session) {
            // Check user type and redirect accordingly
            try {
                const { data: userInfo } = await getPortalUserInfo()
                if (userInfo?.user_type === 'institutional_contact') {
                    navigate('/contact/dashboard', { replace: true })
                } else if (userInfo?.user_type === 'recruiter') {
                    // If recruiter somehow lands here, redirect to recruiter portal
                    navigate('/recruiter/dashboard', { replace: true })
                } else {
                    // If regular client lands here, show error
                    setError('This login is for institutional partners only. Please use the Client Portal.')
                    setIsLoading(false)
                }
            } catch {
                setError('Failed to verify account type. Please try again.')
                setIsLoading(false)
            }
        } else {
            setError('Login failed. Please try again.')
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 overflow-hidden">
                {/* Animated background elements */}
                <FloatingOrb className="w-96 h-96 bg-emerald-500 -top-20 -left-20" delay={0} />
                <FloatingOrb className="w-80 h-80 bg-teal-500 top-1/2 right-0" delay={2} />
                <FloatingOrb className="w-72 h-72 bg-cyan-500 bottom-0 left-1/4" delay={4} />

                <GridPattern />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between w-full p-12">
                    {/* Logo */}
                    <div>
                        <img
                            src="/elab-logo.png"
                            alt="ELAB Solutions International"
                            className="h-14 brightness-0 invert"
                        />
                    </div>

                    {/* Main content */}
                    <div className="space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-emerald-300 text-sm font-medium mb-4">
                                <Building2 className="w-4 h-4" />
                                Institutional Partners
                            </div>
                            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                                Verification
                                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                                    Partner Portal
                                </span>
                            </h1>
                            <p className="text-lg text-white/70 max-w-md">
                                Securely access verification requests, respond to inquiries, and manage document authentication for healthcare professionals.
                            </p>
                        </motion.div>

                        {/* Feature badges */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex flex-wrap gap-3"
                        >
                            <FeatureBadge icon={FileCheck} text="Document Verification" />
                            <FeatureBadge icon={Shield} text="Secure Portal" />
                            <FeatureBadge icon={Sparkles} text="Fast Processing" />
                        </motion.div>
                    </div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex gap-8"
                    >
                        <div>
                            <div className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-emerald-400" />
                                <span className="text-2xl font-bold text-white">200+</span>
                            </div>
                            <p className="text-white/50 text-sm">Partner Institutions</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-emerald-400" />
                                <span className="text-2xl font-bold text-white">50K+</span>
                            </div>
                            <p className="text-white/50 text-sm">Verifications</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <Globe className="w-5 h-5 text-emerald-400" />
                                <span className="text-2xl font-bold text-white">15+</span>
                            </div>
                            <p className="text-white/50 text-sm">Countries</p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-slate-50 via-white to-emerald-50 relative overflow-hidden">
                {/* Subtle background orbs for right panel */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-100 rounded-full blur-3xl opacity-40" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md relative z-10"
                >
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <img
                            src="/elab-logo.png"
                            alt="ELAB Solutions International"
                            className="h-12 mx-auto mb-4"
                        />
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                            <Building2 className="w-4 h-4" />
                            Institutional Partners
                        </div>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-6">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
                            Partner Portal
                        </h1>
                        <p className="text-slate-600">
                            Access verification requests and manage documents
                        </p>
                    </div>

                    {/* Card */}
                    <motion.div
                        className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-white/50"
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h2 className="text-lg font-semibold text-slate-800 mb-2">
                            Sign in to your account
                        </h2>
                        <p className="text-slate-600 text-sm mb-6">
                            Enter your email and password to access your portal.
                        </p>

                        {/* Success message after registration */}
                        {showRegisteredMessage && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 mb-5"
                            >
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    <p className="text-green-700 font-medium">Account created successfully!</p>
                                </div>
                                <p className="text-green-600 text-sm mt-1">
                                    Please sign in with your email and password.
                                </p>
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email Field */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                                    Email address
                                </label>
                                <div className="relative group">
                                    <div className={`absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl opacity-0 group-hover:opacity-30 blur transition-all duration-300 ${focusedField === 'email' ? 'opacity-50' : ''}`} />
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onFocus={() => setFocusedField('email')}
                                            onBlur={() => setFocusedField(null)}
                                            placeholder="you@institution.org"
                                            required
                                            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all outline-none text-slate-800 placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                                    Password
                                </label>
                                <div className="relative group">
                                    <div className={`absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl opacity-0 group-hover:opacity-30 blur transition-all duration-300 ${focusedField === 'password' ? 'opacity-50' : ''}`} />
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => setFocusedField('password')}
                                            onBlur={() => setFocusedField(null)}
                                            placeholder="Enter your password"
                                            required
                                            className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all outline-none text-slate-800 placeholder:text-slate-400"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Forgot Password Link */}
                            <div className="flex justify-end">
                                <a
                                    href="mailto:support@elabsolution.org?subject=Partner%20Portal%20Password%20Reset"
                                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                                >
                                    Forgot password?
                                </a>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 rounded-xl bg-red-50 text-red-600 text-sm flex items-start gap-3 border border-red-100"
                                >
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </motion.div>
                            )}

                            {/* Submit Button */}
                            <motion.button
                                type="submit"
                                disabled={isLoading || !email || !password}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-700 hover:via-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </motion.button>
                        </form>

                        {/* Register Link */}
                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <p className="text-center text-slate-600 text-sm">
                                New institutional partner?{' '}
                                <Link to="/contact/register" className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline">
                                    Register here
                                </Link>
                            </p>
                        </div>
                    </motion.div>

                    {/* Info Box */}
                    <div className="mt-6 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-emerald-100">
                        <p className="text-sm text-slate-600 text-center">
                            This portal is exclusively for institutional partners (NPMCN, WACS, medical councils, etc.)
                            who help process verification requests.
                        </p>
                    </div>

                    {/* Client Portal Link */}
                    <div className="text-center mt-4">
                        <p className="text-slate-500 text-sm">
                            Looking for the client portal?{' '}
                            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                                Sign in here
                            </Link>
                        </p>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-slate-400 text-xs mt-6">
                        Need help? Contact{' '}
                        <a href="mailto:support@elabsolution.org" className="hover:text-emerald-500 transition-colors">
                            support@elabsolution.org
                        </a>
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-2 text-xs text-slate-400">
                        <a href="tel:+2348165634195" className="hover:text-emerald-500 transition-colors">
                            +234 816 563 4195
                        </a>
                        <span>•</span>
                        <a href="tel:+19294192327" className="hover:text-emerald-500 transition-colors">
                            +1 (929) 419-2327
                        </a>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
