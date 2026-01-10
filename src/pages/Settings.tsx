import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
    ArrowLeft,
    Sun,
    Moon,
    Monitor,
    Bell,
    BellOff,
    Mail,
    MessageSquare,
    Camera,
    User,
    Check,
    LogOut,
    Shield,
    Palette
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'

export default function Settings() {
    const navigate = useNavigate()
    const { preferences, setTheme, updatePreferences, isDark } = useTheme()
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/login')
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                updatePreferences({ profileImage: reader.result as string })
                showSavedFeedback()
            }
            reader.readAsDataURL(file)
        }
    }

    const showSavedFeedback = () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    const handlePreferenceChange = (key: keyof typeof preferences, value: any) => {
        updatePreferences({ [key]: value })
        showSavedFeedback()
    }

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isDark
            ? 'bg-slate-900'
            : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
            }`}>
            {/* Header */}
            <header className={`${isDark ? 'bg-slate-800/80' : 'bg-white/80'} backdrop-blur-md border-b ${isDark ? 'border-slate-700' : 'border-slate-100/50'} sticky top-0 z-20`}>
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link
                                to="/dashboard"
                                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} transition-colors`}
                            >
                                <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
                            </Link>
                            <h1 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                Settings
                            </h1>
                        </div>
                        {saved && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm"
                            >
                                <Check className="w-4 h-4" />
                                Saved
                            </motion.div>
                        )}
                    </div>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                {/* Profile Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-sm p-6`}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-blue-100'} flex items-center justify-center`}>
                            <User className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        </div>
                        <div>
                            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Profile</h2>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Customize your profile picture</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className={`w-24 h-24 rounded-2xl ${isDark ? 'bg-slate-700' : 'bg-gradient-to-br from-primary-500 to-accent-500'} flex items-center justify-center overflow-hidden`}>
                                {preferences.profileImage ? (
                                    <img
                                        src={preferences.profileImage}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-10 h-10 text-white" />
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-500 hover:bg-primary-600 rounded-full flex items-center justify-center text-white shadow-lg transition-colors"
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>
                        <div>
                            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                Upload a profile picture to personalize your portal experience.
                            </p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className={`mt-2 text-sm font-medium ${isDark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}
                            >
                                Choose Image
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Theme Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-sm p-6`}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-purple-100'} flex items-center justify-center`}>
                            <Palette className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                        </div>
                        <div>
                            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Appearance</h2>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Choose your preferred theme</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { value: 'light', icon: Sun, label: 'Light' },
                            { value: 'dark', icon: Moon, label: 'Dark' },
                            { value: 'system', icon: Monitor, label: 'System' },
                        ].map(({ value, icon: Icon, label }) => (
                            <button
                                key={value}
                                onClick={() => {
                                    setTheme(value as 'light' | 'dark' | 'system')
                                    showSavedFeedback()
                                }}
                                className={`p-4 rounded-xl border-2 transition-all ${preferences.theme === value
                                    ? isDark
                                        ? 'border-primary-500 bg-primary-500/10'
                                        : 'border-primary-500 bg-primary-50'
                                    : isDark
                                        ? 'border-slate-700 hover:border-slate-600 bg-slate-700/50'
                                        : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                                    }`}
                            >
                                <Icon className={`w-6 h-6 mx-auto mb-2 ${preferences.theme === value
                                    ? 'text-primary-500'
                                    : isDark ? 'text-slate-400' : 'text-slate-500'
                                    }`} />
                                <span className={`text-sm font-medium ${preferences.theme === value
                                    ? 'text-primary-600'
                                    : isDark ? 'text-slate-300' : 'text-slate-600'
                                    }`}>
                                    {label}
                                </span>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Notifications Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-sm p-6`}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-amber-100'} flex items-center justify-center`}>
                            <Bell className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                        </div>
                        <div>
                            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Notifications</h2>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Manage how you receive updates</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Application Updates Toggle */}
                        <div className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                            <div className="flex items-center gap-3">
                                {preferences.receiveUpdates ? (
                                    <Bell className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                                ) : (
                                    <BellOff className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                                )}
                                <div>
                                    <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>Application Updates</p>
                                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Receive updates about your applications</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handlePreferenceChange('receiveUpdates', !preferences.receiveUpdates)}
                                className={`relative w-14 h-8 rounded-full transition-colors ${preferences.receiveUpdates
                                    ? 'bg-green-500'
                                    : isDark ? 'bg-slate-600' : 'bg-slate-300'
                                    }`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${preferences.receiveUpdates ? 'translate-x-7' : 'translate-x-1'
                                    }`} />
                            </button>
                        </div>

                        {/* Email Notifications Toggle */}
                        <div className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                            <div className="flex items-center gap-3">
                                <Mail className={`w-5 h-5 ${preferences.emailNotifications
                                    ? isDark ? 'text-blue-400' : 'text-blue-600'
                                    : isDark ? 'text-slate-500' : 'text-slate-400'
                                    }`} />
                                <div>
                                    <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>Email Notifications</p>
                                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Receive updates via email</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handlePreferenceChange('emailNotifications', !preferences.emailNotifications)}
                                className={`relative w-14 h-8 rounded-full transition-colors ${preferences.emailNotifications
                                    ? 'bg-blue-500'
                                    : isDark ? 'bg-slate-600' : 'bg-slate-300'
                                    }`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${preferences.emailNotifications ? 'translate-x-7' : 'translate-x-1'
                                    }`} />
                            </button>
                        </div>

                        {/* SMS Notifications Toggle */}
                        <div className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                            <div className="flex items-center gap-3">
                                <MessageSquare className={`w-5 h-5 ${preferences.smsNotifications
                                    ? isDark ? 'text-purple-400' : 'text-purple-600'
                                    : isDark ? 'text-slate-500' : 'text-slate-400'
                                    }`} />
                                <div>
                                    <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>SMS/WhatsApp Notifications</p>
                                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Receive updates via SMS or WhatsApp</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handlePreferenceChange('smsNotifications', !preferences.smsNotifications)}
                                className={`relative w-14 h-8 rounded-full transition-colors ${preferences.smsNotifications
                                    ? 'bg-purple-500'
                                    : isDark ? 'bg-slate-600' : 'bg-slate-300'
                                    }`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${preferences.smsNotifications ? 'translate-x-7' : 'translate-x-1'
                                    }`} />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Privacy Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-2xl shadow-sm p-6`}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-green-100'} flex items-center justify-center`}>
                            <Shield className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                        </div>
                        <div>
                            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Privacy & Security</h2>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Your data is protected</p>
                        </div>
                    </div>

                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        ELAB Solutions takes your privacy seriously. Your personal information is encrypted and securely stored. We never share your data with third parties without your consent.
                    </p>
                </motion.div>

                {/* Logout Button */}
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={handleLogout}
                    className={`w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 ${isDark
                        ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                        : 'border-red-200 text-red-600 hover:bg-red-50'
                        } transition-colors`}
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </motion.button>

                {/* Footer */}
                <p className={`text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Need help? Contact{' '}
                    <a href="mailto:headoffice@elabsolution.org" className="text-primary-600 hover:underline">
                        headoffice@elabsolution.org
                    </a>
                </p>
            </div>
        </div>
    )
}
