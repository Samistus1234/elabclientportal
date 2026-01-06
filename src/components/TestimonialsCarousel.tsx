import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Quote, Star, ChevronLeft, ChevronRight, Verified } from 'lucide-react'

interface Testimonial {
    id: string
    name: string
    role: string
    country: string
    image?: string
    content: string
    rating: number
    service: string
    verified: boolean
}

const testimonials: Testimonial[] = [
    {
        id: '1',
        name: 'Dr. Sarah Johnson',
        role: 'Registered Nurse',
        country: 'Nigeria',
        content: 'ELAB helped me complete my DataFlow verification in just 3 weeks! Their team was incredibly supportive throughout the entire process. I highly recommend their services.',
        rating: 5,
        service: 'DataFlow Verification',
        verified: true
    },
    {
        id: '2',
        name: 'Mubarak Orio',
        role: 'Medical Laboratory Scientist',
        country: 'Ghana',
        content: 'The Prometric exam prep course was exactly what I needed. The tutors were knowledgeable and the practice tests were very similar to the actual exam. Passed on my first attempt!',
        rating: 5,
        service: 'Prometric Prep',
        verified: true
    },
    {
        id: '3',
        name: 'Fatima Al-Hassan',
        role: 'Midwife',
        country: 'Kenya',
        content: 'I achieved Band 8 in IELTS thanks to their excellent preparation program. The speaking practice sessions were particularly helpful. Thank you ELAB!',
        rating: 5,
        service: 'IELTS Preparation',
        verified: true
    },
    {
        id: '4',
        name: 'Dr. Chidi Eze',
        role: 'Pharmacist',
        country: 'Nigeria',
        content: 'Professional service from start to finish. They handled all my credential verification documents efficiently. Now working in the UAE!',
        rating: 5,
        service: 'Credential Verification',
        verified: true
    },
    {
        id: '5',
        name: 'Amina Bakari',
        role: 'Registered Nurse',
        country: 'Tanzania',
        content: 'The OET preparation was comprehensive and well-structured. Got Grade A in all modules! The healthcare-specific training made all the difference.',
        rating: 5,
        service: 'OET Preparation',
        verified: true
    }
]

export default function TestimonialsCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [direction, setDirection] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setDirection(1)
            setCurrentIndex((prev) => (prev + 1) % testimonials.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [])

    const goToPrevious = () => {
        setDirection(-1)
        setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
    }

    const goToNext = () => {
        setDirection(1)
        setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    }

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 300 : -300,
            opacity: 0
        })
    }

    const currentTestimonial = testimonials[currentIndex]

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 mb-6 overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-semibold text-slate-800">Success Stories</h3>
                    <p className="text-sm text-slate-500">From our healthcare community</p>
                </div>
                <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="text-sm font-medium text-slate-600 ml-2">4.9/5</span>
                </div>
            </div>

            {/* Testimonial Card */}
            <div className="relative min-h-[200px]">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0"
                    >
                        <div className="bg-gradient-to-br from-primary-50 via-white to-accent-50 rounded-xl p-6 h-full">
                            {/* Quote Icon */}
                            <Quote className="w-8 h-8 text-primary-200 mb-4" />

                            {/* Content */}
                            <p className="text-slate-700 leading-relaxed mb-4 line-clamp-3">
                                "{currentTestimonial.content}"
                            </p>

                            {/* Author */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-bold text-lg">
                                        {currentTestimonial.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-slate-800">{currentTestimonial.name}</h4>
                                            {currentTestimonial.verified && (
                                                <Verified className="w-4 h-4 text-blue-500" />
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500">{currentTestimonial.role} • {currentTestimonial.country}</p>
                                    </div>
                                </div>
                                <div className="hidden sm:block">
                                    <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                                        {currentTestimonial.service}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                    {testimonials.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                setDirection(index > currentIndex ? 1 : -1)
                                setCurrentIndex(index)
                            }}
                            className={`w-2 h-2 rounded-full transition-all ${
                                index === currentIndex
                                    ? 'bg-primary-500 w-6'
                                    : 'bg-slate-200 hover:bg-slate-300'
                            }`}
                        />
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToPrevious}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={goToNext}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </motion.div>
    )
}
