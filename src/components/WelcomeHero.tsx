import { motion } from 'framer-motion'
import { Sparkles, Sun, Moon, Sunrise, Star, Rocket, Target, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'

interface WelcomeHeroProps {
    firstName: string
    totalApplications: number
    activeApplications: number
    completedApplications: number
}

export default function WelcomeHero({
    firstName,
    totalApplications,
    activeApplications,
    completedApplications
}: WelcomeHeroProps) {
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000)
        return () => clearInterval(timer)
    }, [])

    const getGreeting = () => {
        const hour = currentTime.getHours()
        if (hour >= 5 && hour < 12) {
            return { text: 'Good morning', icon: Sunrise, color: 'from-amber-400 to-orange-500' }
        } else if (hour >= 12 && hour < 17) {
            return { text: 'Good afternoon', icon: Sun, color: 'from-yellow-400 to-amber-500' }
        } else if (hour >= 17 && hour < 21) {
            return { text: 'Good evening', icon: Moon, color: 'from-purple-400 to-indigo-500' }
        } else {
            return { text: 'Good night', icon: Star, color: 'from-indigo-400 to-purple-600' }
        }
    }

    const getMotivationalMessage = () => {
        if (completedApplications > 0 && activeApplications === 0) {
            return "All your applications are complete! Great job!"
        }
        if (activeApplications > 0) {
            return "Your applications are making progress. We're here to help!"
        }
        return "Welcome to your personalized portal. Let's get started!"
    }

    const greeting = getGreeting()
    const GreetingIcon = greeting.icon

    const progressPercentage = totalApplications > 0
        ? Math.round((completedApplications / totalApplications) * 100)
        : 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl mb-8"
        >
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600">
                {/* Floating shapes */}
                <motion.div
                    animate={{
                        x: [0, 30, 0],
                        y: [0, -20, 0],
                        rotate: [0, 10, 0]
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-10 right-20 w-32 h-32 rounded-full bg-white/10 blur-xl"
                />
                <motion.div
                    animate={{
                        x: [0, -20, 0],
                        y: [0, 30, 0],
                        rotate: [0, -15, 0]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute bottom-10 left-20 w-40 h-40 rounded-full bg-accent-400/20 blur-xl"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/5 blur-2xl"
                />
            </div>

            {/* Content */}
            <div className="relative z-10 p-8 md:p-10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    {/* Left: Greeting */}
                    <div className="flex-1">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-3 mb-4"
                        >
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${greeting.color} flex items-center justify-center shadow-lg`}>
                                <GreetingIcon className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-white/80 text-lg font-medium">{greeting.text}</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-3xl md:text-4xl font-bold text-white mb-3"
                        >
                            Welcome back, {firstName}!
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-white/70 text-lg max-w-md"
                        >
                            {getMotivationalMessage()}
                        </motion.p>

                        {/* Quick Actions */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex items-center gap-3 mt-6"
                        >
                            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                                <Rocket className="w-4 h-4 text-white" />
                                <span className="text-white text-sm font-medium">
                                    {activeApplications} Active
                                </span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                                <Target className="w-4 h-4 text-white" />
                                <span className="text-white text-sm font-medium">
                                    {completedApplications} Completed
                                </span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right: Progress Ring */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex-shrink-0"
                    >
                        <div className="relative w-36 h-36 md:w-44 md:h-44">
                            {/* Background circle */}
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="50%"
                                    cy="50%"
                                    r="45%"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.2)"
                                    strokeWidth="8"
                                />
                                <motion.circle
                                    cx="50%"
                                    cy="50%"
                                    r="45%"
                                    fill="none"
                                    stroke="url(#progressGradient)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 45}`}
                                    initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                                    animate={{
                                        strokeDashoffset: 2 * Math.PI * 45 * (1 - progressPercentage / 100)
                                    }}
                                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.6 }}
                                />
                                <defs>
                                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#fff" />
                                        <stop offset="100%" stopColor="#fae8ff" />
                                    </linearGradient>
                                </defs>
                            </svg>

                            {/* Center content */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.8, type: 'spring' }}
                                    className="flex items-center gap-1"
                                >
                                    <TrendingUp className="w-5 h-5 text-white/80" />
                                </motion.div>
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1 }}
                                    className="text-4xl md:text-5xl font-bold text-white"
                                >
                                    {progressPercentage}%
                                </motion.span>
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1.1 }}
                                    className="text-white/60 text-sm"
                                >
                                    Complete
                                </motion.span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Decorative elements */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className="absolute top-4 right-4 text-white/20"
                >
                    <Sparkles className="w-8 h-8" />
                </motion.div>
            </div>
        </motion.div>
    )
}
