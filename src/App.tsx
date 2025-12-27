import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'

// Pages
import Login from '@/pages/Login'
import AuthCallback from '@/pages/AuthCallback'
import Dashboard from '@/pages/Dashboard'
import CaseView from '@/pages/CaseView'

// Layout wrapper for authenticated pages
function ProtectedRoute({ children, session }: { children: React.ReactNode; session: Session | null }) {
    if (!session) {
        return <Navigate to="/login" replace />
    }
    return <>{children}</>
}

export default function App() {
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
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
        <Routes>
            {/* Public routes */}
            <Route path="/login" element={session ? <Navigate to="/dashboard\" replace /> : <Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

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
    )
}
