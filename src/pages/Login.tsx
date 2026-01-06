import { useState } from 'react'
import { signInWithPassword } from '@/lib/supabase'
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

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
            navigate('/dashboard', { replace: true })
        } else {
            setError('Login failed. Please try again.')
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
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
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">
                        Client Portal
                    </h1>
                    <p className="text-slate-600">
                        Track your application status in real-time
                    </p>
                </div>

                {/* Card */}
                <div className="glass-card rounded-2xl p-8">
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">
                        Sign in to your account
                    </h2>
                    <p className="text-slate-600 text-sm mb-6">
                        Enter your email and password to access your portal.
                    </p>

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
                                    placeholder="you@example.com"
                                    required
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none text-slate-800 placeholder:text-slate-400"
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
                                    className="w-full pl-11 pr-12 py-3 rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none text-slate-800 placeholder:text-slate-400"
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
                                href="mailto:info@elab.academy?subject=Password%20Reset%20Request"
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
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
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-200"
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

                {/* Footer */}
                <p className="text-center text-slate-500 text-sm mt-6">
                    Need help? Contact{' '}
                    <a href="mailto:info@elab.academy" className="text-primary-600 hover:underline">
                        info@elab.academy
                    </a>
                </p>
                <div className="flex items-center justify-center gap-3 mt-2 text-xs text-slate-400">
                    <a href="tel:+2348165634195" className="hover:text-primary-500">
                        +234 816 563 4195
                    </a>
                    <span>•</span>
                    <a href="tel:+19294192327" className="hover:text-primary-500">
                        +1 (929) 419-2327
                    </a>
                </div>
            </motion.div>
        </div>
    )
}
