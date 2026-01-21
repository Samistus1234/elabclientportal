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
    Shield,
    Sparkles,
    Globe,
    Award,
    Users
} from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

// Verification API endpoint (Client Portal proxy to Command Centre)
const VERIFY_API_URL = 'https://pvhwofaduoxirkroiblk.supabase.co/functions/v1/verify-registration'

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
            <Icon className="w-4 h-4 text-cyan-300" />
            <span className="text-white/90 text-sm">{text}</span>
        </motion.div>
    )
}

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

    // Focus states for glow effect
    const [focusedField, setFocusedField] = useState<string | null>(null)

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
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
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
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 overflow-hidden">
                {/* Animated background elements */}
                <FloatingOrb className="w-96 h-96 bg-blue-500 -top-20 -left-20" delay={0} />
                <FloatingOrb className="w-80 h-80 bg-cyan-500 top-1/2 right-0" delay={2} />
                <FloatingOrb className="w-72 h-72 bg-purple-500 bottom-0 left-1/4" delay={4} />

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
                            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                                Join ELAB
                                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                                    Client Portal
                                </span>
                            </h1>
                            <p className="text-lg text-white/70 max-w-md">
                                Create your account to access your applications, track progress, and get real-time updates on your healthcare career journey.
                            </p>
                        </motion.div>

                        {/* Feature badges */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex flex-wrap gap-3"
                        >
                            <FeatureBadge icon={Shield} text="Secure Portal" />
                            <FeatureBadge icon={Globe} text="24/7 Access" />
                            <FeatureBadge icon={Sparkles} text="Real-time Updates" />
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
                                <Users className="w-5 h-5 text-cyan-400" />
                                <span className="text-2xl font-bold text-white">10K+</span>
                            </div>
                            <p className="text-white/50 text-sm">Active Clients</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-cyan-400" />
                                <span className="text-2xl font-bold text-white">95%</span>
                            </div>
                            <p className="text-white/50 text-sm">Success Rate</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <Globe className="w-5 h-5 text-cyan-400" />
                                <span className="text-2xl font-bold text-white">50+</span>
                            </div>
                            <p className="text-white/50 text-sm">Countries</p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Right Panel - Registration Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
                {/* Subtle background orbs for right panel */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-100 rounded-full blur-3xl opacity-40" />

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
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            currentStep === 'verify'
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-200'
                                : 'bg-green-100 text-green-700'
                        }`}>
                            {currentStep === 'create' ? (
                                <CheckCircle className="w-4 h-4" />
                            ) : (
                                <Shield className="w-4 h-4" />
                            )}
                            <span>Verify</span>
                        </div>
                        <div className={`w-12 h-1 rounded-full transition-all ${
                            currentStep === 'create' ? 'bg-gradient-to-r from-green-400 to-blue-400' : 'bg-slate-200'
                        }`} />
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            currentStep === 'create'
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-200'
                                : 'bg-slate-100 text-slate-400'
                        }`}>
                            <User className="w-4 h-4" />
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
                            {currentStep === 'verify' ? (
                                <motion.div
                                    key="verify"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                >
                                    <h2 className="text-lg font-semibold text-slate-800 mb-2">
                                        Step 1: Verify Your Identity
                                    </h2>
                                    <p className="text-slate-600 text-sm mb-6">
                                        Enter your case reference number and email address to verify your identity.
                                    </p>

                                    <form onSubmit={handleVerify} className="space-y-5">
                                        {/* Case Reference Field */}
                                        <div>
                                            <label htmlFor="caseReference" className="block text-sm font-medium text-slate-700 mb-2">
                                                Case Reference Number
                                            </label>
                                            <div className="relative group">
                                                <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-0 group-hover:opacity-30 blur transition-all duration-300 ${focusedField === 'caseReference' ? 'opacity-50' : ''}`} />
                                                <div className="relative">
                                                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                    <input
                                                        id="caseReference"
                                                        type="text"
                                                        value={caseReference}
                                                        onChange={(e) => setCaseReference(e.target.value)}
                                                        onFocus={() => setFocusedField('caseReference')}
                                                        onBlur={() => setFocusedField(null)}
                                                        placeholder="e.g., DF-0036-0126"
                                                        required
                                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-slate-800 placeholder:text-slate-400 uppercase"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-2">
                                                You can find this in your welcome email from ELAB.
                                            </p>
                                        </div>

                                        {/* Email Field */}
                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                                                Email Address
                                            </label>
                                            <div className="relative group">
                                                <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-0 group-hover:opacity-30 blur transition-all duration-300 ${focusedField === 'email' ? 'opacity-50' : ''}`} />
                                                <div className="relative">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                    <input
                                                        id="email"
                                                        type="email"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        onFocus={() => setFocusedField('email')}
                                                        onBlur={() => setFocusedField(null)}
                                                        placeholder="elab@gmail.com"
                                                        required
                                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-slate-800 placeholder:text-slate-400"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Error Message */}
                                        {verifyError && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 rounded-xl bg-red-50 text-red-600 text-sm flex items-start gap-3 border border-red-100"
                                            >
                                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                                <span>{verifyError}</span>
                                            </motion.div>
                                        )}

                                        {/* Verify Button */}
                                        <motion.button
                                            type="submit"
                                            disabled={isVerifying || !caseReference || !email}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white font-semibold hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                                        >
                                            {isVerifying ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    Verify Identity
                                                    <ArrowRight className="w-5 h-5" />
                                                </>
                                            )}
                                        </motion.button>
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
                                        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-4 transition-colors group"
                                    >
                                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                        Back to verification
                                    </button>

                                    <h2 className="text-lg font-semibold text-slate-800 mb-2">
                                        Step 2: Create Your Account
                                    </h2>
                                    <p className="text-slate-600 text-sm mb-5">
                                        Set a password to secure your account.
                                    </p>

                                    {/* Verified Info Card */}
                                    {verificationData && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="mb-5 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200"
                                        >
                                            <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                                                <CheckCircle className="w-5 h-5" />
                                                Identity Verified
                                            </div>
                                            <div className="text-sm text-green-800 space-y-1">
                                                <p><span className="font-medium">Name:</span> {verificationData.person.first_name} {verificationData.person.last_name}</p>
                                                <p><span className="font-medium">Case:</span> {verificationData.case.case_reference}</p>
                                                <p><span className="font-medium">Application:</span> {verificationData.case.pipeline_name}</p>
                                            </div>
                                        </motion.div>
                                    )}

                                    <form onSubmit={handleCreateAccount} className="space-y-5">
                                        {/* Email (Read-only) */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Email Address
                                            </label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="email"
                                                    value={verificationData?.person.email || ''}
                                                    readOnly
                                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>

                                        {/* Password Field */}
                                        <div>
                                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                                                Create Password
                                            </label>
                                            <div className="relative group">
                                                <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-0 group-hover:opacity-30 blur transition-all duration-300 ${focusedField === 'password' ? 'opacity-50' : ''}`} />
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                    <input
                                                        id="password"
                                                        type={showPassword ? 'text' : 'password'}
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        onFocus={() => setFocusedField('password')}
                                                        onBlur={() => setFocusedField(null)}
                                                        placeholder="Minimum 8 characters"
                                                        required
                                                        minLength={8}
                                                        className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-slate-800 placeholder:text-slate-400"
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

                                        {/* Confirm Password Field */}
                                        <div>
                                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                                                Confirm Password
                                            </label>
                                            <div className="relative group">
                                                <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-0 group-hover:opacity-30 blur transition-all duration-300 ${focusedField === 'confirmPassword' ? 'opacity-50' : ''}`} />
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                    <input
                                                        id="confirmPassword"
                                                        type={showConfirmPassword ? 'text' : 'password'}
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        onFocus={() => setFocusedField('confirmPassword')}
                                                        onBlur={() => setFocusedField(null)}
                                                        placeholder="Re-enter your password"
                                                        required
                                                        minLength={8}
                                                        className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-slate-800 placeholder:text-slate-400"
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

                                        {/* Error Message */}
                                        {createError && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 rounded-xl bg-red-50 text-red-600 text-sm flex items-start gap-3 border border-red-100"
                                            >
                                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                                <span>{createError}</span>
                                            </motion.div>
                                        )}

                                        {/* Create Account Button */}
                                        <motion.button
                                            type="submit"
                                            disabled={isCreating || !password || !confirmPassword}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white font-semibold hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                                        >
                                            {isCreating ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
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
            </div>
        </div>
    )
}
