import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, updatePassword } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react'

type PageState = 'checking' | 'ready' | 'invalid' | 'success'

export default function ResetPassword() {
    const navigate = useNavigate()

    const [pageState, setPageState] = useState<PageState>('checking')
    const [errorMessage, setErrorMessage] = useState<string>('')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    useEffect(() => {
        let mounted = true

        const init = async () => {
            const hashParams = new URLSearchParams(window.location.hash.substring(1))

            // Supabase appends an error to the redirect when a link is bad/expired.
            const errorCode = hashParams.get('error') || hashParams.get('error_code')
            const errorDesc = hashParams.get('error_description')
            if (errorCode) {
                if (mounted) {
                    setErrorMessage(
                        (errorDesc || 'This reset link is invalid or has expired.').replace(/\+/g, ' ')
                    )
                    setPageState('invalid')
                }
                return
            }

            // The client may have already consumed the hash (detectSessionInUrl).
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                window.history.replaceState(null, '', window.location.pathname)
                if (mounted) setPageState('ready')
                return
            }

            // Fallback: establish the recovery session from the hash tokens.
            const accessToken = hashParams.get('access_token')
            const refreshToken = hashParams.get('refresh_token')
            if (accessToken && refreshToken) {
                const { data, error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                })
                window.history.replaceState(null, '', window.location.pathname)
                if (!error && data.session) {
                    if (mounted) setPageState('ready')
                    return
                }
                if (mounted) {
                    setErrorMessage('This reset link is invalid or has expired. Please request a new one.')
                    setPageState('invalid')
                }
                return
            }

            if (mounted) {
                setErrorMessage('This reset link is invalid or has expired. Please request a new one.')
                setPageState('invalid')
            }
        }

        init()

        // Catch the recovery session if it arrives asynchronously.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session && mounted) {
                setPageState('ready')
            }
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError(null)

        if (password.length < 8) {
            setFormError('Password must be at least 8 characters long.')
            return
        }
        if (password !== confirmPassword) {
            setFormError('Passwords do not match.')
            return
        }

        setIsSubmitting(true)
        const { error } = await updatePassword(password)
        if (error) {
            setFormError(
                error.message?.includes('expired') || error.message?.includes('session')
                    ? 'Your reset link has expired. Please request a new one.'
                    : (error.message || 'Could not update your password. Please try again.')
            )
            setIsSubmitting(false)
            return
        }

        setPageState('success')
    }

    // Checking the reset link
    if (pageState === 'checking') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Verifying your reset link...</p>
                </motion.div>
            </div>
        )
    }

    // Invalid / expired link
    if (pageState === 'invalid') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <div className="text-center mb-8">
                        <img src="/elab-logo.png" alt="ELAB Solutions International" className="h-16 mx-auto mb-4" />
                    </div>
                    <div className="glass-card rounded-2xl p-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800 mb-2">Link Invalid or Expired</h2>
                        <p className="text-slate-600 mb-6">{errorMessage}</p>
                        <button
                            onClick={() => navigate('/forgot-password', { replace: true })}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all flex items-center justify-center gap-2"
                        >
                            Request a New Link
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            </div>
        )
    }

    // Password updated
    if (pageState === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <div className="text-center mb-8">
                        <img src="/elab-logo.png" alt="ELAB Solutions International" className="h-16 mx-auto mb-4" />
                    </div>
                    <div className="glass-card rounded-2xl p-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800 mb-2">Password Updated</h2>
                        <p className="text-slate-600 mb-6">
                            Your password has been changed successfully. You can now sign in with your new password.
                        </p>
                        <button
                            onClick={() => navigate('/login', { replace: true })}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all flex items-center justify-center gap-2"
                        >
                            Sign In
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            </div>
        )
    }

    // Ready - show the new-password form
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <img src="/elab-logo.png" alt="ELAB Solutions International" className="h-16 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Set a new password</h1>
                    <p className="text-slate-600">Choose a new password for your account.</p>
                </div>

                <div className="glass-card rounded-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* New Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                                New Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Minimum 8 characters"
                                    required
                                    minLength={8}
                                    autoFocus
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

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter your password"
                                    required
                                    minLength={8}
                                    className="w-full pl-11 pr-12 py-3 rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none text-slate-800 placeholder:text-slate-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500">Password must be at least 8 characters long.</p>

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
                            disabled={isSubmitting || !password || !confirmPassword}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-200"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Update Password
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}
