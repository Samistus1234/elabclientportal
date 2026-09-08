import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Brand from './Brand'

export default function AuthShell({ children }: { children: ReactNode }) {
    return <div className="portal-access">
        <header className="access-header"><Link to="/" aria-label="ELAB home"><Brand /></Link><Link to="/"><ArrowLeft size={15} />Back to home</Link></header>
        <main className="access-layout">
            <aside className="access-introduction"><p>ELAB CLIENT PORTAL</p><h1>Your applications,<br />with ELAB.</h1><p>Check your licensing and verification progress, review documents and contact the team handling your case.</p><div><strong>First time signing in?</strong><p>Your welcome email contains the reference you need to activate your account.</p><Link to="/support">Help with account access →</Link></div></aside>
            {children}
        </main>
        <footer className="access-footer"><span>© {new Date().getFullYear()} ELAB Solutions International</span><nav><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/support">Support</Link></nav></footer>
    </div>
}
