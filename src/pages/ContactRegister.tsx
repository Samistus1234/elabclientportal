import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import {
    Mail,
    Lock,
    Building2,
    ArrowRight,
    ArrowLeft,
    Eye,
    EyeOff,
    CheckCircle2,
    User,
    Shield,
    FileCheck,
    Globe,
    Sparkles,
    Users,
    AlertCircle
} from 'lucide-react'

// API configuration
const API_URL = import.meta.env.VITE_COMMAND_CENTER_API_URL || 'https://fwmhfwprvqaovidykaqt.supabase.co/functions/v1'
const API_KEY = import.meta.env.VITE_COMMAND_CENTER_API_KEY || ''

interface VerificationResult {
    valid: boolean
    error?: string
    already_registered?: boolean
    contact?: {
        id: string
        first_name: string
        last_name: string
        email: string
        title: string | null
    }
    institution?: {
        id: string
        name: string
        code: string
    }
    org_id?: string
    portal_invited_at?: string
}

// Animated floating orb component
function FloatingOrb({ className, delay = 0 }: { className: string; delay?: number }) {
    return (
        <motion.div
            className={`absolute rounded-full blur-3xl opacity-30 ${className}`}
            animate={{
                y: [0, -30, 0],
                x: [0, 20, 0],
                scale: [1, 1.1, 1],
            }}
            transition={{
                duration: 8,
                repeat: Infinity,
                delay,
                ease: 'easeInOut',
            }}
        />
    )
}

// Grid pattern background
function GridPattern() {
    return (
        <div className="absolute inset-0 overflow-hidden opacity-[0.03]">
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px',
                }}
            />
        </div>
    )
}

// Feature badge component
function FeatureBadge({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2"
        >
            <Icon className="w-4 h-4 text-emerald-300" />
            <span className="text-white/90 text-sm">{text}</span>
        </motion.div>
    )
}

export default function ContactRegister() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [step, setStep] = useState<'verify' | 'register'>('verify')
    const [email, setEmail] = useState('')
    const [contactId, setContactId] = useState('')

    // Pre-fill from URL parameters (from invitation link)
    useEffect(() => {
        const emailParam = searchParams.get('email')
        const contactIdParam = searchParams.get('contact_id')
        if (emailParam) setEmail(emailParam)
        if (contactIdParam) setContactId(contactIdParam)

        // If both params present, auto-verify
        if (emailParam && contactIdParam) {
            handleAutoVerify(emailParam, contactIdParam)
        }
    }, [searchParams])

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [verificationData, setVerificationData] = useState<VerificationResult | null>(null)

    // Focus states for glow effect
    const [focusedField, setFocusedField] = useState<string | null>(null)

    const handleAutoVerify = async (emailVal: string, contactIdVal: string) => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(`${API_URL}/verify-institutional-contact-access`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY,
                },
                body: JSON.stringify({
                    email: emailVal.trim().toLowerCase(),
                    contact_id: contactIdVal,
                }),
            })

            const result: VerificationResult = await response.json()

            if (!result.valid) {
                if (result.already_registered) {
                    setError('An account already exists for this email. Please sign in instead.')
                } else {
                    setError(result.error || 'Verification failed')
                }
                return
            }

            setVerificationData(result)
            setStep('register')
        } catch (err: any) {
            setError(err.message || 'Verification failed')
        } finally {
            setIsLoading(false)
        }
    }

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(`${API_URL}/verify-institutional-contact-access`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY,
                },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    contact_id: contactId || undefined,
                }),
            })

            const result: VerificationResult = await response.json()

            if (!result.valid) {
                if (result.already_registered) {
                    setError('An account already exists for this email. Please sign in instead.')
                } else {
                    setError(result.error || 'Verification failed')
                }
                return
            }

            setVerificationData(result)
            setContactId(result.contact?.id || contactId)
            setStep('register')
        } catch (err: any) {
            setError(err.message || 'Verification failed')
        } finally {
            setIsLoading(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            setIsLoading(false)
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            setIsLoading(false)
            return
        }

        try {
            const response = await fetch(`${API_URL}/institutional-contact-portal-register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY,
                },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    password,
                    contact_id: verificationData?.contact?.id || contactId,
                }),
            })

            const result = await response.json()

            if (!result.success) {
                setError(result.error || 'Registration failed')
                return
            }

            // Registration successful - redirect to contact login
            navigate('/contact/login?registered=true')
        } catch (err: any) {
            setError(err.message || 'Registration failed')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 overflow-hidden">
                {/* Animated background elements */}
                <FloatingOrb className="w-96 h-96 bg-emerald-500 -top-20 -left-20" delay={0} />
                <FloatingOrb className="w-80 h-80 bg-teal-500 top-1/2 right-0" delay={2} />
                <FloatingOrb className="w-72 h-72 bg-cyan-500 bottom-0 left-1/4" delay={4} />

                <GridPattern />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between w-full p-12">
                    {/* Logo */}
                    <div>
                        <img
                            src="/elab-logo.png"
                            alt="ELAB Solutions International"
                            className="h-14 brightness-0 invert"
                        />
                    </div>

                    {/* Main content */}
                    <div className="space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-emerald-300 text-sm font-medium mb-4">
                                <Building2 className="w-4 h-4" />
                                Institutional Partners
                            </div>
                            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                                Join Our
                                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                                    Verification Network
                                </span>
                            </h1>
                            <p className="text-lg text-white/70 max-w-md">
                                Register as an institutional partner to process verification requests, authenticate documents, and support healthcare professionals.
                            </p>
                        </motion.div>

                        {/* Feature badges */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex flex-wrap gap-3"
                        >
                            <FeatureBadge icon={FileCheck} text="Document Verification" />
                            <FeatureBadge icon={Shield} text="Secure Portal" />
                            <FeatureBadge icon={Sparkles} text="Fast Processing" />
                        </motion.div>
                    </div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex gap-8"
                    >
                        <div>
                            <div className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-emerald-400" />
                                <span className="text-2xl font-bold text-white">200+</span>
                            </div>
                            <p className="text-white/50 text-sm">Partner Institutions</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-emerald-400" />
                                <span className="text-2xl font-bold text-white">50K+</span>
                            </div>
                            <p className="text-white/50 text-sm">Verifications</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <Globe className="w-5 h-5 text-emerald-400" />
                                <span className="text-2xl font-bold text-white">15+</span>
                            </div>
                            <p className="text-white/50 text-sm">Countries</p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Right Panel - Registration Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-slate-50 via-white to-emerald-50 relative overflow-hidden">
                {/* Subtle background orbs for right panel */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-100 rounded-full blur-3xl opacity-40" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md relative z-10"
                >
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <img
                            src="/elab-logo.png"
                            alt="ELAB Solutions International"
                            className="h-12 mx-auto mb-4"
                        />
                    </div>

                    {/* Header */}
                    <div className="text-center mb-6">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
                            Verification Portal
                        </h1>
                        <p className="text-slate-600">
                            {step === 'verify'
                                ? 'Verify your institutional account'
                                : 'Create your password to get started'
                            }
                        </p>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            step === 'verify'
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200'
                                : 'bg-green-100 text-green-700'
                        }`}>
                            {step === 'register' ? (
                                <CheckCircle2 className="w-4 h-4" />
                            ) : (
                                <Mail className="w-4 h-4" />
                            )}
                            <span>Verify</span>
                        </div>
                        <div className={`w-12 h-1 rounded-full transition-all ${
                            step === 'register' ? 'bg-gradient-to-r from-green-400 to-emerald-400' : 'bg-slate-200'
                        }`} />
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            step === 'register'
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200'
                                : 'bg-slate-100 text-slate-400'
                        }`}>
                            <Lock className="w-4 h-4" />
                            <span>Create</span>
                        </div>
                    </div>

                    {/* Card */}
                    <motion.div
                        className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-white/50"
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        <AnimatePresence mode="wait">
                            {step === 'verify' ? (
                                <motion.div
                                    key="verify"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                >
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                            <Building2 className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-800">
                                                Verify Your Identity
                                            </h2>
                                            <p className="text-xs text-slate-500">
                                                Step 1 of 2
                                            </p>
                                        </div>
                                    </div>

                                    <p className="text-slate-600 text-sm mb-6">
                                        Enter your email address to verify your institutional contact account.
                                    </p>

                                    <form onSubmit={handleVerify} className="space-y-5">
                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                                                Email Address
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
                                                        placeholder="you@institution.org"
                                                        required
                                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all outline-none text-slate-800 placeholder:text-slate-400"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 rounded-xl bg-red-50 text-red-600 text-sm flex items-start gap-3 border border-red-100"
                                            >
                                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <span>{error}</span>
                                                    {error.includes('sign in') && (
                                                        <Link to="/contact/login" className="block mt-2 text-emerald-600 hover:underline font-medium">
                                                            Go to Sign In
                                                        </Link>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}

                                        <motion.button
                                            type="submit"
                                            disabled={isLoading || !email}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-700 hover:via-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
                                        >
                                            {isLoading ? (
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    Verify Email
                                                    <ArrowRight className="w-5 h-5" />
                                                </>
                                            )}
                                        </motion.button>
                                    </form>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="register"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    {/* Back Button */}
                                    <button
                                        onClick={() => {
                                            setStep('verify')
                                            setError(null)
                                        }}
                                        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4 transition-colors group"
                                    >
                                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                        Back to verification
                                    </button>

                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-800">
                                                Create Your Account
                                            </h2>
                                            <p className="text-xs text-slate-500">
                                                Step 2 of 2
                                            </p>
                                        </div>
                                    </div>

                                    {verificationData && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl mb-5 border border-emerald-100"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <User className="w-4 h-4 text-emerald-600" />
                                                <p className="text-sm text-emerald-800 font-semibold">
                                                    {verificationData.contact?.first_name} {verificationData.contact?.last_name}
                                                </p>
                                            </div>
                                            {verificationData.contact?.title && (
                                                <p className="text-sm text-emerald-600">
                                                    {verificationData.contact.title}
                                                </p>
                                            )}
                                            {verificationData.institution && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Building2 className="w-4 h-4 text-emerald-500" />
                                                    <p className="text-sm text-emerald-700 font-medium">
                                                        {verificationData.institution.name}
                                                    </p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    <form onSubmit={handleRegister} className="space-y-5">
                                        <div>
                                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                                                Create Password
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
                                                        placeholder="At least 8 characters"
                                                        required
                                                        minLength={8}
                                                        className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all outline-none text-slate-800 placeholder:text-slate-400"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                    >
                                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                                                Confirm Password
                                            </label>
                                            <div className="relative group">
                                                <div className={`absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl opacity-0 group-hover:opacity-30 blur transition-all duration-300 ${focusedField === 'confirmPassword' ? 'opacity-50' : ''}`} />
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                    <input
                                                        id="confirmPassword"
                                                        type={showConfirmPassword ? 'text' : 'password'}
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        onFocus={() => setFocusedField('confirmPassword')}
                                                        onBlur={() => setFocusedField(null)}
                                                        placeholder="Confirm your password"
                                                        required
                                                        minLength={8}
                                                        className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all outline-none text-slate-800 placeholder:text-slate-400"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                    >
                                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Password Requirements */}
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Shield className="w-4 h-4" />
                                            <span>Password must be at least 8 characters long.</span>
                                        </div>

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

                                        <motion.button
                                            type="submit"
                                            disabled={isLoading || !password || !confirmPassword}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-700 hover:via-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
                                        >
                                            {isLoading ? (
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    Create Account
                                                    <ArrowRight className="w-5 h-5" />
                                                </>
                                            )}
                                        </motion.button>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <p className="text-center text-slate-600 text-sm">
                                Already have an account?{' '}
                                <Link to="/contact/login" className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </motion.div>

                    {/* Footer */}
                    <p className="text-center text-slate-400 text-xs mt-6">
                        Need help? Contact{' '}
                        <a href="mailto:verification@elabsolution.org" className="hover:text-emerald-500 transition-colors">
                            verification@elabsolution.org
                        </a>
                    </p>
                </motion.div>
            </div>
        </div>
    )
}
