import { motion } from 'framer-motion'
import {
    HelpCircle,
    MessageCircle,
    Phone,
    Mail,
    FileQuestion,
    Video,
    ArrowRight,
    Clock,
    CheckCircle
} from 'lucide-react'

interface FAQItem {
    question: string
    category: string
}

const faqs: FAQItem[] = [
    { question: 'How long does DataFlow verification take?', category: 'Verification' },
    { question: 'What documents do I need for my application?', category: 'Documents' },
    { question: 'How do I track my application status?', category: 'Application' },
    { question: 'Can I expedite my verification process?', category: 'Verification' }
]

const supportChannels = [
    {
        id: 'chat',
        title: 'Live Chat',
        description: 'Chat with us now',
        icon: MessageCircle,
        color: 'from-blue-400 to-blue-600',
        available: true,
        responseTime: 'Instant',
        href: 'https://www.elab.academy/chat'
    },
    {
        id: 'call-ng',
        title: 'Nigeria Support',
        description: '+234 816 563 4195',
        icon: Phone,
        color: 'from-blue-500 to-cyan-500',
        available: true,
        responseTime: '< 2 min',
        href: 'tel:+2348165634195'
    },
    {
        id: 'call-us',
        title: 'USA Support',
        description: '+1 (929) 419-2327',
        icon: Phone,
        color: 'from-blue-500 to-cyan-500',
        available: true,
        responseTime: '< 2 min',
        href: 'tel:+19294192327'
    },
    {
        id: 'email',
        title: 'Email Us',
        description: 'info@elab.academy',
        icon: Mail,
        color: 'from-blue-400 to-blue-600',
        available: true,
        responseTime: '< 24 hrs',
        href: 'mailto:info@elab.academy'
    }
]

export default function SupportHelpSection() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-800">Need Help?</h3>
                    <p className="text-xs text-slate-500">We're here to assist you 24/7</p>
                </div>
            </div>

            {/* Support Channels Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {supportChannels.map((channel, index) => (
                    <motion.a
                        key={channel.id}
                        href={(channel as any).href}
                        target={(channel as any).href?.startsWith('http') ? '_blank' : undefined}
                        rel={(channel as any).href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className="relative overflow-hidden rounded-xl p-4 text-left group cursor-pointer"
                    >
                        {/* Background gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${channel.color} opacity-10 group-hover:opacity-20 transition-opacity`} />

                        <div className="relative z-10">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${channel.color} flex items-center justify-center mb-3 shadow-lg`}>
                                <channel.icon className="w-5 h-5 text-white" />
                            </div>
                            <h4 className="font-semibold text-slate-800 text-sm">{channel.title}</h4>
                            <p className="text-xs text-slate-500 mb-2">{channel.description}</p>
                            <div className="flex items-center gap-1 text-xs">
                                {channel.available ? (
                                    <>
                                        <CheckCircle className="w-3 h-3 text-green-500" />
                                        <span className="text-green-600">Available</span>
                                    </>
                                ) : (
                                    <>
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <span className="text-slate-400">Offline</span>
                                    </>
                                )}
                                <span className="text-slate-300 mx-1">•</span>
                                <span className="text-slate-500">{channel.responseTime}</span>
                            </div>
                        </div>
                    </motion.a>
                ))}
            </div>

            {/* Quick FAQs */}
            <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <FileQuestion className="w-4 h-4 text-slate-400" />
                        Quick Answers
                    </h4>
                    <a
                        href="https://www.elab.academy/faq"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                    >
                        View all FAQs
                        <ArrowRight className="w-3 h-3" />
                    </a>
                </div>
                <div className="space-y-2">
                    {faqs.map((faq, index) => (
                        <motion.button
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + index * 0.05 }}
                            whileHover={{ x: 4 }}
                            className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors group"
                        >
                            <span className="text-sm text-slate-600 group-hover:text-slate-800">{faq.question}</span>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
                        </motion.button>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}
