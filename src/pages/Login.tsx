import { useState } from 'react'
import { sendMagicLink } from '@/lib/supabase'
import { Mail, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Login() {
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const { error } = await sendMagicLink(email)

        if (error) {
            setError(error.message)
            setIsLoading(false)
        } else {
            setIsSent(true)
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Logo and Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mb-4 shadow-lg">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">
                        ELAB Client Portal
                    </h1>
                    <p className="text-slate-600">
                        Track your application status in real-time
                    </p>
                </div>

                {/* Card */}
                <div className="glass-card rounded-2xl p-8">
                    {!isSent ? (
                        <>
                            <h2 className="text-xl font-semibold text-slate-800 mb-2">
                                Sign in to your account
                            </h2>
                            <p className="text-slate-600 text-sm mb-6">
                                Enter your email and we'll send you a magic link to sign in instantly.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
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

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-3 rounded-lg bg-red-50 text-red-600 text-sm"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading || !email}
                                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-200"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Send Magic Link
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-4"
                        >
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-100 mb-4">
                                <CheckCircle2 className="w-8 h-8 text-success-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-slate-800 mb-2">
                                Check your email
                            </h2>
                            <p className="text-slate-600 mb-6">
                                We've sent a magic link to <strong>{email}</strong>. Click the link to sign in.
                            </p>
                            <button
                                onClick={() => {
                                    setIsSent(false)
                                    setEmail('')
                                }}
                                className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                            >
                                Use a different email
                            </button>
                        </motion.div>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-sm mt-6">
                    Need help? Contact{' '}
                    <a href="mailto:support@elabsolution.org" className="text-primary-600 hover:underline">
                        support@elabsolution.org
                    </a>
                </p>
            </motion.div>
        </div>
    )
}
