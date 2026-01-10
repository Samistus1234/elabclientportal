import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react'

interface InviteData {
    email: string
    first_name: string | null
    last_name: string | null
    case_reference: string | null
    pipeline_name: string | null
}

type PageState = 'loading' | 'valid' | 'invalid' | 'expired' | 'used' | 'success' | 'error'

export default function AcceptInvite() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const token = searchParams.get('token')

    const [pageState, setPageState] = useState<PageState>('loading')
    const [inviteData, setInviteData] = useState<InviteData | null>(null)
    const [errorMessage, setErrorMessage] = useState<string>('')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    useEffect(() => {
        if (!token) {
            setPageState('invalid')
            setErrorMessage('No invite token provided.')
            return
        }
        validateToken()
    }, [token])

    const validateToken = async () => {
        try {
            const { data, error } = await supabase.rpc('validate_invite_token', {
                p_token: token
            })

            if (error) {
                console.error('Token validation error:', error)
                setPageState('invalid')
                setErrorMessage('Unable to validate invite token.')
                return
            }

            if (!data || data.length === 0) {
                setPageState('invalid')
                setErrorMessage('Invalid invite token.')
                return
            }

            const result = data[0]

            if (result.status === 'expired') {
                setPageState('expired')
                setErrorMessage('This invite link has expired. Please contact support for a new invite.')
                return
            }

            if (result.status === 'used') {
                setPageState('used')
                setErrorMessage('This invite has already been used. Please sign in instead.')
                return
            }

            if (result.status === 'valid') {
                setInviteData({
                    email: result.email,
                    first_name: result.first_name,
                    last_name: result.last_name,
                    case_reference: result.case_reference,
                    pipeline_name: result.pipeline_name,
                })
                setPageState('valid')
            } else {
                setPageState('invalid')
                setErrorMessage('Invalid invite token.')
            }
        } catch (err: any) {
            console.error('Error validating token:', err)
            setPageState('error')
            setErrorMessage('An error occurred while validating your invite.')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError(null)

        // Validation
        if (password.length < 8) {
            setFormError('Password must be at least 8 characters long.')
            return
        }

        if (password !== confirmPassword) {
            setFormError('Passwords do not match.')
            return
        }

        if (!inviteData?.email) {
            setFormError('Invalid invite data.')
            return
        }

        setIsSubmitting(true)

        try {
            // Sign up the user
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: inviteData.email,
                password: password,
                options: {
                    data: {
                        first_name: inviteData.first_name,
                        last_name: inviteData.last_name,
                    }
                }
            })

            if (signUpError) {
                // Check if user already exists
                if (signUpError.message.includes('already registered')) {
                    setFormError('An account with this email already exists. Please sign in instead.')
                } else {
                    setFormError(signUpError.message)
                }
                setIsSubmitting(false)
                return
            }

            // Consume the invite token
            const { error: consumeError } = await supabase.rpc('consume_invite_token', {
                p_token: token
            })

            if (consumeError) {
                console.error('Error consuming token:', consumeError)
                // Don't block the user, the account is already created
            }

            // Check if user is confirmed (some Supabase projects require email confirmation)
            if (signUpData.user && !signUpData.session) {
                // User needs to confirm email
                setPageState('success')
            } else if (signUpData.session) {
                // User is automatically logged in
                navigate('/dashboard', { replace: true })
            } else {
                setPageState('success')
            }
        } catch (err: any) {
            console.error('Error during signup:', err)
            setFormError('An error occurred. Please try again.')
            setIsSubmitting(false)
        }
    }

    // Loading state
    if (pageState === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                >
                    <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Validating your invite...</p>
                </motion.div>
            </div>
        )
    }

    // Error states (invalid, expired, used, error)
    if (['invalid', 'expired', 'used', 'error'].includes(pageState)) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <div className="text-center mb-8">
                        <img
                            src="/elab-logo.png"
                            alt="ELAB Solutions International"
                            className="h-16 mx-auto mb-4"
                        />
                    </div>

                    <div className="glass-card rounded-2xl p-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800 mb-2">
                            {pageState === 'expired' ? 'Invite Expired' :
                             pageState === 'used' ? 'Invite Already Used' :
                             'Invalid Invite'}
                        </h2>
                        <p className="text-slate-600 mb-6">{errorMessage}</p>

                        {pageState === 'used' && (
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all flex items-center justify-center gap-2"
                            >
                                Go to Sign In
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}

                        {pageState !== 'used' && (
                            <p className="text-slate-500 text-sm">
                                Need help? Contact{' '}
                                <a href="mailto:headoffice@elabsolution.org" className="text-primary-600 hover:underline">
                                    headoffice@elabsolution.org
                                </a>
                            </p>
                        )}
                    </div>
                </motion.div>
            </div>
        )
    }

    // Success state (after signup, if email confirmation required)
    if (pageState === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <div className="text-center mb-8">
                        <img
                            src="/elab-logo.png"
                            alt="ELAB Solutions International"
                            className="h-16 mx-auto mb-4"
                        />
                    </div>

                    <div className="glass-card rounded-2xl p-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800 mb-2">
                            Account Created!
                        </h2>
                        <p className="text-slate-600 mb-6">
                            Your account has been set up successfully. You can now sign in to access your portal.
                        </p>
                        <button
                            onClick={() => navigate('/login')}
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

    // Valid state - show password form
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
                        Welcome to ELAB Portal
                    </h1>
                    <p className="text-slate-600">
                        Set up your password to access your account
                    </p>
                </div>

                {/* Card */}
                <div className="glass-card rounded-2xl p-8">
                    {/* Welcome message */}
                    {inviteData?.first_name && (
                        <div className="mb-6 p-4 bg-primary-50 rounded-xl border border-primary-100">
                            <p className="text-primary-800 font-medium">
                                Hello {inviteData.first_name}!
                            </p>
                            {inviteData.pipeline_name && (
                                <p className="text-primary-600 text-sm mt-1">
                                    Your {inviteData.pipeline_name} application is ready for tracking.
                                </p>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Field (Read-only) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Email address
                            </label>
                            <input
                                type="email"
                                value={inviteData?.email || ''}
                                readOnly
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed"
                            />
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Create Password
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

                        {/* Confirm Password Field */}
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

                        {/* Password requirements */}
                        <p className="text-xs text-slate-500">
                            Password must be at least 8 characters long.
                        </p>

                        {/* Error Message */}
                        {formError && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 rounded-lg bg-red-50 text-red-600 text-sm"
                            >
                                {formError}
                            </motion.div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting || !password || !confirmPassword}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-200"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-sm mt-6">
                    Already have an account?{' '}
                    <button
                        onClick={() => navigate('/login')}
                        className="text-primary-600 hover:underline font-medium"
                    >
                        Sign in
                    </button>
                </p>
            </motion.div>
        </div>
    )
}
