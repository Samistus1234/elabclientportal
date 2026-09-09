import AuthShell from '@/components/AuthShell'
import { useState, useEffect } from 'react'
import { signInWithPassword, getPortalUserInfo } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'

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
        <AuthShell><div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-slate-50 via-white to-emerald-50 relative overflow-hidden">
                {/* Subtle background orbs for right panel */}



                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md relative z-10"
                >
                    {/* Mobile Logo */}


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
                                            placeholder="jacinta@gmail.com"
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
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Forgot Password Link */}
                            <div className="flex justify-end">
                                <Link
                                    to="/forgot-password"
                                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                                >
                                    Forgot password?
                                </Link>
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
            </div></AuthShell>
    )
}
