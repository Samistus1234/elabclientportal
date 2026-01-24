import { motion } from 'framer-motion'
import { Download, CheckCircle, Loader2 } from 'lucide-react'

interface DownloadButtonProps {
    onClick: () => void
    disabled?: boolean
    loading?: boolean
    success?: boolean
    children?: React.ReactNode
    className?: string
}

export default function DownloadButton({
    onClick,
    disabled = false,
    loading = false,
    success = false,
    children = 'Download',
    className = ''
}: DownloadButtonProps) {
    return (
        <motion.button
            whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
            whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
            onClick={onClick}
            disabled={disabled || loading}
            className={`
                flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold
                transition-all duration-200
                ${disabled || loading
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : success
                        ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                        : 'bg-gradient-to-r from-primary-500 to-blue-600 text-white shadow-lg shadow-primary-200 hover:shadow-xl hover:shadow-primary-300'
                }
                ${className}
            `}
        >
            {loading ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                </>
            ) : success ? (
                <>
                    <CheckCircle className="w-5 h-5" />
                    Downloaded
                </>
            ) : (
                <>
                    <Download className="w-5 h-5" />
                    {children}
                </>
            )}
        </motion.button>
    )
}
