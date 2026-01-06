import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    ArrowLeft,
    FileText,
    CheckCircle,
    AlertCircle,
    Loader2,
    User,
    Shield
} from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

// Verification API endpoint (Command Centre)
const VERIFY_API_URL = 'https://fwmhfwprvqaovidykaqt.supabase.co/functions/v1/verify-case-access'

interface VerificationData {
    person: {
        id: string
        first_name: string
        last_name: string
        email: string
    }
    case: {
        id: string
        case_reference: string
        status: string
        pipeline_name: string
    }
    org_id: string
}

type Step = 'verify' | 'create'

export default function Register() {
    const navigate = useNavigate()

    // Step state
    const [currentStep, setCurrentStep] = useState<Step>('verify')

    // Step 1: Verification fields
    const [caseReference, setCaseReference] = useState('')
    const [email, setEmail] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)
    const [verifyError, setVerifyError] = useState<string | null>(null)

    // Verified data from API
    const [verificationData, setVerificationData] = useState<VerificationData | null>(null)

    // Step 2: Account creation fields
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)

    // Step 1: Verify identity
    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        setVerifyError(null)
        setIsVerifying(true)

        try {
            const response = await fetch(VERIFY_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    case_reference: caseReference.trim().toUpperCase(),
                    email: email.trim().toLowerCase(),
                }),
            })

            const data = await response.json()

            if (!data.valid) {
                setVerifyError(data.error || 'Verification failed. Please check your details.')
                setIsVerifying(false)
                return
            }

            // Store verification data and proceed to step 2
            setVerificationData({
                person: data.person,
                case: data.case,
                org_id: data.org_id,
            })
            setCurrentStep('create')
        } catch (err: any) {
            console.error('Verification error:', err)
            setVerifyError('Unable to verify. Please try again later.')
        } finally {
            setIsVerifying(false)
        }
    }

    // Step 2: Create account
    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreateError(null)

        // Validation
        if (password.length < 8) {
            setCreateError('Password must be at least 8 characters long.')
            return
        }

        if (password !== confirmPassword) {
            setCreateError('Passwords do not match.')
            return
        }

        if (!verificationData) {
            setCreateError('Verification data missing. Please start over.')
            return
        }

        setIsCreating(true)

        try {
            // Create the user account
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: verificationData.person.email,
                password: password,
                options: {
                    data: {
                        first_name: verificationData.person.first_name,
                        last_name: verificationData.person.last_name,
                        person_id: verificationData.person.id,
                        case_id: verificationData.case.id,
                        org_id: verificationData.org_id,
                    }
                }
            })

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    setCreateError('An account with this email already exists. Please sign in instead.')
                } else {
                    setCreateError(signUpError.message)
                }
                setIsCreating(false)
                return
            }

            // Check if auto-confirmed or needs email confirmation
            if (signUpData.session) {
                // Auto logged in - redirect to dashboard
                navigate('/dashboard', { replace: true })
            } else {
                // Show success message and redirect to login
                navigate('/login', {
                    replace: true,
                    state: { message: 'Account created successfully! Please sign in.' }
                })
            }
        } catch (err: any) {
            console.error('Account creation error:', err)
            setCreateError('An error occurred. Please try again.')
            setIsCreating(false)
        }
    }

    // Go back to step 1
    const handleBack = () => {
        setCurrentStep('verify')
        setVerificationData(null)
        setPassword('')
        setConfirmPassword('')
        setCreateError(null)
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
                        Create Your Account
                    </h1>
                    <p className="text-slate-600">
                        {currentStep === 'verify'
                            ? 'Verify your identity to get started'
                            : 'Set up your password to complete registration'
                        }
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-3 mb-6">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        currentStep === 'verify'
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-green-100 text-green-700'
                    }`}>
                        {currentStep === 'create' ? (
                            <CheckCircle className="w-4 h-4" />
                        ) : (
                            <Shield className="w-4 h-4" />
                        )}
                        <span>Verify</span>
                    </div>
                    <div className="w-8 h-0.5 bg-slate-200" />
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        currentStep === 'create'
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-slate-100 text-slate-400'
                    }`}>
                        <User className="w-4 h-4" />
                        <span>Create</span>
                    </div>
                </div>

                {/* Card */}
                <div className="glass-card rounded-2xl p-8">
                    <AnimatePresence mode="wait">
                        {currentStep === 'verify' ? (
                            <motion.div
                                key="verify"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <h2 className="text-xl font-semibold text-slate-800 mb-2">
                                    Step 1: Verify Your Identity
                                </h2>
                                <p className="text-slate-600 text-sm mb-6">
                                    Enter your case reference number and email address to verify your identity.
                                </p>

                                <form onSubmit={handleVerify} className="space-y-4">
                                    {/* Case Reference Field */}
                                    <div>
                                        <label htmlFor="caseReference" className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Case Reference Number
                                        </label>
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                id="caseReference"
                                                type="text"
                                                value={caseReference}
                                                onChange={(e) => setCaseReference(e.target.value)}
                                                placeholder="e.g., DF-0036-0126"
                                                required
                                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none text-slate-800 placeholder:text-slate-400 uppercase"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            You can find this in your welcome email from ELAB.
                                        </p>
                                    </div>

                                    {/* Email Field */}
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Email Address
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

                                    {/* Error Message */}
                                    {verifyError && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-start gap-2"
                                        >
                                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                            <span>{verifyError}</span>
                                        </motion.div>
                                    )}

                                    {/* Verify Button */}
                                    <button
                                        type="submit"
                                        disabled={isVerifying || !caseReference || !email}
                                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-200"
                                    >
                                        {isVerifying ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                Verify Identity
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="create"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                {/* Back Button */}
                                <button
                                    onClick={handleBack}
                                    className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm mb-4 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to verification
                                </button>

                                <h2 className="text-xl font-semibold text-slate-800 mb-2">
                                    Step 2: Create Your Account
                                </h2>
                                <p className="text-slate-600 text-sm mb-6">
                                    Set a password to secure your account.
                                </p>

                                {/* Verified Info Card */}
                                {verificationData && (
                                    <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-100">
                                        <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                                            <CheckCircle className="w-5 h-5" />
                                            Identity Verified
                                        </div>
                                        <div className="text-sm text-green-800 space-y-1">
                                            <p><span className="font-medium">Name:</span> {verificationData.person.first_name} {verificationData.person.last_name}</p>
                                            <p><span className="font-medium">Case:</span> {verificationData.case.case_reference}</p>
                                            <p><span className="font-medium">Application:</span> {verificationData.case.pipeline_name}</p>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleCreateAccount} className="space-y-4">
                                    {/* Email (Read-only) */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={verificationData?.person.email || ''}
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

                                    {/* Password Requirements */}
                                    <p className="text-xs text-slate-500">
                                        Password must be at least 8 characters long.
                                    </p>

                                    {/* Error Message */}
                                    {createError && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-start gap-2"
                                        >
                                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                            <span>{createError}</span>
                                        </motion.div>
                                    )}

                                    {/* Create Account Button */}
                                    <button
                                        type="submit"
                                        disabled={isCreating || !password || !confirmPassword}
                                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-200"
                                    >
                                        {isCreating ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                Create Account
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-sm mt-6">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                        Sign in
                    </Link>
                </p>
                <p className="text-center text-slate-400 text-xs mt-3">
                    Need help? Contact{' '}
                    <a href="mailto:info@elab.academy" className="hover:text-primary-500">
                        info@elab.academy
                    </a>
                </p>
            </motion.div>
        </div>
    )
}
