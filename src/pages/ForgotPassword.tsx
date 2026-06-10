import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordReset } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [sent, setSent] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError(null)

        const trimmed = email.trim()
        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setFormError('Please enter a valid email address.')
            return
        }

        setIsSubmitting(true)
        const { error } = await sendPasswordReset(trimmed)
        setIsSubmitting(false)

        if (error) {
            // Don't reveal whether the account exists; only surface real failures.
            console.error('Password reset error:', error)
            setFormError('Something went wrong sending your reset email. Please try again.')
            return
        }

        // Always show success (avoids leaking which emails have accounts).
        setSent(true)
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
                </div>

                <div className="glass-card rounded-2xl p-8">
                    {sent ? (
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-slate-800 mb-2">
                                Check your email
                            </h2>
                            <p className="text-slate-600 mb-6">
                                If an account exists for <span className="font-medium">{email.trim()}</span>,
                                we&apos;ve sent a link to reset your password. The link expires in 1 hour.
                            </p>
                            <p className="text-slate-500 text-sm mb-6">
                                Didn&apos;t get it? Check your spam folder, or{' '}
                                <button
                                    onClick={() => { setSent(false); setFormError(null) }}
                                    className="text-primary-600 hover:underline font-medium"
                                >
                                    try again
                                </button>
                                .
                            </p>
                            <Link
                                to="/login"
                                className="inline-flex items-center justify-center gap-2 text-primary-600 hover:underline font-medium"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to sign in
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-6">
                                <h1 className="text-2xl font-bold text-slate-800 mb-2">
                                    Forgot your password?
                                </h1>
                                <p className="text-slate-600">
                                    Enter your email and we&apos;ll send you a link to reset it.
                                </p>
                            </div>

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
                                            autoFocus
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none text-slate-800 placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>

                                {formError && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-3 rounded-lg bg-red-50 text-red-600 text-sm"
                                    >
                                        {formError}
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !email}
                                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-200"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Send reset link
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <p className="text-center text-slate-500 text-sm mt-6">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center justify-center gap-2 text-primary-600 hover:underline font-medium"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to sign in
                                </Link>
                            </p>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
