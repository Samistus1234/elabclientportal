import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'

// Pages
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import AuthCallback from '@/pages/AuthCallback'
import Dashboard from '@/pages/Dashboard'
import CaseView from '@/pages/CaseView'
import AcceptInvite from '@/pages/AcceptInvite'

// Layout wrapper for authenticated pages
function ProtectedRoute({ children, session }: { children: React.ReactNode; session: Session | null }) {
    if (!session) {
        return <Navigate to="/login" replace />
    }
    return <>{children}</>
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
        <AuthHashHandler>
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
                <Route path="/register" element={session ? <Navigate to="/dashboard" replace /> : <Register />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/accept-invite" element={<AcceptInvite />} />

                {/* Protected routes */}
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

                {/* Default redirect */}
                <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
            </Routes>
        </AuthHashHandler>
    )
}
