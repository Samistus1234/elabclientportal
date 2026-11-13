import AuthShell from '@/components/AuthShell'
import { useState } from 'react'
import { signInWithPassword, getPortalUserInfo } from '@/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'
import { useLocation, Link } from 'react-router-dom'

export default function Login() {
    // Set by Register after sign-up ("Account created…", "You already have an account…").
    const notice = (useLocation().state as { message?: string } | null)?.message
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const { error, session } = await signInWithPassword(email, password)

        if (error) {
            setError(error.message)
            setIsLoading(false)
        } else if (session) {
            // Full page load into the destination: the app's route guard reads the
            // session on load. A client-side navigate() ran before the guard had
            // seen the new session and bounced back to /login.
            const go = (path: string) => window.location.replace(path)
            try {
                const { data: userInfo } = await getPortalUserInfo()
                if (userInfo?.user_type === 'recruiter') {
                    go('/recruiter/dashboard')
                } else if (userInfo?.user_type === 'institutional_contact') {
                    go('/contact/dashboard')
                } else if (userInfo?.user_type === 'referrer') {
                    go('/referral')
                } else {
                    go('/dashboard')
                }
            } catch {
                go('/dashboard')
            }
        } else {
            setError('Login failed. Please try again.')
            setIsLoading(false)
        }
    }

    return (
        <AuthShell>
            <div className="auth-title">
                <h1>Sign in to eLab.</h1>
                <p>Check your applications, documents and messages from the team.</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-card">
                {notice && !error && <div role="status" className="auth-msg auth-msg-ok">{notice}</div>}

                <div className="auth-field">
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="auth-input"
                    />
                </div>

                <div className="auth-field">
                    <label htmlFor="password">Password</label>
                    <div className="auth-pw">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            required
                            className="auth-input"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
                        </button>
                    </div>
                </div>

                {error && <div role="alert" className="auth-msg auth-msg-err">{error}</div>}

                <button type="submit" className="auth-submit" disabled={isLoading || !email || !password}>
                    {isLoading ? <span className="auth-spinner" role="status" aria-label="Signing in" /> : 'Sign in'}
                </button>
                <Link to="/forgot-password" className="auth-forgot">Forgot password?</Link>
            </form>

            <div className="auth-first">
                <p>First time here?</p>
                <Link to="/register">Activate your account with your case reference ›</Link>
            </div>

            <div className="auth-partners">
                <p>Recruiter, institution or referral partner?</p>
                <div>
                    <Link to="/recruiter/register">Recruiter sign-up</Link>
                    <Link to="/contact/register">Institution sign-up</Link>
                    <Link to="/referral/join">Referral programme</Link>
                </div>
            </div>
        </AuthShell>
    )
}
