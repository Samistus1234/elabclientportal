import { motion } from 'framer-motion'
import {
    Trophy,
    Medal,
    Star,
    Zap,
    Target,
    Award,
    Rocket,
    Crown,
    Lock
} from 'lucide-react'

interface Achievement {
    id: string
    title: string
    description: string
    icon: React.ElementType
    color: string
    bgColor: string
    unlocked: boolean
    progress?: number
    maxProgress?: number
}

interface MilestoneAchievementsProps {
    completedStages: number
    totalStages: number
    daysActive: number
    documentsUploaded: number
}

export default function MilestoneAchievements({
    completedStages = 0,
    totalStages = 5,
    daysActive = 0,
    documentsUploaded = 0
}: MilestoneAchievementsProps) {
    const achievements: Achievement[] = [
        {
            id: 'first-step',
            title: 'First Step',
            description: 'Started your application',
            icon: Rocket,
            color: 'text-blue-600',
            bgColor: 'from-blue-400 to-blue-600',
            unlocked: completedStages >= 1
        },
        {
            id: 'document-pro',
            title: 'Document Pro',
            description: 'Uploaded 5 documents',
            icon: Target,
            color: 'text-green-600',
            bgColor: 'from-green-400 to-green-600',
            unlocked: documentsUploaded >= 5,
            progress: Math.min(documentsUploaded, 5),
            maxProgress: 5
        },
        {
            id: 'halfway-hero',
            title: 'Halfway Hero',
            description: 'Completed 50% of stages',
            icon: Medal,
            color: 'text-amber-600',
            bgColor: 'from-amber-400 to-amber-600',
            unlocked: completedStages >= Math.ceil(totalStages / 2),
            progress: completedStages,
            maxProgress: Math.ceil(totalStages / 2)
        },
        {
            id: 'speed-runner',
            title: 'Speed Runner',
            description: 'Active for 7+ days',
            icon: Zap,
            color: 'text-purple-600',
            bgColor: 'from-purple-400 to-purple-600',
            unlocked: daysActive >= 7,
            progress: Math.min(daysActive, 7),
            maxProgress: 7
        },
        {
            id: 'champion',
            title: 'Champion',
            description: 'All stages completed',
            icon: Trophy,
            color: 'text-yellow-600',
            bgColor: 'from-yellow-400 to-yellow-600',
            unlocked: completedStages >= totalStages
        },
        {
            id: 'superstar',
            title: 'Superstar',
            description: 'Completed with excellence',
            icon: Crown,
            color: 'text-rose-600',
            bgColor: 'from-rose-400 to-rose-600',
            unlocked: false // Special achievement
        }
    ]

    const unlockedCount = achievements.filter(a => a.unlocked).length

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                        <Award className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Achievements</h3>
                        <p className="text-xs text-slate-500">{unlockedCount} of {achievements.length} unlocked</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-full">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-bold text-amber-600">{unlockedCount * 50} pts</span>
                </div>
            </div>

            {/* Achievements Grid */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {achievements.map((achievement, index) => (
                    <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: achievement.unlocked ? 1.1 : 1.02 }}
                        className="relative group"
                    >
                        <div className={`
                            relative flex flex-col items-center p-3 rounded-xl
                            ${achievement.unlocked
                                ? 'bg-gradient-to-br ' + achievement.bgColor + ' shadow-lg'
                                : 'bg-slate-100'
                            }
                            transition-all duration-300
                        `}>
                            {/* Lock overlay for locked achievements */}
                            {!achievement.unlocked && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-200/80 rounded-xl">
                                    <Lock className="w-4 h-4 text-slate-400" />
                                </div>
                            )}

                            {/* Icon */}
                            <achievement.icon className={`w-6 h-6 mb-1 ${achievement.unlocked ? 'text-white' : 'text-slate-300'}`} />

                            {/* Sparkle effect for unlocked */}
                            {achievement.unlocked && (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                                    className="absolute -top-1 -right-1"
                                >
                                    <Star className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                                </motion.div>
                            )}
                        </div>

                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                            <p className="font-semibold">{achievement.title}</p>
                            <p className="text-slate-300">{achievement.description}</p>
                            {achievement.progress !== undefined && !achievement.unlocked && (
                                <p className="text-primary-300 mt-1">{achievement.progress}/{achievement.maxProgress}</p>
                            )}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Progress Bar */}
            <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>Achievement Progress</span>
                    <span>{Math.round((unlockedCount / achievements.length) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-full"
                    />
                </div>
            </div>
        </motion.div>
    )
}
