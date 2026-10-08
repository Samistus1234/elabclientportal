import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PortalLayout from '@/components/portal/PortalLayout'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/contexts/ThemeContext'
import { getMyPerson, type MyPerson } from '@/lib/portalData'

const THEMES = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'Match my device' },
] as const

export default function AccountSettings() {
    const navigate = useNavigate()
    const { preferences, setTheme } = useTheme()
    const [person, setPerson] = useState<MyPerson | null>(null)
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

    useEffect(() => {
        getMyPerson().then(setPerson).catch(() => undefined)
    }, [])

    const changePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setMsg(null)
        if (password.length < 8) return setMsg({ ok: false, text: 'Use at least 8 characters.' })
        if (password !== confirm) return setMsg({ ok: false, text: 'The two passwords do not match.' })
        setSaving(true)
        const { error } = await supabase.auth.updateUser({ password })
        setSaving(false)
        if (error) {
            setMsg({
                ok: false,
                text: /reauth|recent/i.test(error.message)
                    ? 'For your security, sign out and sign in again, then change your password.'
                    : error.message,
            })
            return
        }
        setPassword('')
        setConfirm('')
        setMsg({ ok: true, text: 'Password changed. Use the new one next time you sign in.' })
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        navigate('/login', { replace: true })
    }

    return (
        <PortalLayout>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 620 }}>
                <h1 className="pl-h1">Settings</h1>

                <section className="pl-card" aria-labelledby="acc-h">
                    <div className="pl-card-h"><h2 id="acc-h">Your details</h2></div>
                    <div className="pl-row"><div className="pl-row-t"><div className="pl-row-sub" style={{ marginTop: 0 }}>Name</div><div className="pl-row-title">{[person?.first_name, person?.last_name].filter(Boolean).join(' ') || '—'}</div></div></div>
                    <div className="pl-row"><div className="pl-row-t"><div className="pl-row-sub" style={{ marginTop: 0 }}>Email</div><div className="pl-row-title">{person?.email || '—'}</div></div></div>
                    {person?.phone && <div className="pl-row"><div className="pl-row-t"><div className="pl-row-sub" style={{ marginTop: 0 }}>Phone</div><div className="pl-row-title">{person.phone}</div></div></div>}
                    <div className="pl-row" style={{ fontSize: 13, color: 'var(--pl-muted)' }}>
                        To change these, message us on WhatsApp or from Help — they're the details on your applications.
                    </div>
                </section>

                <form className="pl-card pl-card-pad" onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h2 className="pl-card-title">Change password</h2>
                    <div>
                        <label className="pl-label" htmlFor="pw1">New password</label>
                        <input id="pw1" type="password" className="pl-input" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
                    </div>
                    <div>
                        <label className="pl-label" htmlFor="pw2">Confirm new password</label>
                        <input id="pw2" type="password" className="pl-input" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
                    </div>
                    {msg && <div className={`pl-alert ${msg.ok ? 'pl-alert-green' : 'pl-alert-red'}`} role="status">{msg.text}</div>}
                    <div><button type="submit" className="pl-btn" disabled={saving || !password || !confirm}>{saving ? 'Saving…' : 'Change password'}</button></div>
                </form>

                <section className="pl-card pl-card-pad">
                    <h2 className="pl-card-title" style={{ marginBottom: 10 }}>Appearance</h2>
                    <div className="pl-seg" role="radiogroup" aria-label="Appearance">
                        {THEMES.map((t) => (
                            <button
                                key={t.value}
                                type="button"
                                role="radio"
                                aria-checked={preferences.theme === t.value}
                                className={preferences.theme === t.value ? 'on' : ''}
                                onClick={() => setTheme(t.value)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div className="pl-row-sub" style={{ marginTop: 8 }}>Saved on this device.</div>
                </section>

                <div><button type="button" className="pl-btn2" onClick={signOut}>Sign out</button></div>
            </div>
        </PortalLayout>
    )
}
