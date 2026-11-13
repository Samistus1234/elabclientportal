import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import '@/auth-v2.css'

/**
 * The frame around sign-in, activation, password reset and the partner sign-up
 * pages: logo, one centred column, a quiet footer (Apple-style, Nov 2026).
 * `portal-access` is kept so the older forms inside still get their resets.
 */
export default function AuthShell({ children }: { children: ReactNode }) {
    return <div className="portal-access auth-v2">
        <header className="auth-header">
            <Link to="/" aria-label="eLab home"><img src="/elab-logo-blue.png" alt="eLab Solutions International" width="148" height="28" /></Link>
            <Link to="/" className="auth-back">Back to home</Link>
        </header>
        <main className="auth-main">{children}</main>
        <footer className="auth-footer">
            <span>Need help? <Link to="/support">Contact support</Link> or <a href="https://wa.me/2348165634195">WhatsApp us</a></span>
            <nav aria-label="Legal"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></nav>
        </footer>
    </div>
}
