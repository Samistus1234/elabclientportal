import { useState } from 'react'
import { signInWithPassword, getPortalUserInfo } from '@/lib/supabase'
import { Mail, Lock, ArrowRight, Eye, EyeOff, Shield, Clock, Headphones, CheckCircle, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'

// Floating orb component for background
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

// Animated grid pattern
function GridPattern() {
    return (
        <div className="absolute inset-0 overflow-hidden opacity-[0.03]">
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.5) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
        >
            <Icon className="w-4 h-4 text-cyan-300" />
            <span className="text-sm text-white/90">{text}</span>
        </motion.div>
    )
}

export default function Login() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const { error, session } = await signInWithPassword(email, password)

        if (error) {
            setError(error.message)
            setIsLoading(false)
        } else if (session) {
            try {
                const { data: userInfo } = await getPortalUserInfo()
                if (userInfo?.user_type === 'recruiter') {
                    navigate('/recruiter/dashboard', { replace: true })
                } else if (userInfo?.user_type === 'institutional_contact') {
                    navigate('/contact/dashboard', { replace: true })
                } else {
                    navigate('/dashboard', { replace: true })
                }
            } catch {
                navigate('/dashboard', { replace: true })
            }
        } else {
            setError('Login failed. Please try again.')
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
                {/* Animated background elements */}
                <FloatingOrb className="w-96 h-96 bg-blue-500 -top-20 -left-20" delay={0} />
                <FloatingOrb className="w-80 h-80 bg-cyan-500 top-1/2 -right-20" delay={2} />
                <FloatingOrb className="w-64 h-64 bg-purple-500 bottom-20 left-1/3" delay={4} />
                <FloatingOrb className="w-72 h-72 bg-indigo-500 top-1/4 right-1/4" delay={1} />

                <GridPattern />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    {/* Logo */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <img
                            src="/elab-logo.png"
                            alt="ELAB Solutions"
                            className="h-12 brightness-0 invert"
                        />
                    </motion.div>

                    {/* Main Content */}
                    <div className="max-w-lg">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            <div className="flex items-center gap-2 mb-6">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                                <span className="text-cyan-400 text-sm font-medium tracking-wider uppercase">Welcome Back</span>
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                            </div>

                            <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
                                Your Healthcare
                                <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                                    Career Journey
                                </span>
                                Starts Here
                            </h1>

                            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                                Track your credential verification, exam bookings, and licensing applications
                                all in one secure place. Join thousands of healthcare professionals
                                achieving their international career goals.
                            </p>
                        </motion.div>

                        {/* Feature badges */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="flex flex-wrap gap-3"
                        >
                            <FeatureBadge icon={Shield} text="Bank-grade Security" />
                            <FeatureBadge icon={Clock} text="Real-time Updates" />
                            <FeatureBadge icon={Headphones} text="24/7 Support" />
                        </motion.div>
                    </div>

                    {/* Bottom stats */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                        className="flex gap-12"
                    >
                        <div>
                            <p className="text-3xl font-bold text-white">10K+</p>
                            <p className="text-slate-400 text-sm">Active Clients</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-white">95%</p>
                            <p className="text-slate-400 text-sm">Success Rate</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-white">50+</p>
                            <p className="text-slate-400 text-sm">Countries</p>
                        </div>
                    </motion.div>
                </div>

                {/* Decorative elements */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
                {/* Background for right panel */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-cyan-50/50" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-100 to-pink-100 rounded-full blur-3xl opacity-40 translate-y-1/2 -translate-x-1/2" />

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-md relative z-10"
                >
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-8">
                        <img
                            src="/elab-logo.png"
                            alt="ELAB Solutions"
                            className="h-14 mx-auto mb-4"
                        />
                        <h1 className="text-2xl font-bold text-slate-800">Client Portal</h1>
                        <p className="text-slate-500 text-sm mt-1">Track your application status</p>
                    </div>

                    {/* Form Card */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-slate-200/50 border border-white/50">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">
                                    Sign in to your account
                                </h2>
                                <p className="text-slate-500 text-sm">
                                    Access your portal dashboard
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email Field */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                                    Email address
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity -m-0.5" />
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="elab@gmail.com"
                                            required
                                            className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-0 transition-all outline-none text-slate-800 placeholder:text-slate-400 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                                    Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity -m-0.5" />
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter your password"
                                            required
                                            className="w-full pl-12 pr-12 py-3.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-0 transition-all outline-none text-slate-800 placeholder:text-slate-400 bg-white"
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
                                    href="mailto:support@elabsolution.org?subject=Password%20Reset%20Request"
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                                >
                                    Forgot password?
                                </a>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-3"
                                >
                                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-red-500 text-xs">!</span>
                                    </div>
                                    {error}
                                </motion.div>
                            )}

                            {/* Submit Button */}
                            <motion.button
                                type="submit"
                                disabled={isLoading || !email || !password}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white font-semibold hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-blue-500/30 relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </motion.button>

                            {/* Divider */}
                            <div className="flex items-center gap-4 py-2">
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-xs text-slate-400 font-medium">OR</span>
                                <div className="flex-1 h-px bg-slate-200" />
                            </div>

                            {/* Register Links */}
                            <div className="space-y-3">
                                <Link
                                    to="/register"
                                    className="w-full py-3 px-4 rounded-xl border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-700 font-medium flex items-center justify-center gap-2 transition-all"
                                >
                                    <CheckCircle className="w-4 h-4 text-blue-500" />
                                    Create a new account
                                </Link>
                                <p className="text-center text-slate-500 text-sm">
                                    Are you a recruiter?{' '}
                                    <Link to="/recruiter/register" className="text-purple-600 hover:text-purple-700 font-semibold hover:underline">
                                        Register here
                                    </Link>
                                </p>
                            </div>
                        </form>
                    </div>

                    {/* Support Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-8 text-center"
                    >
                        <a
                            href="https://portal.elabsolution.org/support"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-medium hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg shadow-purple-500/20"
                        >
                            <Headphones className="w-4 h-4" />
                            Submit Support Ticket
                        </a>

                        <p className="text-slate-500 text-sm mt-4">
                            Need help? Contact{' '}
                            <a href="mailto:support@elabsolution.org" className="text-blue-600 hover:underline font-medium">
                                support@elabsolution.org
                            </a>
                        </p>
                        <div className="flex items-center justify-center gap-3 mt-2 text-xs text-slate-400">
                            <a href="tel:+2348165634195" className="hover:text-blue-500 transition-colors">
                                +234 816 563 4195
                            </a>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <a href="tel:+19294192327" className="hover:text-blue-500 transition-colors">
                                +1 (929) 419-2327
                            </a>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    )
}
