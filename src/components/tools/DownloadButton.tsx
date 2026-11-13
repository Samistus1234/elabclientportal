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
                flex items-center justify-center gap-2 px-6 min-h-[48px] rounded-full font-semibold
                transition-colors duration-200
                ${disabled || loading
                    ? 'bg-[#E8E8ED] text-[#86868B] cursor-not-allowed'
                    : success
                        ? 'bg-[#1D6B3A] text-white'
                        : 'bg-[#0071E3] hover:bg-[#0077ED] text-white'
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
