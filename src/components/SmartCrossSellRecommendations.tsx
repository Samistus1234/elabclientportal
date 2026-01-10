import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowRight,
    Star,
    CheckCircle,
    Sparkles,
    TrendingUp,
    Gift,
    FileCheck,
    GraduationCap,
    Building2,
    Globe,
    BookOpen,
    Award,
    FlaskConical,
    BadgePercent
} from 'lucide-react'

interface CaseData {
    id: string
    pipeline?: {
        name: string
        slug?: string
    } | null
    status: string
}

interface SmartCrossSellRecommendationsProps {
    cases: CaseData[]
    recruiterDiscount?: number // Optional recruiter discount percentage
}

interface Recommendation {
    id: string
    title: string
    subtitle: string
    description: string
    icon: React.ElementType
    gradient: string
    features: string[]
    originalPrice?: string
    discountedPrice?: string
    badge?: string
    priority: number // Higher = more relevant
    href: string
}

// Define cross-sell mappings based on pipeline types
const PIPELINE_RECOMMENDATIONS: Record<string, string[]> = {
    // DataFlow customers should consider Mumaris, Tutorial, CDFNS
    'dataflow': ['mumaris', 'prometric-tutorial', 'cdfns', 'oet-prep'],
    'dataflow_verification': ['mumaris', 'prometric-tutorial', 'cdfns', 'oet-prep'],

    // Mumaris customers might need DataFlow or exam prep
    'mumaris': ['dataflow', 'prometric-tutorial', 'cdfns', 'oet-prep'],
    'mumaris_registration': ['dataflow', 'prometric-tutorial', 'cdfns', 'oet-prep'],

    // Exam booking customers need tutorials
    'exam_booking': ['prometric-tutorial', 'oet-prep', 'ielts-prep'],

    // Academic customers
    'academia': ['prometric-tutorial', 'oet-prep', 'ielts-prep', 'cdfns'],

    // General/default recommendations
    'default': ['dataflow', 'mumaris', 'prometric-tutorial', 'oet-prep']
}

// All available services/products
const ALL_RECOMMENDATIONS: Record<string, Omit<Recommendation, 'priority'>> = {
    'dataflow': {
        id: 'dataflow',
        title: 'DataFlow Verification',
        subtitle: 'PSV Report',
        description: 'Get your Primary Source Verification completed quickly and accurately for Gulf countries.',
        icon: FileCheck,
        gradient: 'from-blue-500 via-indigo-500 to-purple-500',
        features: ['Document collection', 'Verification tracking', 'Fast processing', 'Expert support'],
        originalPrice: '$150',
        discountedPrice: '$135',
        badge: 'Essential',
        href: 'https://www.elabsolution.org/dataflow'
    },
    'mumaris': {
        id: 'mumaris',
        title: 'Mumaris+ Registration',
        subtitle: 'Saudi Healthcare License',
        description: 'Complete registration support for Saudi Commission for Health Specialties.',
        icon: Building2,
        gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
        features: ['Account setup', 'Document upload', 'Application tracking', 'Approval support'],
        originalPrice: '$200',
        discountedPrice: '$180',
        badge: 'Popular',
        href: 'https://www.elabsolution.org/mumaris'
    },
    'prometric-tutorial': {
        id: 'prometric-tutorial',
        title: 'Prometric Exam Prep',
        subtitle: 'Video Tutorials',
        description: 'Comprehensive video tutorials and practice exams for Prometric nursing exams.',
        icon: GraduationCap,
        gradient: 'from-rose-500 via-pink-500 to-purple-500',
        features: ['500+ video lessons', 'Practice questions', 'Mock exams', '95% pass rate'],
        originalPrice: '$299',
        discountedPrice: '$249',
        badge: 'Best Value',
        href: 'https://www.elab.academy/prometric'
    },
    'cdfns': {
        id: 'cdfns',
        title: 'CDFNS Exam Prep',
        subtitle: 'Dialysis Technician',
        description: 'Specialized preparation for Certified Dialysis Technician exams.',
        icon: FlaskConical,
        gradient: 'from-amber-500 via-orange-500 to-red-500',
        features: ['Theory review', 'Practical guidance', 'Exam strategies', 'Expert support'],
        originalPrice: '$199',
        discountedPrice: '$179',
        badge: 'Specialized',
        href: 'https://www.elab.academy/cdfns'
    },
    'oet-prep': {
        id: 'oet-prep',
        title: 'OET Preparation',
        subtitle: 'Healthcare English',
        description: 'Specialized English test preparation designed for healthcare professionals.',
        icon: Globe,
        gradient: 'from-blue-500 via-cyan-500 to-teal-500',
        features: ['All 4 modules', 'Role-play practice', 'Writing feedback', 'Mock tests'],
        originalPrice: '$249',
        discountedPrice: '$219',
        badge: 'Healthcare Focused',
        href: 'https://www.elab.academy/oet'
    },
    'ielts-prep': {
        id: 'ielts-prep',
        title: 'IELTS Preparation',
        subtitle: 'Academic & General',
        description: 'Achieve your target band score with our proven IELTS preparation program.',
        icon: BookOpen,
        gradient: 'from-amber-500 via-orange-500 to-red-500',
        features: ['Band 7+ strategies', 'Speaking practice', 'Writing templates', 'Flexible schedule'],
        originalPrice: '$199',
        discountedPrice: '$169',
        href: 'https://www.elab.academy/ielts'
    }
}

export default function SmartCrossSellRecommendations({ cases, recruiterDiscount = 10 }: SmartCrossSellRecommendationsProps) {
    // Analyze user's current cases to determine relevant recommendations
    const getRecommendations = (): Recommendation[] => {
        // Get all pipeline slugs from user's cases
        const userPipelines = cases
            .map(c => c.pipeline?.slug || c.pipeline?.name?.toLowerCase().replace(/\s+/g, '_'))
            .filter(Boolean) as string[]

        // Get unique recommendations based on user's pipelines
        const recommendationIds = new Set<string>()

        userPipelines.forEach(pipeline => {
            // Find matching recommendations
            Object.keys(PIPELINE_RECOMMENDATIONS).forEach(key => {
                if (pipeline.includes(key) || key.includes(pipeline)) {
                    PIPELINE_RECOMMENDATIONS[key].forEach(rec => recommendationIds.add(rec))
                }
            })
        })

        // If no specific matches, use default recommendations
        if (recommendationIds.size === 0) {
            PIPELINE_RECOMMENDATIONS['default'].forEach(rec => recommendationIds.add(rec))
        }

        // Filter out services the user already has (based on their pipelines)
        const filteredRecommendations = Array.from(recommendationIds)
            .filter(recId => {
                // Don't recommend if user already has this service
                return !userPipelines.some(p => p.includes(recId) || recId.includes(p))
            })
            .map((recId, index) => ({
                ...ALL_RECOMMENDATIONS[recId],
                priority: index
            }))
            .filter(Boolean)
            .slice(0, 4) // Limit to 4 recommendations

        return filteredRecommendations as Recommendation[]
    }

    const recommendations = getRecommendations()

    // If no recommendations, don't render
    if (recommendations.length === 0) return null

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
                    <h2 className="text-2xl font-bold text-slate-800">Complete Your Journey</h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Based on your current applications, these services can help accelerate your goals
                    </p>
                </div>

                {recruiterDiscount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring' }}
                        className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl"
                    >
                        <BadgePercent className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">
                            {recruiterDiscount}% Recruiter Discount Applied!
                        </span>
                    </motion.div>
                )}
            </div>

            {/* Trending/Stats Banner */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-4 mb-6 p-4 bg-gradient-to-r from-primary-50 via-white to-accent-50 rounded-xl border border-primary-100"
            >
                <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-primary-500" />
                    <span className="text-slate-600">
                        <strong className="text-primary-600">85%</strong> of DataFlow clients also get Mumaris registration
                    </span>
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span className="text-slate-600">
                        <strong className="text-amber-600">95%</strong> pass rate with our exam prep
                    </span>
                </div>
            </motion.div>

            {/* Recommendations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AnimatePresence>
                    {recommendations.map((rec, index) => (
                        <motion.div
                            key={rec.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: 0.2 + index * 0.1 }}
                            whileHover={{ y: -8, scale: 1.02 }}
                            className="group relative"
                        >
                            <a
                                href={rec.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                            >
                                <div className={`
                                    relative overflow-hidden rounded-2xl p-5
                                    bg-gradient-to-br ${rec.gradient}
                                    shadow-lg hover:shadow-2xl transition-all duration-300
                                    ${index === 0 ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}
                                `}>
                                    {/* Discount Badge */}
                                    {recruiterDiscount > 0 && (
                                        <div className="absolute top-3 left-3">
                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-400 text-green-900 flex items-center gap-1">
                                                <Gift className="w-3 h-3" />
                                                {recruiterDiscount}% OFF
                                            </span>
                                        </div>
                                    )}

                                    {/* Type Badge */}
                                    {rec.badge && (
                                        <div className="absolute top-3 right-3">
                                            <span className={`
                                                px-2 py-1 rounded-full text-xs font-bold
                                                ${index === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-white/20 text-white backdrop-blur-sm'}
                                            `}>
                                                {index === 0 && <Star className="w-3 h-3 inline mr-1" />}
                                                {rec.badge}
                                            </span>
                                        </div>
                                    )}

                                    {/* Decorative circles */}
                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
                                    <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-xl" />

                                    {/* Content */}
                                    <div className="relative z-10 mt-6">
                                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                                            <rec.icon className="w-6 h-6 text-white" />
                                        </div>

                                        <h3 className="text-lg font-bold text-white mb-1">{rec.title}</h3>
                                        <p className="text-white/80 text-sm mb-3">{rec.subtitle}</p>
                                        <p className="text-white/70 text-xs mb-4 line-clamp-2">{rec.description}</p>

                                        {/* Features */}
                                        <div className="space-y-1 mb-4">
                                            {rec.features.slice(0, 3).map((feature, i) => (
                                                <div key={i} className="flex items-center gap-2 text-white/80 text-xs">
                                                    <CheckCircle className="w-3 h-3" />
                                                    <span>{feature}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Pricing */}
                                        {rec.originalPrice && (
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="text-white/50 line-through text-sm">{rec.originalPrice}</span>
                                                <span className="text-white font-bold text-lg">{rec.discountedPrice}</span>
                                            </div>
                                        )}

                                        {/* CTA Button */}
                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="w-full py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                                        >
                                            Get Started
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </motion.div>
                                    </div>
                                </div>
                            </a>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* View All Services Link */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center mt-6"
            >
                <a
                    href="https://www.elabsolution.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                    View all ELAB services
                    <ArrowRight className="w-4 h-4" />
                </a>
            </motion.div>
        </motion.div>
    )
}
