import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useWalkthrough } from '@/contexts/WalkthroughContext'

interface TargetRect {
    top: number
    left: number
    width: number
    height: number
}

export default function WalkthroughOverlay() {
    const {
        isActive,
        currentStep,
        currentStepIndex,
        currentTour,
        nextStep,
        prevStep,
        skipTour
    } = useWalkthrough()

    const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
    const [isMobile, setIsMobile] = useState(false)
    const [elementNotFound, setElementNotFound] = useState(false)
    const tooltipRef = useRef<HTMLDivElement>(null)

    // Check if we're on mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Find and track the target element
    const updateTargetRect = useCallback(() => {
        if (!isActive || !currentStep) {
            setTargetRect(null)
            setElementNotFound(false)
            return
        }

        // Immediately clear for center-targeted steps
        if (currentStep.target === 'center') {
            setTargetRect(null)
            setElementNotFound(false)
            // Scroll to top for centered content
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        try {
            const element = document.querySelector(currentStep.target)
            if (element) {
                // Check if element is actually visible (not display:none or visibility:hidden)
                const style = window.getComputedStyle(element)
                const isVisible = style.display !== 'none' &&
                                  style.visibility !== 'hidden' &&
                                  style.opacity !== '0'

                if (!isVisible) {
                    // Element exists but is hidden (e.g., desktop-only element on mobile)
                    setTargetRect(null)
                    setElementNotFound(true)
                    return
                }

                const rect = element.getBoundingClientRect()
                const padding = currentStep.spotlightPadding || 8

                // On mobile, use smaller padding
                const mobilePadding = isMobile ? Math.min(padding, 4) : padding

                setTargetRect({
                    top: rect.top - mobilePadding,
                    left: rect.left - mobilePadding,
                    width: rect.width + mobilePadding * 2,
                    height: rect.height + mobilePadding * 2
                })
                setElementNotFound(false)

                // Scroll element into view if needed
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            } else {
                setTargetRect(null)
                setElementNotFound(true)
            }
        } catch {
            setTargetRect(null)
            setElementNotFound(true)
        }
    }, [isActive, currentStep, isMobile])

    // Clear targetRect immediately when step changes to 'center'
    useEffect(() => {
        if (currentStep?.target === 'center') {
            setTargetRect(null)
            setElementNotFound(false)
        }
    }, [currentStep])

    useEffect(() => {
        if (!isActive) return

        // Initial update with delay to allow page to render
        const timeout = setTimeout(updateTargetRect, 200)

        // Update on resize/scroll
        window.addEventListener('resize', updateTargetRect)
        window.addEventListener('scroll', updateTargetRect, true)

        return () => {
            clearTimeout(timeout)
            window.removeEventListener('resize', updateTargetRect)
            window.removeEventListener('scroll', updateTargetRect, true)
        }
    }, [isActive, currentStep, updateTargetRect])

    // Handle swipe gestures for mobile
    const handleDragEnd = (_: any, info: PanInfo) => {
        const threshold = 50
        if (info.offset.x < -threshold) {
            // Swiped left - go to next step
            nextStep()
        } else if (info.offset.x > threshold) {
            // Swiped right - go to previous step
            prevStep()
        }
    }

    if (!isActive || !currentStep || !currentTour) return null

    const totalSteps = currentTour.steps.length
    const progress = ((currentStepIndex + 1) / totalSteps) * 100
    const isLastStep = currentStepIndex === totalSteps - 1
    const isFirstStep = currentStepIndex === 0
    const isCentered = currentStep.target === 'center' || !targetRect || elementNotFound

    // Calculate tooltip position - mobile-optimized
    const getTooltipStyle = (): React.CSSProperties => {
        // On mobile, use fixed left/right positioning for proper centering
        if (isMobile) {
            // Check if target is in bottom half of screen
            const targetInBottomHalf = targetRect && targetRect.top > window.innerHeight / 2

            if (targetInBottomHalf) {
                // Show tooltip at top
                return {
                    top: '16px',
                    left: '16px',
                    right: '16px',
                    maxHeight: '40vh'
                }
            }

            // Default: show above the mobile nav (80px from bottom)
            return {
                bottom: '80px',
                left: '16px',
                right: '16px',
                maxHeight: '60vh'
            }
        }

        // Desktop positioning
        if (isCentered) {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            }
        }

        const placement = currentStep.placement || 'bottom'
        const gap = 16

        switch (placement) {
            case 'top':
                return {
                    bottom: `${window.innerHeight - targetRect!.top + gap}px`,
                    left: `${targetRect!.left + targetRect!.width / 2}px`,
                    transform: 'translateX(-50%)'
                }
            case 'bottom':
                return {
                    top: `${targetRect!.top + targetRect!.height + gap}px`,
                    left: `${targetRect!.left + targetRect!.width / 2}px`,
                    transform: 'translateX(-50%)'
                }
            case 'left':
                return {
                    top: `${targetRect!.top + targetRect!.height / 2}px`,
                    right: `${window.innerWidth - targetRect!.left + gap}px`,
                    transform: 'translateY(-50%)'
                }
            case 'right':
                return {
                    top: `${targetRect!.top + targetRect!.height / 2}px`,
                    left: `${targetRect!.left + targetRect!.width + gap}px`,
                    transform: 'translateY(-50%)'
                }
            default:
                return {
                    top: `${targetRect!.top + targetRect!.height + gap}px`,
                    left: `${targetRect!.left + targetRect!.width / 2}px`,
                    transform: 'translateX(-50%)'
                }
        }
    }

    return (
        <AnimatePresence>
            {isActive && (
                <div className="fixed inset-0 z-[9999] touch-none">
                    {/* Dark overlay with hole for spotlight */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/70"
                        onClick={skipTour}
                        style={{
                            clipPath: targetRect
                                ? `polygon(
                                    0% 0%,
                                    0% 100%,
                                    ${targetRect.left}px 100%,
                                    ${targetRect.left}px ${targetRect.top}px,
                                    ${targetRect.left + targetRect.width}px ${targetRect.top}px,
                                    ${targetRect.left + targetRect.width}px ${targetRect.top + targetRect.height}px,
                                    ${targetRect.left}px ${targetRect.top + targetRect.height}px,
                                    ${targetRect.left}px 100%,
                                    100% 100%,
                                    100% 0%
                                  )`
                                : 'none'
                        }}
                    />

                    {/* Spotlight border glow */}
                    {targetRect && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute pointer-events-none rounded-xl"
                            style={{
                                top: targetRect.top,
                                left: targetRect.left,
                                width: targetRect.width,
                                height: targetRect.height,
                                boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 30px rgba(59, 130, 246, 0.3)'
                            }}
                        />
                    )}

                    {/* Tooltip - with swipe support on mobile */}
                    <motion.div
                        ref={tooltipRef}
                        key={currentStepIndex}
                        initial={{ opacity: 0, scale: 0.9, y: isMobile ? 20 : 0 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: isMobile ? 20 : 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        drag={isMobile ? 'x' : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={handleDragEnd}
                        className={`absolute touch-pan-y ${isMobile ? '' : 'w-[92vw] max-w-md'}`}
                        style={getTooltipStyle()}
                    >
                        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                            {/* Progress bar */}
                            <div className="h-1.5 bg-slate-100">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                                />
                            </div>

                            {/* Swipe indicator for mobile */}
                            {isMobile && (
                                <div className="flex justify-center pt-2">
                                    <div className="w-10 h-1 bg-slate-200 rounded-full" />
                                </div>
                            )}

                            {/* Content */}
                            <div className="p-4 sm:p-5">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                                            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-slate-800 text-sm sm:text-base leading-tight">
                                                {currentStep.title}
                                            </h3>
                                            <p className="text-xs text-slate-400">
                                                Step {currentStepIndex + 1} of {totalSteps}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={skipTour}
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors -mr-1"
                                        aria-label="Close tour"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Description */}
                                <p className="text-slate-600 text-sm leading-relaxed mb-4 sm:mb-5">
                                    {elementNotFound && isMobile ? (
                                        <>
                                            <span className="text-amber-600 font-medium">Note: </span>
                                            This feature is available on larger screens. {currentStep.content}
                                        </>
                                    ) : (
                                        currentStep.content
                                    )}
                                </p>

                                {/* Navigation - larger touch targets on mobile */}
                                <div className="flex items-center justify-between gap-2">
                                    <button
                                        onClick={skipTour}
                                        className="text-sm text-slate-400 hover:text-slate-600 transition-colors py-2 px-1"
                                    >
                                        Skip
                                    </button>

                                    <div className="flex items-center gap-2">
                                        {!isFirstStep && (
                                            <button
                                                onClick={prevStep}
                                                className="flex items-center justify-center gap-1 px-3 sm:px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors min-w-[70px]"
                                                aria-label="Previous step"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                                <span className="hidden sm:inline">Back</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={nextStep}
                                            className="flex items-center justify-center gap-1 px-4 sm:px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 active:from-blue-700 active:to-cyan-700 rounded-xl transition-all shadow-lg shadow-blue-500/25 min-w-[80px]"
                                            aria-label={isLastStep ? 'Finish tour' : 'Next step'}
                                        >
                                            {isLastStep ? 'Finish' : 'Next'}
                                            {!isLastStep && <ChevronRight className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Swipe hint for mobile */}
                                {isMobile && (
                                    <p className="text-xs text-slate-400 text-center mt-3">
                                        Swipe left or right to navigate
                                    </p>
                                )}
                            </div>

                            {/* Step indicators - hide on very small screens */}
                            <div className="px-4 sm:px-5 pb-3 sm:pb-4 hidden xs:block">
                                <div className="flex justify-center gap-1.5 flex-wrap">
                                    {currentTour.steps.map((_, index) => (
                                        <div
                                            key={index}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                index === currentStepIndex
                                                    ? 'w-5 sm:w-6 bg-blue-500'
                                                    : index < currentStepIndex
                                                        ? 'w-1.5 bg-blue-300'
                                                        : 'w-1.5 bg-slate-200'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
