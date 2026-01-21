import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface WalkthroughStep {
    id: string
    target: string // CSS selector for the target element
    title: string
    content: string
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
    spotlightPadding?: number
    action?: () => void // Optional action when step is shown
    route?: string // Optional route to navigate to for this step
}

export interface WalkthroughTour {
    id: string
    name: string
    steps: WalkthroughStep[]
}

interface WalkthroughContextType {
    isActive: boolean
    currentTour: WalkthroughTour | null
    currentStepIndex: number
    currentStep: WalkthroughStep | null
    startTour: (tour: WalkthroughTour) => void
    endTour: () => void
    nextStep: () => void
    prevStep: () => void
    goToStep: (index: number) => void
    skipTour: () => void
}

const WalkthroughContext = createContext<WalkthroughContextType | null>(null)

export function WalkthroughProvider({ children }: { children: ReactNode }) {
    const [isActive, setIsActive] = useState(false)
    const [currentTour, setCurrentTour] = useState<WalkthroughTour | null>(null)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)

    const currentStep = currentTour?.steps[currentStepIndex] || null

    const startTour = useCallback((tour: WalkthroughTour) => {
        setCurrentTour(tour)
        setCurrentStepIndex(0)
        setIsActive(true)
    }, [])

    const endTour = useCallback(() => {
        setIsActive(false)
        setCurrentTour(null)
        setCurrentStepIndex(0)
    }, [])

    const nextStep = useCallback(() => {
        if (currentTour && currentStepIndex < currentTour.steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1)
        } else {
            endTour()
        }
    }, [currentTour, currentStepIndex, endTour])

    const prevStep = useCallback(() => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1)
        }
    }, [currentStepIndex])

    const goToStep = useCallback((index: number) => {
        if (currentTour && index >= 0 && index < currentTour.steps.length) {
            setCurrentStepIndex(index)
        }
    }, [currentTour])

    const skipTour = useCallback(() => {
        endTour()
    }, [endTour])

    return (
        <WalkthroughContext.Provider
            value={{
                isActive,
                currentTour,
                currentStepIndex,
                currentStep,
                startTour,
                endTour,
                nextStep,
                prevStep,
                goToStep,
                skipTour
            }}
        >
            {children}
        </WalkthroughContext.Provider>
    )
}

export function useWalkthrough() {
    const context = useContext(WalkthroughContext)
    if (!context) {
        throw new Error('useWalkthrough must be used within a WalkthroughProvider')
    }
    return context
}
