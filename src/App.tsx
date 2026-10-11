import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import { supabase, getPortalUserInfo } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { WalkthroughProvider, useWalkthrough } from '@/contexts/WalkthroughContext'

import Homepage from '@/pages/Homepage'

// Load each page only when its route is opened.
const Updates = lazy(() => import('@/pages/portal/Updates'))
const WalkthroughOverlay = lazy(() => import('@/components/WalkthroughOverlay'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const AuthCallback = lazy(() => import('@/pages/AuthCallback'))
const Home = lazy(() => import('@/pages/portal/Home'))
const Applications = lazy(() => import('@/pages/portal/Applications'))
const ApplicationView = lazy(() => import('@/pages/portal/ApplicationView'))
const Payments = lazy(() => import('@/pages/portal/Payments'))
const Help = lazy(() => import('@/pages/portal/Help'))
const AcceptInvite = lazy(() => import('@/pages/AcceptInvite'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const FAQ = lazy(() => import('@/pages/FAQ'))
const DocumentsPage = lazy(() => import('@/pages/portal/DocumentsPage'))
const AccountSettings = lazy(() => import('@/pages/portal/AccountSettings'))
const Support = lazy(() => import('@/pages/Support'))
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('@/pages/TermsOfService'))
const RefundPolicy = lazy(() => import('@/pages/RefundPolicy'))
const VerificationFeeChecker = lazy(() => import('@/pages/VerificationFeeChecker'))
const RecruiterLogin = lazy(() => import('@/pages/RecruiterLogin'))
const RecruiterRegister = lazy(() => import('@/pages/RecruiterRegister'))
const RecruiterDashboard = lazy(() => import('@/pages/RecruiterDashboard'))
const RecruiterCaseView = lazy(() => import('@/pages/RecruiterCaseView'))
const RecruiterInvoices = lazy(() => import('@/pages/RecruiterInvoices'))
const RecruiterInvoiceDetail = lazy(() => import('@/pages/RecruiterInvoiceDetail'))
const ContactLogin = lazy(() => import('@/pages/ContactLogin'))
const ContactRegister = lazy(() => import('@/pages/ContactRegister'))
const ContactDashboard = lazy(() => import('@/pages/ContactDashboard'))
const ContactRequestDetail = lazy(() => import('@/pages/ContactRequestDetail'))
const PayInvoice = lazy(() => import('@/pages/PayInvoice'))
const ToolsHome = lazy(() => import('@/pages/tools/ToolsHome'))
const MergePdf = lazy(() => import('@/pages/tools/pdf/MergePdf'))
const CompressPdf = lazy(() => import('@/pages/tools/pdf/CompressPdf'))
const SplitPdf = lazy(() => import('@/pages/tools/pdf/SplitPdf'))
const ImageToPdf = lazy(() => import('@/pages/tools/pdf/ImageToPdf'))
const RotatePdf = lazy(() => import('@/pages/tools/pdf/RotatePdf'))
const CompressImage = lazy(() => import('@/pages/tools/image/CompressImage'))
const ConvertImage = lazy(() => import('@/pages/tools/image/ConvertImage'))
const ResizeImage = lazy(() => import('@/pages/tools/image/ResizeImage'))
const HeicToJpg = lazy(() => import('@/pages/tools/image/HeicToJpg'))
const PasswordGenerator = lazy(() => import('@/pages/tools/utility/PasswordGenerator'))
const QrCodeGenerator = lazy(() => import('@/pages/tools/utility/QrCodeGenerator'))
const ReferralLayout = lazy(() => import('@/pages/referral/ReferralLayout'))
const ReferralOverview = lazy(() => import('@/pages/referral/ReferralOverview'))
const ReferralList = lazy(() => import('@/pages/referral/ReferralList'))
const ReferralEarnings = lazy(() => import('@/pages/referral/ReferralEarnings'))
const ReferralInvite = lazy(() => import('@/pages/referral/ReferralInvite'))
const ReferralJoin = lazy(() => import('@/pages/referral/ReferralJoin'))
const ReferralLanding = lazy(() => import('@/pages/referral/ReferralLanding'))

function PageLoading() {
    return <div role="status" className="min-h-[40vh] flex items-center justify-center text-slate-600">Loading page…</div>
}

function ActiveWalkthrough() {
    const { isActive } = useWalkthrough()
    return isActive ? <Suspense fallback={null}><WalkthroughOverlay /></Suspense> : null
}

// Public pages can render while an existing session is being restored.
function isPublicPage(path: string) {
    return ['/', '/login', '/register', '/recruiter/login', '/recruiter/register',
        '/contact/login', '/contact/register', '/auth/callback', '/accept-invite',
        '/forgot-password', '/reset-password', '/faq', '/support', '/privacy',
        '/terms', '/refund-policy', '/verification-fees', '/referral/join'].includes(path)
        || path.startsWith('/tools') || path.startsWith('/support/')
        || path.startsWith('/pay/') || path.startsWith('/r/')
}

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
                } else if (userInfo?.user_type === 'referrer') {
                    setRedirectPath('/referral')
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
                // Password-recovery links carry type=recovery — send them to the
                // reset-password screen instead of logging straight into the dashboard.
                if (hash.includes('type=recovery')) {
                    if (location.pathname !== '/reset-password') {
                        navigate(`/reset-password${hash}`, { replace: true })
                    }
                    return
                }
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
    const { pathname } = useLocation()
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
        }).catch(() => {
            setSession(null)
            setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    if (loading && !isPublicPage(pathname)) {
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
                    <Suspense fallback={<PageLoading />}>
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
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/support" element={<Support />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/support/refund-policy" element={<RefundPolicy />} />
                <Route path="/support/verification-fees" element={<VerificationFeeChecker />} />
                <Route path="/verification-fees" element={<VerificationFeeChecker />} />

                {/* Referral programme — public joining form and referred-person landing */}
                <Route path="/referral/join" element={<ReferralJoin />} />
                <Route path="/r/:code" element={<ReferralLanding />} />

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
                <Route path="/updates" element={<ProtectedRoute session={session}><Updates /></ProtectedRoute>} />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute session={session}>
                            <Home />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/applications"
                    element={
                        <ProtectedRoute session={session}>
                            <Applications />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/payments"
                    element={
                        <ProtectedRoute session={session}>
                            <Payments />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/help"
                    element={
                        <ProtectedRoute session={session}>
                            <Help />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/case/:caseId"
                    element={
                        <ProtectedRoute session={session}>
                            <ApplicationView />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/documents"
                    element={
                        <ProtectedRoute session={session}>
                            <DocumentsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute session={session}>
                            <AccountSettings />
                        </ProtectedRoute>
                    }
                />

                {/* Protected routes - Referrer (referral programme) */}
                <Route
                    path="/referral"
                    element={
                        <ProtectedRoute session={session}>
                            <ReferralLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<ReferralOverview />} />
                    <Route path="referrals" element={<ReferralList />} />
                    <Route path="earnings" element={<ReferralEarnings />} />
                    <Route path="invite" element={<ReferralInvite />} />
                </Route>

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
                    </Suspense>
                </AuthHashHandler>
                <ActiveWalkthrough />
            </WalkthroughProvider>
        </ThemeProvider>
    )
}
