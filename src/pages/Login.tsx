import AuthShell from '@/components/AuthShell'
import { useState } from 'react'
import { signInWithPassword, getPortalUserInfo } from '@/lib/supabase'
import { Mail, Lock, ArrowRight, Eye, EyeOff, Headphones, CheckCircle, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'

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
        <AuthShell><div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
                {/* Background for right panel */}




                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-md relative z-10"
                >
                    {/* Mobile logo */}


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

                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="jacinta@gmail.com"
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
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                                >
                                    Forgot password?
                                </Link>
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
                                    Activate your account
                                </Link>
                                <p className="text-center text-slate-500 text-sm">
                                    Are you a recruiter?{' '}
                                    <Link to="/recruiter/register" className="text-purple-600 hover:text-purple-700 font-semibold hover:underline">
                                        Register here
                                    </Link>
                                </p>
                                <p className="text-center text-slate-500 text-sm">
                                    Are you an institution?{' '}
                                    <Link to="/contact/register" className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline">
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
            </div></AuthShell>
    )
}
