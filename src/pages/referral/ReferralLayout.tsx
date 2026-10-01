import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import Brand from '@/components/Brand'
import { useTheme } from '@/contexts/ThemeContext'
import { signOut } from '@/lib/supabase'

/**
 * Shell for the referrer area of the client portal.
 *
 * Four destinations only — the previous seven-item sidebar had three items that
 * rendered the same screen and two that rendered nothing.
 */
export default function ReferralLayout() {
    const navigate = useNavigate()
    const { isDark } = useTheme()
    const [menuOpen, setMenuOpen] = useState(false)

    useEffect(() => { document.title = 'Referral programme · ELAB' }, [])
    useEffect(() => { setMenuOpen(false) }, [navigate])

    const handleSignOut = async () => {
        await signOut()
        navigate('/login', { replace: true })
    }

    const links = [
        { to: '/referral', label: 'Overview', end: true },
        { to: '/referral/referrals', label: 'Referrals' },
        { to: '/referral/earnings', label: 'Earnings' },
        { to: '/referral/invite', label: 'Invite' },
    ]

    return (
        <div className={`portal-inner inner-referral ${isDark ? 'inner-dark' : ''}`}>
            <header className="referral-header">
                <div className="referral-header-inner">
                    <NavLink to="/referral" aria-label="ELAB referral programme"><Brand /></NavLink>
                    <nav aria-label="Referral sections" className={menuOpen ? 'is-open' : ''}>
                        {links.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end={link.end}
                                className={({ isActive }) => (isActive ? 'is-active' : '')}
                            >
                                {link.label}
                            </NavLink>
                        ))}
                    </nav>
                    <div className="referral-header-actions">
                        <NavLink to="/dashboard" className="referral-quiet-link">My applications</NavLink>
                        <button type="button" className="referral-quiet-link" onClick={handleSignOut}>
                            <LogOut size={14} /> Sign out
                        </button>
                        <button
                            type="button"
                            className="referral-menu-toggle"
                            aria-expanded={menuOpen}
                            aria-label="Toggle referral navigation"
                            onClick={() => setMenuOpen((open) => !open)}
                        >
                            {menuOpen ? 'Close' : 'Menu'}
                        </button>
                    </div>
                </div>
            </header>
            <main className="referral-main">
                <Outlet />
            </main>
            <footer className="access-footer">
                <span>© {new Date().getFullYear()} ELAB Solutions International</span>
                <nav>
                    <NavLink to="/support">Support</NavLink>
                    <NavLink to="/privacy">Privacy</NavLink>
                    <NavLink to="/terms">Terms</NavLink>
                </nav>
            </footer>
        </div>
    )
}
