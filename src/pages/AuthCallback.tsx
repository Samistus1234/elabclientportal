import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
    const navigate = useNavigate()

    useEffect(() => {
        // Handle the auth callback
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                navigate('/dashboard', { replace: true })
            } else if (event === 'SIGNED_OUT') {
                navigate('/login', { replace: true })
            }
        })

        // Also check immediately in case the event already fired
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                navigate('/dashboard', { replace: true })
            }
        })
    }, [navigate])

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                <p className="text-slate-600">Signing you in...</p>
            </div>
        </div>
    )
}
