import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface UserPreferences {
    theme: 'light' | 'dark' | 'system'
    receiveUpdates: boolean
    emailNotifications: boolean
    smsNotifications: boolean
    profileImage: string | null
}

interface ThemeContextType {
    theme: 'light' | 'dark'
    preferences: UserPreferences
    setTheme: (theme: 'light' | 'dark' | 'system') => void
    updatePreferences: (updates: Partial<UserPreferences>) => void
    isDark: boolean
}

const defaultPreferences: UserPreferences = {
    theme: 'light',
    receiveUpdates: true,
    emailNotifications: true,
    smsNotifications: false,
    profileImage: null,
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [preferences, setPreferences] = useState<UserPreferences>(() => {
        // Load from localStorage on init
        const saved = localStorage.getItem('elab-portal-preferences')
        if (saved) {
            try {
                return { ...defaultPreferences, ...JSON.parse(saved) }
            } catch {
                return defaultPreferences
            }
        }
        return defaultPreferences
    })

    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

    // Handle system theme preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        const updateTheme = () => {
            if (preferences.theme === 'system') {
                setResolvedTheme(mediaQuery.matches ? 'dark' : 'light')
            } else {
                setResolvedTheme(preferences.theme)
            }
        }

        updateTheme()
        mediaQuery.addEventListener('change', updateTheme)
        return () => mediaQuery.removeEventListener('change', updateTheme)
    }, [preferences.theme])

    // Apply theme to document
    useEffect(() => {
        document.documentElement.classList.remove('light', 'dark')
        document.documentElement.classList.add(resolvedTheme)
        document.documentElement.setAttribute('data-theme', resolvedTheme)
    }, [resolvedTheme])

    // Save preferences to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('elab-portal-preferences', JSON.stringify(preferences))
    }, [preferences])

    const setTheme = (theme: 'light' | 'dark' | 'system') => {
        setPreferences(prev => ({ ...prev, theme }))
    }

    const updatePreferences = (updates: Partial<UserPreferences>) => {
        setPreferences(prev => ({ ...prev, ...updates }))
    }

    return (
        <ThemeContext.Provider
            value={{
                theme: resolvedTheme,
                preferences,
                setTheme,
                updatePreferences,
                isDark: resolvedTheme === 'dark',
            }}
        >
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
