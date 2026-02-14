import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase, getPortalUserInfo } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { WalkthroughProvider } from '@/contexts/WalkthroughContext'
import WalkthroughOverlay from '@/components/WalkthroughOverlay'

// Pages - Applicant
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import AuthCallback from '@/pages/AuthCallback'
import Dashboard from '@/pages/Dashboard'
import CaseView from '@/pages/CaseView'
import AcceptInvite from '@/pages/AcceptInvite'
import FAQ from '@/pages/FAQ'
import Documents from '@/pages/Documents'
import Settings from '@/pages/Settings'
import Support from '@/pages/Support'
import Homepage from '@/pages/Homepage'
import PrivacyPolicy from '@/pages/PrivacyPolicy'
import TermsOfService from '@/pages/TermsOfService'
import RefundPolicy from '@/pages/RefundPolicy'

// Pages - Recruiter
import RecruiterLogin from '@/pages/RecruiterLogin'
import RecruiterRegister from '@/pages/RecruiterRegister'
import RecruiterDashboard from '@/pages/RecruiterDashboard'
import RecruiterCaseView from '@/pages/RecruiterCaseView'
import RecruiterInvoices from '@/pages/RecruiterInvoices'
import RecruiterInvoiceDetail from '@/pages/RecruiterInvoiceDetail'

// Pages - Institutional Contact
import ContactLogin from '@/pages/ContactLogin'
import ContactRegister from '@/pages/ContactRegister'
import ContactDashboard from '@/pages/ContactDashboard'
import ContactRequestDetail from '@/pages/ContactRequestDetail'

// Pages - Public (no auth required)
import PayInvoice from '@/pages/PayInvoice'

// Pages - Free Tools (public, no auth required)
import ToolsHome from '@/pages/tools/ToolsHome'
import MergePdf from '@/pages/tools/pdf/MergePdf'
import CompressPdf from '@/pages/tools/pdf/CompressPdf'
import SplitPdf from '@/pages/tools/pdf/SplitPdf'
import ImageToPdf from '@/pages/tools/pdf/ImageToPdf'
import RotatePdf from '@/pages/tools/pdf/RotatePdf'
import CompressImage from '@/pages/tools/image/CompressImage'
import ConvertImage from '@/pages/tools/image/ConvertImage'
import ResizeImage from '@/pages/tools/image/ResizeImage'
import HeicToJpg from '@/pages/tools/image/HeicToJpg'
import PasswordGenerator from '@/pages/tools/utility/PasswordGenerator'
import QrCodeGenerator from '@/pages/tools/utility/QrCodeGenerator'

// Layout wrapper for authenticated pages
function ProtectedRoute({ children, session }: { children: React.ReactNode; session: Session | null }) {
    if (!session) {
        return <Navigate to="/login" replace />
    }
    return <>{children}</>
}

// Role-based redirect component - redirects to correct dashboard based on user type
function RoleBasedRedirect() {
    const [redirectPath, setRedirectPath] = useState<string | null>(null)
    const [checking, setChecking] = useState(true)

    useEffect(() => {
        const checkUserType = async () => {
            try {
                const { data: userInfo } = await getPortalUserInfo()
                if (userInfo?.user_type === 'recruiter') {
                    setRedirectPath('/recruiter/dashboard')
                } else if (userInfo?.user_type === 'institutional_contact') {
                    setRedirectPath('/contact/dashboard')
                } else {
                    setRedirectPath('/dashboard')
                }
            } catch {
                setRedirectPath('/dashboard')
            }
            setChecking(false)
        }
        checkUserType()
    }, [])

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
        )
    }

    return <Navigate to={redirectPath || '/dashboard'} replace />
}

// Component to handle hash-based auth tokens at any route
function AuthHashHandler({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate()
    const location = useLocation()
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        const handleHashTokens = async () => {
            // Check if URL has hash with auth tokens
            const hash = window.location.hash
            if (hash && hash.includes('access_token')) {
                setProcessing(true)
                // Redirect to auth callback with the hash preserved
                navigate(`/auth/callback${hash}`, { replace: true })
            }
        }

        handleHashTokens()
    }, [location, navigate])

    if (processing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                    <p className="text-slate-600">Processing authentication...</p>
                </div>
            </div>
        )
    }

    return <>{children}</>
}

export default function App() {
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check for hash tokens on initial load (magic link redirect)
        const hash = window.location.hash
        if (hash && hash.includes('access_token')) {
            // Let AuthHashHandler deal with it
            setLoading(false)
            return
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => subscription.unsubscribe()
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                    <p className="text-slate-600">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <ThemeProvider>
            <WalkthroughProvider>
                <AuthHashHandler>
                    <Routes>
                {/* Homepage - public landing page */}
                <Route path="/" element={session ? <RoleBasedRedirect /> : <Homepage />} />

                {/* Public routes */}
                <Route path="/login" element={session ? <RoleBasedRedirect /> : <Login />} />
                <Route path="/register" element={session ? <RoleBasedRedirect /> : <Register />} />
                <Route path="/recruiter/login" element={session ? <Navigate to="/recruiter/dashboard" replace /> : <RecruiterLogin />} />
                <Route path="/recruiter/register" element={session ? <Navigate to="/recruiter/dashboard" replace /> : <RecruiterRegister />} />
                <Route path="/contact/login" element={session ? <Navigate to="/contact/dashboard" replace /> : <ContactLogin />} />
                <Route path="/contact/register" element={session ? <Navigate to="/contact/dashboard" replace /> : <ContactRegister />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/accept-invite" element={<AcceptInvite />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/support" element={<Support />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/support/refund-policy" element={<RefundPolicy />} />

                {/* Public payment page - no auth required */}
                <Route path="/pay/:invoiceId" element={<PayInvoice />} />

                {/* Free Tools - Public, no auth required */}
                <Route path="/tools" element={<ToolsHome />} />
                <Route path="/tools/pdf/merge" element={<MergePdf />} />
                <Route path="/tools/pdf/compress" element={<CompressPdf />} />
                <Route path="/tools/pdf/split" element={<SplitPdf />} />
                <Route path="/tools/pdf/from-image" element={<ImageToPdf />} />
                <Route path="/tools/pdf/rotate" element={<RotatePdf />} />
                <Route path="/tools/image/compress" element={<CompressImage />} />
                <Route path="/tools/image/convert" element={<ConvertImage />} />
                <Route path="/tools/image/resize" element={<ResizeImage />} />
                <Route path="/tools/image/heic-to-jpg" element={<HeicToJpg />} />
                <Route path="/tools/utility/password" element={<PasswordGenerator />} />
                <Route path="/tools/utility/qr-code" element={<QrCodeGenerator />} />

                {/* Protected routes - Applicant */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute session={session}>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/case/:caseId"
                    element={
                        <ProtectedRoute session={session}>
                            <CaseView />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/documents"
                    element={
                        <ProtectedRoute session={session}>
                            <Documents />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute session={session}>
                            <Settings />
                        </ProtectedRoute>
                    }
                />

                {/* Protected routes - Recruiter */}
                <Route
                    path="/recruiter/dashboard"
                    element={
                        <ProtectedRoute session={session}>
                            <RecruiterDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/recruiter/case/:caseId"
                    element={
                        <ProtectedRoute session={session}>
                            <RecruiterCaseView />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/recruiter/invoices"
                    element={
                        <ProtectedRoute session={session}>
                            <RecruiterInvoices />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/recruiter/invoice/:invoiceId"
                    element={
                        <ProtectedRoute session={session}>
                            <RecruiterInvoiceDetail />
                        </ProtectedRoute>
                    }
                />

                {/* Protected routes - Institutional Contact */}
                <Route
                    path="/contact/dashboard"
                    element={
                        <ProtectedRoute session={session}>
                            <ContactDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/contact/request/:id"
                    element={
                        <ProtectedRoute session={session}>
                            <ContactRequestDetail />
                        </ProtectedRoute>
                    }
                />

                    {/* Default redirect */}
                    <Route path="*" element={session ? <RoleBasedRedirect /> : <Navigate to="/" replace />} />
                    </Routes>
                </AuthHashHandler>
                <WalkthroughOverlay />
            </WalkthroughProvider>
        </ThemeProvider>
    )
}
