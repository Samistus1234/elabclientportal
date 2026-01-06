import { motion } from 'framer-motion'
import {
    Upload,
    MessageCircle,
    Calendar,
    HelpCircle,
    Phone,
    Mail,
    ExternalLink
} from 'lucide-react'

interface QuickAction {
    id: string
    title: string
    description: string
    icon: React.ElementType
    color: string
    bgColor: string
    action?: () => void
    href?: string
}

const quickActions: QuickAction[] = [
    {
        id: 'upload',
        title: 'Upload Documents',
        description: 'Submit required files',
        icon: Upload,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 hover:bg-blue-200',
        href: '/documents'
    },
    {
        id: 'message',
        title: 'Send Message',
        description: 'Contact your advisor',
        icon: MessageCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100 hover:bg-green-200',
        href: 'https://wa.me/2348165634195'
    },
    {
        id: 'schedule',
        title: 'Schedule Call',
        description: 'Book a consultation',
        icon: Calendar,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100 hover:bg-purple-200',
        href: 'https://calendar.app.google/ZD4U6SwmwGCvsfJT8'
    },
    {
        id: 'faq',
        title: 'FAQ & Help',
        description: 'Find answers fast',
        icon: HelpCircle,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100 hover:bg-amber-200',
        href: 'https://www.elab.academy/faq'
    }
]

const contactOptions = [
    {
        id: 'phone',
        label: 'Call Us',
        value: '+1 (929) 419-2327',
        icon: Phone,
        color: 'text-emerald-600',
        href: 'tel:+19294192327'
    },
    {
        id: 'email',
        label: 'Email',
        value: 'support@elabsolution.org',
        icon: Mail,
        color: 'text-blue-600',
        href: 'mailto:support@elabsolution.org'
    }
]

export default function QuickActions() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 mb-6"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Quick Actions</h3>
                <span className="text-xs text-slate-400">Need help? We're here!</span>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {quickActions.map((action, index) => (
                    <motion.a
                        key={action.id}
                        href={action.href}
                        target={action.href?.startsWith('http') ? '_blank' : undefined}
                        rel={action.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
                            ${action.bgColor} rounded-xl p-4 text-left
                            transition-all duration-200 group cursor-pointer
                        `}
                    >
                        <div className={`w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                            <action.icon className={`w-5 h-5 ${action.color}`} />
                        </div>
                        <h4 className="font-medium text-slate-800 text-sm">{action.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
                    </motion.a>
                ))}
            </div>

            {/* Contact Strip */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-slate-100">
                {contactOptions.map((option) => (
                    <motion.a
                        key={option.id}
                        href={(option as any).href || (option.id === 'phone' ? `tel:${option.value}` : `mailto:${option.value}`)}
                        whileHover={{ scale: 1.02 }}
                        className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors flex-1"
                    >
                        <option.icon className={`w-4 h-4 ${option.color}`} />
                        <div>
                            <p className="text-xs text-slate-400">{option.label}</p>
                            <p className="text-sm font-medium text-slate-700">{option.value}</p>
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-300 ml-auto" />
                    </motion.a>
                ))}
            </div>
        </motion.div>
    )
}
