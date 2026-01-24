import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Download, Link as LinkIcon, Type, Mail, Phone, Wifi } from 'lucide-react'
import QRCode from 'qrcode'
import ToolsLayout from '@/components/tools/ToolsLayout'

type QRType = 'url' | 'text' | 'email' | 'phone' | 'wifi'

interface WifiOptions {
    ssid: string
    password: string
    encryption: 'WPA' | 'WEP' | 'nopass'
}

export default function QrCodeGenerator() {
    const [qrType, setQrType] = useState<QRType>('url')
    const [content, setContent] = useState('')
    const [wifiOptions, setWifiOptions] = useState<WifiOptions>({
        ssid: '',
        password: '',
        encryption: 'WPA'
    })
    const [qrDataUrl, setQrDataUrl] = useState<string>('')
    const [fgColor, setFgColor] = useState('#000000')
    const [bgColor, setBgColor] = useState('#FFFFFF')
    const [size, setSize] = useState(300)

    const typeOptions = [
        { id: 'url', label: 'URL', icon: LinkIcon, placeholder: 'https://example.com' },
        { id: 'text', label: 'Text', icon: Type, placeholder: 'Enter any text...' },
        { id: 'email', label: 'Email', icon: Mail, placeholder: 'email@example.com' },
        { id: 'phone', label: 'Phone', icon: Phone, placeholder: '+1234567890' },
        { id: 'wifi', label: 'WiFi', icon: Wifi, placeholder: '' }
    ]

    const getQRContent = (): string => {
        switch (qrType) {
            case 'url':
                return content
            case 'text':
                return content
            case 'email':
                return `mailto:${content}`
            case 'phone':
                return `tel:${content}`
            case 'wifi':
                return `WIFI:T:${wifiOptions.encryption};S:${wifiOptions.ssid};P:${wifiOptions.password};;`
            default:
                return content
        }
    }

    useEffect(() => {
        const generateQR = async () => {
            const qrContent = getQRContent()
            if (!qrContent || (qrType === 'wifi' && !wifiOptions.ssid)) {
                setQrDataUrl('')
                return
            }

            try {
                const url = await QRCode.toDataURL(qrContent, {
                    width: size,
                    margin: 2,
                    color: {
                        dark: fgColor,
                        light: bgColor
                    },
                    errorCorrectionLevel: 'M'
                })
                setQrDataUrl(url)
            } catch (err) {
                console.error('QR generation error:', err)
            }
        }

        const debounce = setTimeout(generateQR, 200)
        return () => clearTimeout(debounce)
    }, [content, qrType, wifiOptions, fgColor, bgColor, size])

    const downloadQR = (format: 'png' | 'svg') => {
        if (!qrDataUrl) return

        const link = document.createElement('a')
        link.download = `qr-code.${format}`

        if (format === 'png') {
            link.href = qrDataUrl
        } else {
            // For SVG, we need to regenerate
            const qrContent = getQRContent()
            QRCode.toString(qrContent, {
                type: 'svg',
                width: size,
                margin: 2,
                color: {
                    dark: fgColor,
                    light: bgColor
                }
            }).then(svg => {
                const blob = new Blob([svg], { type: 'image/svg+xml' })
                link.href = URL.createObjectURL(blob)
                link.click()
                URL.revokeObjectURL(link.href)
            })
            return
        }

        link.click()
    }

    return (
        <ToolsLayout
            title="QR Code Generator"
            description="Create QR codes for URLs, text, contacts, and WiFi"
        >
            <div className="grid lg:grid-cols-2 gap-8">
                {/* Left: Options */}
                <div className="space-y-6">
                    {/* Type Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">
                            QR Code Type
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                            {typeOptions.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => {
                                        setQrType(id as QRType)
                                        setContent('')
                                    }}
                                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                                        qrType === id
                                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="text-xs font-medium">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Input */}
                    {qrType !== 'wifi' ? (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                                Content
                            </label>
                            <input
                                type={qrType === 'email' ? 'email' : qrType === 'phone' ? 'tel' : 'text'}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={typeOptions.find(t => t.id === qrType)?.placeholder}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Network Name (SSID)
                                </label>
                                <input
                                    type="text"
                                    value={wifiOptions.ssid}
                                    onChange={(e) => setWifiOptions({ ...wifiOptions, ssid: e.target.value })}
                                    placeholder="WiFi Network Name"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Password
                                </label>
                                <input
                                    type="text"
                                    value={wifiOptions.password}
                                    onChange={(e) => setWifiOptions({ ...wifiOptions, password: e.target.value })}
                                    placeholder="WiFi Password"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Encryption
                                </label>
                                <select
                                    value={wifiOptions.encryption}
                                    onChange={(e) => setWifiOptions({ ...wifiOptions, encryption: e.target.value as WifiOptions['encryption'] })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="WPA">WPA/WPA2</option>
                                    <option value="WEP">WEP</option>
                                    <option value="nopass">None</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Color Options */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                                Foreground Color
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={fgColor}
                                    onChange={(e) => setFgColor(e.target.value)}
                                    className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={fgColor}
                                    onChange={(e) => setFgColor(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                                Background Color
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={bgColor}
                                    onChange={(e) => setBgColor(e.target.value)}
                                    className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={bgColor}
                                    onChange={(e) => setBgColor(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Size Slider */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-700">
                                Size
                            </label>
                            <span className="text-sm font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                {size}px
                            </span>
                        </div>
                        <input
                            type="range"
                            min="100"
                            max="500"
                            step="50"
                            value={size}
                            onChange={(e) => setSize(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                    </div>
                </div>

                {/* Right: Preview & Download */}
                <div className="flex flex-col items-center gap-6">
                    {/* QR Preview */}
                    <div className="w-full aspect-square max-w-[300px] flex items-center justify-center bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300">
                        {qrDataUrl ? (
                            <motion.img
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                src={qrDataUrl}
                                alt="Generated QR Code"
                                className="max-w-full max-h-full rounded-lg"
                            />
                        ) : (
                            <p className="text-slate-400 text-center px-4">
                                Enter content to generate QR code
                            </p>
                        )}
                    </div>

                    {/* Download Buttons */}
                    <div className="flex gap-3 w-full max-w-[300px]">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => downloadQR('png')}
                            disabled={!qrDataUrl}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-500 to-blue-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-200"
                        >
                            <Download className="w-4 h-4" />
                            PNG
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => downloadQR('svg')}
                            disabled={!qrDataUrl}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-primary-500 text-primary-600 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-50 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            SVG
                        </motion.button>
                    </div>
                </div>
            </div>
        </ToolsLayout>
    )
}
