import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
    const navigate = useNavigate()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // Check if there's a hash with tokens (magic link format)
                const hashParams = new URLSearchParams(window.location.hash.substring(1))
                const accessToken = hashParams.get('access_token')
                const refreshToken = hashParams.get('refresh_token')

                if (accessToken && refreshToken) {
                    // Set the session using the tokens from the URL
                    const { data, error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    })

                    if (sessionError) {
                        console.error('Session error:', sessionError)
                        setError(sessionError.message)
                        return
                    }

                    if (data.session) {
                        // Clear the hash from URL for security
                        window.history.replaceState(null, '', window.location.pathname)
                        navigate('/dashboard', { replace: true })
                        return
                    }
                }

                // Check for existing session
                const { data: { session } } = await supabase.auth.getSession()
                if (session) {
                    navigate('/dashboard', { replace: true })
                    return
                }

                // No session found, redirect to login
                setTimeout(() => {
                    navigate('/login', { replace: true })
                }, 2000)

            } catch (err: any) {
                console.error('Auth callback error:', err)
                setError(err.message || 'Authentication failed')
            }
        }

        handleAuthCallback()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                navigate('/dashboard', { replace: true })
            }
        })

        return () => subscription.unsubscribe()
    }, [navigate])

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
                <div className="flex flex-col items-center gap-4 text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800">Authentication Error</h2>
                    <p className="text-slate-600">{error}</p>
                    <button
                        onClick={() => navigate('/login', { replace: true })}
                        className="mt-4 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                <p className="text-slate-600">Signing you in...</p>
                <p className="text-slate-400 text-sm">Please wait while we verify your credentials</p>
            </div>
        </div>
    )
}
