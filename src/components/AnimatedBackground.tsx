import { motion } from 'framer-motion'

export default function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            {/* Gradient base */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" />

            {/* Animated orbs */}
            <motion.div
                animate={{
                    x: [0, 100, 0],
                    y: [0, -50, 0],
                    scale: [1, 1.2, 1]
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
                className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-blue-200/40 to-cyan-200/40 rounded-full blur-3xl"
            />

            <motion.div
                animate={{
                    x: [0, -80, 0],
                    y: [0, 80, 0],
                    scale: [1, 1.3, 1]
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
                className="absolute top-40 right-20 w-96 h-96 bg-gradient-to-br from-purple-200/40 to-pink-200/40 rounded-full blur-3xl"
            />

            <motion.div
                animate={{
                    x: [0, 60, 0],
                    y: [0, -40, 0],
                    scale: [1, 1.1, 1]
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
                className="absolute bottom-20 left-1/3 w-80 h-80 bg-gradient-to-br from-emerald-200/30 to-teal-200/30 rounded-full blur-3xl"
            />

            <motion.div
                animate={{
                    x: [0, -40, 0],
                    y: [0, 60, 0],
                    scale: [1, 1.2, 1]
                }}
                transition={{
                    duration: 22,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
                className="absolute bottom-40 right-10 w-64 h-64 bg-gradient-to-br from-amber-200/30 to-orange-200/30 rounded-full blur-3xl"
            />

            {/* Grid pattern overlay */}
            <div
                className="absolute inset-0 opacity-[0.015]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px'
                }}
            />

            {/* Floating particles */}
            {[...Array(20)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{
                        x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                        y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
                        opacity: 0.3
                    }}
                    animate={{
                        y: [null, Math.random() * -200 - 100],
                        opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{
                        duration: Math.random() * 10 + 10,
                        repeat: Infinity,
                        ease: 'linear'
                    }}
                    className="absolute w-1 h-1 bg-primary-400/50 rounded-full"
                />
            ))}
        </div>
    )
}
