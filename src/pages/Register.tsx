import AuthShell from '@/components/AuthShell'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
    COMMAND_CENTER_API_KEY,
    buildCommandCenterUrl,
    commandCenterHeaders,
} from '@/lib/commandCenterApi'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, FileText, AlertCircle, Loader2, Shield, Info } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

// Sign-up proves the client owns the email on their case before an account exists:
//   1. case reference + email  -> verify-case-access emails a 6-digit code
//   2. the code                -> register-client { action: 'check_code' }
//   3. a password              -> register-client creates the account
type Step = 'verify' | 'code' | 'create'

const STEPS: Step[] = ['verify', 'code', 'create']

const inputCls =
    'w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-slate-800 placeholder:text-slate-400'
const buttonCls =
    'w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white font-semibold hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30'

async function callCommandCenter(path: string, body: Record<string, unknown>) {
    const response = await fetch(buildCommandCenterUrl(path), {
        method: 'POST',
        headers: commandCenterHeaders({ 'Content-Type': 'application/json' }),
        // Tells the server this page does the emailed-code flow; older cached
        // pages are asked to reload instead of being sent a code they can't use.
        body: JSON.stringify({ ...body, client: 'portal-signup-v2' }),
    })
    const payload = await response.json().catch(() => null)
    return { response, payload }
}

function networkMessage(err: unknown) {
    const isNetworkError = err instanceof TypeError && /Failed to fetch|NetworkError|Load failed/i.test(err.message)
    return isNetworkError
        ? 'We cannot reach eLab right now. Please check your connection and try again.'
        : 'Something went wrong. Please try again.'
}

function ErrorBox({ message }: { message: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="p-4 rounded-xl bg-red-50 text-red-600 text-sm flex items-start gap-3 border border-red-100"
        >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{message}</span>
        </motion.div>
    )
}

export default function Register() {
    const navigate = useNavigate()

    const [currentStep, setCurrentStep] = useState<Step>('verify')

    // Step 1
    const [caseReference, setCaseReference] = useState(() => new URLSearchParams(window.location.search).get('case') || '')
    const [email, setEmail] = useState(() => new URLSearchParams(window.location.search).get('email') || '')
    const [isVerifying, setIsVerifying] = useState(false)
    const [verifyError, setVerifyError] = useState<string | null>(null)
    const [maskedEmail, setMaskedEmail] = useState('')

    // Step 2
    const [code, setCode] = useState('')
    const [isChecking, setIsChecking] = useState(false)
    const [codeError, setCodeError] = useState<string | null>(null)
    const [resendIn, setResendIn] = useState(0)
    const [resent, setResent] = useState(false)

    // Step 3
    const [firstName, setFirstName] = useState<string | null>(null)
    const [alreadyRegistered, setAlreadyRegistered] = useState(false)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)

    const ref = caseReference.trim().toUpperCase()
    const cleanEmail = email.trim().toLowerCase()

    useEffect(() => {
        if (resendIn <= 0) return
        const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
        return () => clearTimeout(t)
    }, [resendIn])

    // Step 1 (and "resend"): match the case and email us a code
    const sendCode = async (isResend = false) => {
        setVerifyError(null)
        setCodeError(null)
        setIsVerifying(true)
        try {
            if (!COMMAND_CENTER_API_KEY) {
                setVerifyError('Sign-up is not available right now. Please contact us.')
                return
            }
            const { response, payload } = await callCommandCenter('/verify-case-access', {
                case_reference: ref,
                email: cleanEmail,
            })
            if (!response.ok || !payload?.valid) {
                const message =
                    payload?.error ||
                    (response.status >= 500
                        ? 'Sign-up is temporarily unavailable. Please try again shortly.'
                        : "We couldn't match that case reference and email.")
                if (isResend) setCodeError(message)
                else setVerifyError(message)
                return
            }
            setMaskedEmail(payload.masked_email || cleanEmail)
            setResendIn(payload.resend_after || 60)
            setCode('')
            setResent(isResend)
            setCurrentStep('code')
        } catch (err) {
            console.error('Verification error:', err)
            if (isResend) setCodeError(networkMessage(err))
            else setVerifyError(networkMessage(err))
        } finally {
            setIsVerifying(false)
        }
    }

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault()
        void sendCode(false)
    }

    // Step 2: check the code
    const handleCheckCode = async (e: React.FormEvent) => {
        e.preventDefault()
        setCodeError(null)
        setIsChecking(true)
        try {
            const { response, payload } = await callCommandCenter('/register-client', {
                action: 'check_code',
                case_reference: ref,
                email: cleanEmail,
                code,
            })
            if (!response.ok || !payload?.ok) {
                setCodeError(payload?.error || "That code isn't right.")
                return
            }
            setFirstName(payload.first_name || null)
            setAlreadyRegistered(!!payload.already_registered)
            setCurrentStep('create')
        } catch (err) {
            console.error('Code check error:', err)
            setCodeError(networkMessage(err))
        } finally {
            setIsChecking(false)
        }
    }

    // Step 3: create the account
    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreateError(null)

        if (password.length < 8) {
            setCreateError('Password must be at least 8 characters long.')
            return
        }
        if (password !== confirmPassword) {
            setCreateError('Passwords do not match.')
            return
        }

        setIsCreating(true)
        try {
            // Server-side: re-checks the case and the code, creates a PRE-CONFIRMED
            // auth user and links portal_users -> person in one step.
            const { response, payload } = await callCommandCenter('/register-client', {
                case_reference: ref,
                email: cleanEmail,
                code,
                password,
            })
            if (!response.ok || !payload?.success) {
                setCreateError(payload?.error || 'Could not create your account. Please try again or contact us.')
                return
            }
            if (payload.already_registered) {
                navigate('/login', { replace: true, state: { message: payload.message } })
                return
            }

            const { error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
            if (signInError) {
                navigate('/login', { replace: true, state: { message: 'Account created successfully! Please sign in.' } })
            } else {
                navigate('/dashboard', { replace: true })
            }
        } catch (err) {
            console.error('Account creation error:', err)
            setCreateError(networkMessage(err))
        } finally {
            setIsCreating(false)
        }
    }

    const startOver = () => {
        setCurrentStep('verify')
        setCode('')
        setPassword('')
        setConfirmPassword('')
        setCodeError(null)
        setCreateError(null)
        setResent(false)
    }

    const stepIndex = STEPS.indexOf(currentStep)

    return (
        <AuthShell><div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md relative z-10"
                >
                    {/* Header */}
                    <div className="text-center mb-6">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
                            Create your account
                        </h1>
                        <p className="text-slate-600">
                            {currentStep === 'verify' && 'Use the case reference and email you gave eLab'}
                            {currentStep === 'code' && 'Check your email for a 6-digit code'}
                            {currentStep === 'create' && 'Choose a password to finish'}
                        </p>
                    </div>

                    {/* Progress */}
                    <div className="flex gap-1.5 mb-6" aria-label={`Step ${stepIndex + 1} of 3`}>
                        {STEPS.map((s, i) => (
                            <span key={s} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-blue-600' : 'bg-slate-200'}`} />
                        ))}
                    </div>

                    <motion.div
                        className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-white/50"
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <AnimatePresence mode="wait">
                            {currentStep === 'verify' && (
                                <motion.div key="verify" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                    <form onSubmit={handleVerify} className="space-y-5">
                                        <div>
                                            <label htmlFor="caseReference" className="block text-sm font-medium text-slate-700 mb-2">
                                                Case reference
                                            </label>
                                            <div className="relative">
                                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    id="caseReference"
                                                    type="text"
                                                    value={caseReference}
                                                    onChange={(e) => setCaseReference(e.target.value)}
                                                    placeholder="e.g. DFL-2309-0726-ELAB"
                                                    required
                                                    autoComplete="off"
                                                    className={`${inputCls} uppercase`}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-500 mt-2">
                                                It's on your eLab invoice and welcome message.
                                            </p>
                                        </div>

                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                                                Email
                                            </label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    id="email"
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="The email you gave eLab"
                                                    required
                                                    autoComplete="email"
                                                    className={inputCls}
                                                />
                                            </div>
                                        </div>

                                        {verifyError && <ErrorBox message={verifyError} />}

                                        <motion.button
                                            type="submit"
                                            disabled={isVerifying || !caseReference || !email}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            className={buttonCls}
                                        >
                                            {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Email me a code <ArrowRight className="w-5 h-5" /></>}
                                        </motion.button>
                                    </form>
                                </motion.div>
                            )}

                            {currentStep === 'code' && (
                                <motion.div key="code" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                    <button
                                        type="button"
                                        onClick={startOver}
                                        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4 transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Change case reference or email
                                    </button>

                                    <p className="text-slate-600 text-sm mb-5">
                                        {resent ? 'We sent a new code to ' : 'We sent a 6-digit code to '}
                                        <strong className="text-slate-800">{maskedEmail}</strong>. It works for 15 minutes.
                                    </p>

                                    <form onSubmit={handleCheckCode} className="space-y-5">
                                        <div>
                                            <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-2">
                                                Code
                                            </label>
                                            <input
                                                id="code"
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                maxLength={7}
                                                value={code}
                                                onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))}
                                                placeholder="123 456"
                                                required
                                                autoFocus
                                                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none text-center text-2xl font-semibold tracking-[0.4em] tabular-nums text-slate-800 placeholder:text-slate-300"
                                            />
                                        </div>

                                        {codeError && <ErrorBox message={codeError} />}

                                        <motion.button
                                            type="submit"
                                            disabled={isChecking || code.replace(/\D/g, '').length !== 6}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            className={buttonCls}
                                        >
                                            {isChecking ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="w-5 h-5" /></>}
                                        </motion.button>
                                    </form>

                                    <div className="mt-4 text-center text-sm">
                                        {resendIn > 0 ? (
                                            <span className="text-slate-400">Resend code in 0:{String(resendIn).padStart(2, '0')}</span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => void sendCode(true)}
                                                disabled={isVerifying}
                                                className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                                            >
                                                {isVerifying ? 'Sending…' : 'Resend code'}
                                            </button>
                                        )}
                                        <p className="text-xs text-slate-500 mt-2">Not in your inbox? Check Spam or Promotions.</p>
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === 'create' && (
                                <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                    <h2 className="text-lg font-semibold text-slate-800 mb-2">
                                        {firstName ? `Welcome, ${firstName}` : 'Welcome'}
                                    </h2>

                                    {alreadyRegistered ? (
                                        <div className="space-y-4">
                                            <div className="p-4 rounded-xl bg-blue-50 text-blue-800 text-sm flex items-start gap-3 border border-blue-100">
                                                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                                <span>You already have an account with this email.</span>
                                            </div>
                                            <Link to="/login" className={buttonCls}>Sign in <ArrowRight className="w-5 h-5" /></Link>
                                            <p className="text-center text-sm">
                                                <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium">Forgot your password? Reset it</Link>
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-slate-600 text-sm mb-5">
                                                Choose a password. You'll sign in with your email and this password.
                                            </p>
                                            <form onSubmit={handleCreateAccount} className="space-y-5">
                                                <div>
                                                    <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                                                        Password
                                                    </label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                        <input
                                                            id="password"
                                                            type={showPassword ? 'text' : 'password'}
                                                            value={password}
                                                            onChange={(e) => setPassword(e.target.value)}
                                                            placeholder="At least 8 characters"
                                                            required
                                                            minLength={8}
                                                            autoComplete="new-password"
                                                            className={`${inputCls} pr-12`}
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

                                                <div>
                                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                                                        Confirm password
                                                    </label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                        <input
                                                            id="confirmPassword"
                                                            type={showConfirmPassword ? 'text' : 'password'}
                                                            value={confirmPassword}
                                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                                            placeholder="Re-enter your password"
                                                            required
                                                            minLength={8}
                                                            autoComplete="new-password"
                                                            className={`${inputCls} pr-12`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                        >
                                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Shield className="w-4 h-4" />
                                                    <span>At least 8 characters.</span>
                                                </div>

                                                {createError && <ErrorBox message={createError} />}

                                                <motion.button
                                                    type="submit"
                                                    disabled={isCreating || !password || !confirmPassword}
                                                    whileHover={{ scale: 1.01 }}
                                                    whileTap={{ scale: 0.99 }}
                                                    className={buttonCls}
                                                >
                                                    {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create account <ArrowRight className="w-5 h-5" /></>}
                                                </motion.button>
                                            </form>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Footer */}
                    <div className="mt-6 text-center space-y-3">
                        <p className="text-slate-600 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                                Sign in
                            </Link>
                        </p>
                        <p className="text-slate-400 text-xs">
                            Need help? Contact{' '}
                            <a href="mailto:headoffice@elabsolution.org" className="hover:text-blue-500 transition-colors">
                                headoffice@elabsolution.org
                            </a>
                        </p>
                    </div>
                </motion.div>
            </div></AuthShell>
    )
}
