import { useState, useEffect } from 'react'
import { signInWithPassword, getPortalUserInfo } from '@/lib/supabase'
import { Mail, Lock, ArrowRight, Eye, EyeOff, Building2, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'

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
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Logo and Header */}
                <div className="text-center mb-8">
                    <img
                        src="/elab-logo.png"
                        alt="ELAB Solutions International"
                        className="h-16 mx-auto mb-4"
                    />
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
                        <Building2 className="w-4 h-4" />
                        Institutional Partners
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">
                        Partner Portal
                    </h1>
                    <p className="text-slate-600">
                        Access verification requests and manage documents
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-emerald-100">
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">
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
                            className="p-4 rounded-lg bg-green-50 border border-green-200 mb-4"
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

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Email address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@institution.org"
                                    required
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all outline-none text-slate-800 placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    className="w-full pl-11 pr-12 py-3 rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all outline-none text-slate-800 placeholder:text-slate-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
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
                                className="p-3 rounded-lg bg-red-50 text-red-600 text-sm"
                            >
                                {error}
                            </motion.div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || !email || !password}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

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
                        <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                            Sign in here
                        </Link>
                    </p>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-sm mt-6">
                    Need help? Contact{' '}
                    <a href="mailto:support@elabsolution.org" className="text-emerald-600 hover:underline">
                        support@elabsolution.org
                    </a>
                </p>
                <div className="flex items-center justify-center gap-3 mt-2 text-xs text-slate-400">
                    <a href="tel:+2348165634195" className="hover:text-emerald-500">
                        +234 816 563 4195
                    </a>
                    <span>•</span>
                    <a href="tel:+19294192327" className="hover:text-emerald-500">
                        +1 (929) 419-2327
                    </a>
                </div>
            </motion.div>
        </div>
    )
}
