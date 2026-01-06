import { motion } from 'framer-motion'
import {
    BookOpen,
    Award,
    ArrowRight,
    Star,
    Users,
    CheckCircle,
    Sparkles,
    Globe,
    Stethoscope,
    FlaskConical,
    HelpCircle,
    Headphones
} from 'lucide-react'

interface Service {
    id: string
    title: string
    subtitle: string
    description: string
    icon: React.ElementType
    gradient: string
    features: string[]
    badge?: string
    price?: string
    popular?: boolean
    href?: string
}

const services: Service[] = [
    {
        id: 'prometric-nursing',
        title: 'Prometric Exam Prep',
        subtitle: 'Nursing & Midwifery',
        description: 'Comprehensive preparation for PearsonVue Prometric exams. Pass with confidence!',
        icon: Stethoscope,
        gradient: 'from-rose-500 via-pink-500 to-purple-500',
        features: ['Expert instructors', 'Practice tests', 'Study materials', '95% pass rate'],
        badge: 'Most Popular',
        popular: true,
        href: 'https://www.elab.academy/prometric'
    },
    {
        id: 'oet-prep',
        title: 'OET Preparation',
        subtitle: 'Healthcare English',
        description: 'Specialized English test preparation designed for healthcare professionals.',
        icon: Globe,
        gradient: 'from-blue-500 via-cyan-500 to-teal-500',
        features: ['All 4 modules covered', 'Role-play practice', 'Writing feedback', 'Mock tests'],
        badge: 'Healthcare Focused',
        href: 'https://www.elab.academy/oet'
    },
    {
        id: 'ielts-prep',
        title: 'IELTS Preparation',
        subtitle: 'Academic & General',
        description: 'Achieve your target band score with our proven IELTS preparation program.',
        icon: BookOpen,
        gradient: 'from-amber-500 via-orange-500 to-red-500',
        features: ['Band 7+ strategies', 'Speaking practice', 'Writing templates', 'Flexible schedule'],
        href: 'https://www.elab.academy/ielts'
    },
    {
        id: 'lab-tech-prep',
        title: 'Lab Technician Prep',
        subtitle: 'Medical Laboratory',
        description: 'Specialized preparation for medical laboratory scientist licensing exams.',
        icon: FlaskConical,
        gradient: 'from-emerald-500 via-green-500 to-teal-500',
        features: ['Theory review', 'Practical guidance', 'Exam strategies', 'Expert support'],
        href: 'https://www.elab.academy/lab-technician'
    }
]

const stats = [
    { label: 'Students Trained', value: '50,000+', icon: Users },
    { label: 'Pass Rate', value: '95%', icon: Award },
    { label: 'Questions', value: '10,000+', icon: HelpCircle },
    { label: 'Expert Support', value: '24/7', icon: Headphones }
]

export default function ServicesShowcase() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
        >
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-accent-600 uppercase tracking-wider">Recommended For You</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Boost Your Career</h2>
                    <p className="text-slate-500 text-sm mt-1">Professional training programs for healthcare professionals</p>
                </div>
                <motion.a
                    href="https://www.elab.academy"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-primary-200 hover:shadow-xl transition-shadow"
                >
                    View All Courses
                    <ArrowRight className="w-4 h-4" />
                </motion.a>
            </div>

            {/* Stats Bar */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
            >
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                        className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-4 border border-slate-100 text-center"
                    >
                        <stat.icon className="w-5 h-5 text-primary-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                        <p className="text-xs text-slate-500">{stat.label}</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {services.map((service, index) => (
                    <motion.div
                        key={service.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        whileHover={{ y: -8, scale: 1.02 }}
                        className="group relative"
                    >
                        <div className={`
                            relative overflow-hidden rounded-2xl p-5
                            bg-gradient-to-br ${service.gradient}
                            shadow-lg hover:shadow-2xl transition-all duration-300
                            ${service.popular ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}
                        `}>
                            {/* Popular Badge */}
                            {service.badge && (
                                <div className="absolute top-3 right-3">
                                    <span className={`
                                        px-2 py-1 rounded-full text-xs font-bold
                                        ${service.popular
                                            ? 'bg-yellow-400 text-yellow-900'
                                            : 'bg-white/20 text-white backdrop-blur-sm'}
                                    `}>
                                        {service.popular && <Star className="w-3 h-3 inline mr-1" />}
                                        {service.badge}
                                    </span>
                                </div>
                            )}

                            {/* Decorative circles */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
                            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-xl" />

                            {/* Content */}
                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                                    <service.icon className="w-6 h-6 text-white" />
                                </div>

                                <h3 className="text-lg font-bold text-white mb-1">{service.title}</h3>
                                <p className="text-white/80 text-sm mb-3">{service.subtitle}</p>
                                <p className="text-white/70 text-xs mb-4 line-clamp-2">{service.description}</p>

                                {/* Features */}
                                <div className="space-y-1 mb-4">
                                    {service.features.slice(0, 3).map((feature, i) => (
                                        <div key={i} className="flex items-center gap-2 text-white/80 text-xs">
                                            <CheckCircle className="w-3 h-3" />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* CTA Button */}
                                <motion.a
                                    href={service.href || 'https://www.elab.academy'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="w-full py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                                >
                                    Learn More
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </motion.a>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Mobile View All Button */}
            <motion.a
                href="https://www.elab.academy"
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="md:hidden w-full mt-4 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"
            >
                View All Courses
                <ArrowRight className="w-4 h-4" />
            </motion.a>
        </motion.div>
    )
}
