import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Copy, RefreshCw, Check, Eye, EyeOff } from 'lucide-react'
import ToolsLayout from '@/components/tools/ToolsLayout'

interface PasswordOptions {
    length: number
    uppercase: boolean
    lowercase: boolean
    numbers: boolean
    symbols: boolean
}

const generatePassword = (options: PasswordOptions): string => {
    let chars = ''
    if (options.uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    if (options.lowercase) chars += 'abcdefghijklmnopqrstuvwxyz'
    if (options.numbers) chars += '0123456789'
    if (options.symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'

    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz'

    let password = ''
    const array = new Uint32Array(options.length)
    crypto.getRandomValues(array)

    for (let i = 0; i < options.length; i++) {
        password += chars[array[i] % chars.length]
    }

    return password
}

const calculateStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (password.length >= 16) score++
    if (/[a-z]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^a-zA-Z0-9]/.test(password)) score++

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' }
    if (score <= 4) return { score, label: 'Fair', color: 'bg-yellow-500' }
    if (score <= 5) return { score, label: 'Good', color: 'bg-blue-500' }
    return { score, label: 'Strong', color: 'bg-green-500' }
}

export default function PasswordGenerator() {
    const [options, setOptions] = useState<PasswordOptions>({
        length: 16,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true
    })
    const [password, setPassword] = useState(() => generatePassword({
        length: 16,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true
    }))
    const [copied, setCopied] = useState(false)
    const [showPassword, setShowPassword] = useState(true)

    const regenerate = useCallback(() => {
        setPassword(generatePassword(options))
        setCopied(false)
    }, [options])

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(password)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const handleOptionChange = (key: keyof PasswordOptions, value: boolean | number) => {
        const newOptions = { ...options, [key]: value }
        setOptions(newOptions)
        setPassword(generatePassword(newOptions))
        setCopied(false)
    }

    const strength = calculateStrength(password)

    return (
        <ToolsLayout
            title="Password Generator"
            description="Generate secure random passwords for your accounts"
        >
            <div className="space-y-8">
                {/* Generated Password */}
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">
                        Generated Password
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            readOnly
                            value={password}
                            className="w-full px-4 py-4 pr-24 text-lg font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
                                title={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5 text-slate-500" />
                                ) : (
                                    <Eye className="w-5 h-5 text-slate-500" />
                                )}
                            </button>
                            <button
                                onClick={copyToClipboard}
                                className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
                                title="Copy to clipboard"
                            >
                                {copied ? (
                                    <Check className="w-5 h-5 text-green-500" />
                                ) : (
                                    <Copy className="w-5 h-5 text-slate-500" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Strength indicator */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(strength.score / 7) * 100}%` }}
                                className={`h-full ${strength.color} rounded-full`}
                            />
                        </div>
                        <span className={`text-sm font-medium ${
                            strength.label === 'Weak' ? 'text-red-600' :
                            strength.label === 'Fair' ? 'text-yellow-600' :
                            strength.label === 'Good' ? 'text-blue-600' : 'text-green-600'
                        }`}>
                            {strength.label}
                        </span>
                    </div>
                </div>

                {/* Regenerate Button */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={regenerate}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-200 hover:shadow-xl transition-shadow"
                >
                    <RefreshCw className="w-5 h-5" />
                    Generate New Password
                </motion.button>

                {/* Options */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-800">Options</h3>

                    {/* Length Slider */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-700">
                                Password Length
                            </label>
                            <span className="text-sm font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                {options.length}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="8"
                            max="64"
                            value={options.length}
                            onChange={(e) => handleOptionChange('length', parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>8</span>
                            <span>64</span>
                        </div>
                    </div>

                    {/* Character Type Toggles */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { key: 'uppercase', label: 'Uppercase (A-Z)' },
                            { key: 'lowercase', label: 'Lowercase (a-z)' },
                            { key: 'numbers', label: 'Numbers (0-9)' },
                            { key: 'symbols', label: 'Symbols (!@#$)' }
                        ].map(({ key, label }) => (
                            <label
                                key={key}
                                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={options[key as keyof PasswordOptions] as boolean}
                                    onChange={(e) => handleOptionChange(key as keyof PasswordOptions, e.target.checked)}
                                    className="w-5 h-5 text-primary-500 rounded border-slate-300 focus:ring-primary-500"
                                />
                                <span className="text-sm text-slate-700">{label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </ToolsLayout>
    )
}
