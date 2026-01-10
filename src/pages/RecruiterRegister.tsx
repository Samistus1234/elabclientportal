import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Building2, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

// API configuration
const API_URL = import.meta.env.VITE_COMMAND_CENTER_API_URL || 'https://fwmhfwprvqaovidykaqt.supabase.co/functions/v1'
const API_KEY = import.meta.env.VITE_COMMAND_CENTER_API_KEY || ''

interface VerificationResult {
    valid: boolean
    error?: string
    recruiter?: {
        id: string | null
        company_name: string | null
        contact_name: string | null
        portal_access_enabled: boolean
        commission_rate?: number
    }
    person?: {
        id: string
        first_name: string
        last_name: string
        email: string
    }
    org_id?: string
    case_count?: number
}

export default function RecruiterRegister() {
    const navigate = useNavigate()
    const [step, setStep] = useState<'verify' | 'register'>('verify')
    const [email, setEmail] = useState('')
    const [companyName, setCompanyName] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [verificationData, setVerificationData] = useState<VerificationResult | null>(null)

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(`${API_URL}/verify-recruiter-access`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY,
                },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    company_name: companyName.trim(),
                }),
            })

            const result: VerificationResult = await response.json()

            if (!result.valid) {
                setError(result.error || 'Verification failed')
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
            const response = await fetch(`${API_URL}/portal-register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY,
                },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    password,
                    first_name: verificationData?.person?.first_name || verificationData?.recruiter?.contact_name?.split(' ')[0] || '',
                    last_name: verificationData?.person?.last_name || verificationData?.recruiter?.contact_name?.split(' ').slice(1).join(' ') || '',
                    user_type: 'recruiter',
                    person_id: verificationData?.person?.id,
                    org_id: verificationData?.org_id,
                    recruiter_id: verificationData?.recruiter?.id,
                }),
            })

            const result = await response.json()

            if (result.error) {
                setError(result.error)
                return
            }

            // Registration successful - redirect to login
            navigate('/login?registered=recruiter')
        } catch (err: any) {
            setError(err.message || 'Registration failed')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
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
                        Recruiter Portal
                    </h1>
                    <p className="text-slate-600">
                        Track your candidates' application progress
                    </p>
                </div>

                {/* Card */}
                <div className="glass-card rounded-2xl p-8">
                    {step === 'verify' ? (
                        <>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-800">
                                        Verify Your Identity
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        Step 1 of 2
                                    </p>
                                </div>
                            </div>

                            <p className="text-slate-600 text-sm mb-6">
                                Enter your email address to verify your recruiter account.
                            </p>

                            <form onSubmit={handleVerify} className="space-y-4">
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
                                            placeholder="you@company.com"
                                            required
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Company Name (Optional)
                                    </label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            id="company"
                                            type="text"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            placeholder="Your Company Ltd"
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
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
                                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Verify Email
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-800">
                                        Create Your Account
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        Step 2 of 2
                                    </p>
                                </div>
                            </div>

                            {verificationData && (
                                <div className="p-4 bg-indigo-50 rounded-xl mb-6">
                                    <p className="text-sm text-indigo-800">
                                        <strong>Welcome, {verificationData.person?.first_name || verificationData.recruiter?.contact_name || 'Recruiter'}!</strong>
                                    </p>
                                    {verificationData.recruiter?.company_name && (
                                        <p className="text-sm text-indigo-600 mt-1">
                                            {verificationData.recruiter.company_name}
                                        </p>
                                    )}
                                    {verificationData.case_count !== undefined && (
                                        <p className="text-xs text-indigo-500 mt-2">
                                            You have {verificationData.case_count} candidate{verificationData.case_count !== 1 ? 's' : ''} being processed
                                        </p>
                                    )}
                                </div>
                            )}

                            <form onSubmit={handleRegister} className="space-y-4">
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
                                            placeholder="At least 8 characters"
                                            required
                                            minLength={8}
                                            className="w-full pl-11 pr-12 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            id="confirmPassword"
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm your password"
                                            required
                                            minLength={8}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
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
                                    disabled={isLoading || !password || !confirmPassword}
                                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Create Account
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('verify')
                                        setError(null)
                                    }}
                                    className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
                                >
                                    Go back
                                </button>
                            </form>
                        </>
                    )}

                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <p className="text-center text-slate-600 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                                Sign in
                            </Link>
                        </p>
                        <p className="text-center text-slate-500 text-sm mt-2">
                            Are you an applicant?{' '}
                            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                                Register here
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-sm mt-6">
                    Need help? Contact{' '}
                    <a href="mailto:headoffice@elabsolution.org" className="text-indigo-600 hover:underline">
                        headoffice@elabsolution.org
                    </a>
                </p>
            </motion.div>
        </div>
    )
}
