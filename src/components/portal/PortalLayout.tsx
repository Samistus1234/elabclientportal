import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Layers, FileText, CreditCard, LifeBuoy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getMyPerson, getMyWaitingCases, type MyPerson } from '@/lib/portalData'
import '@/portal-v2.css'

const NAV = [
    { to: '/dashboard', label: 'Home', icon: Home },
    { to: '/applications', label: 'Applications', icon: Layers },
    { to: '/documents', label: 'Documents', icon: FileText },
    { to: '/payments', label: 'Payments', icon: CreditCard },
    { to: '/help', label: 'Help', icon: LifeBuoy },
]

/** The signed-in applicant's frame: top bar on desktop, tab bar on phones. */
export default function PortalLayout({ children }: { children: ReactNode }) {
    const navigate = useNavigate()
    const { pathname } = useLocation()
    // An application page (/case/:id) belongs to the Applications tab.
    const isOn = (to: string) =>
        pathname === to || pathname.startsWith(`${to}/`) || (to === '/applications' && pathname.startsWith('/case/'))
    const [person, setPerson] = useState<MyPerson | null>(null)
    const [menuOpen, setMenuOpen] = useState(false)
    const [waitingCount, setWaitingCount] = useState(0)
    const menuRef = useRef<HTMLDivElement>(null)
    const avatarRef = useRef<HTMLButtonElement>(null)

    // Fetched per mount (no module cache): on a shared device, the next person to
    // sign in must never see the previous client's name in the account menu.
    useEffect(() => {
        let alive = true
        getMyPerson().then((p) => alive && setPerson(p)).catch(() => undefined)
        // Badge the Documents tab while eLab is waiting on the client.
        getMyWaitingCases().then((w) => alive && setWaitingCount(w.length)).catch(() => undefined)
        return () => {
            alive = false
        }
    }, [])

    useEffect(() => {
        if (!menuOpen) return
        const close = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setMenuOpen(false)
                avatarRef.current?.focus()
            }
        }
        document.addEventListener('mousedown', close)
        document.addEventListener('keydown', onKey)
        menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
        return () => {
            document.removeEventListener('mousedown', close)
            document.removeEventListener('keydown', onKey)
        }
    }, [menuOpen])

    const initials =
        `${person?.first_name?.[0] ?? ''}${person?.last_name?.[0] ?? ''}`.toUpperCase() || '•'

    const signOut = async () => {
        await supabase.auth.signOut()
        navigate('/login', { replace: true })
    }

    return (
        <div className="pl">
            <header className="pl-bar">
                <div className="pl-bar-in">
                    <Link to="/dashboard" className="pl-logo" aria-label="eLab home">
                        <img src="/elab-logo.png" alt="eLab Solutions International" />
                    </Link>
                    <nav className="pl-nav" aria-label="Main">
                        {NAV.map((n) => (
                            <Link key={n.to} to={n.to} className={isOn(n.to) ? 'on' : ''} aria-current={isOn(n.to) ? 'page' : undefined}>
                                {n.label}
                                {n.to === '/documents' && waitingCount > 0 && <span className="pl-badge" aria-label="needs your attention" />}
                            </Link>
                        ))}
                    </nav>
                    <div ref={menuRef} style={{ marginLeft: 'auto', position: 'relative' }}>
                        <button
                            ref={avatarRef}
                            type="button"
                            className="pl-avatar"
                            aria-label="Account"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            onClick={() => setMenuOpen((o) => !o)}
                        >
                            {initials}
                        </button>
                        {menuOpen && (
                            <div className="pl-menu" role="menu">
                                {person && (
                                    <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--pl-line)', marginBottom: 4 }}>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                                            {[person.first_name, person.last_name].filter(Boolean).join(' ')}
                                        </div>
                                        <div className="pl-row-sub">{person.email}</div>
                                    </div>
                                )}
                                <Link to="/settings" role="menuitem" onClick={() => setMenuOpen(false)}>Settings</Link>
                                <button type="button" role="menuitem" onClick={signOut}>Sign out</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="pl-main">{children}</main>

            <nav className="pl-tabs" aria-label="Main">
                {NAV.map((n) => (
                    <Link key={n.to} to={n.to} className={isOn(n.to) ? 'on' : ''} aria-current={isOn(n.to) ? 'page' : undefined}>
                        <n.icon className="w-6 h-6" strokeWidth={1.8} aria-hidden />
                        {n.label}
                        {n.to === '/documents' && waitingCount > 0 && <span className="pl-badge" aria-label="needs your attention" />}
                    </Link>
                ))}
            </nav>
        </div>
    )
}
