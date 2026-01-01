import { motion } from 'framer-motion'
import { format, differenceInDays, isPast, isToday } from 'date-fns'
import {
    Calendar,
    AlertTriangle,
    CheckCircle2,
    Bell,
    ArrowRight
} from 'lucide-react'

interface Deadline {
    id: string
    title: string
    date: Date
    type: 'document' | 'appointment' | 'payment' | 'exam' | 'general'
    completed?: boolean
}

interface UpcomingDeadlinesProps {
    deadlines?: Deadline[]
}

const defaultDeadlines: Deadline[] = [
    {
        id: '1',
        title: 'Submit passport copy',
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        type: 'document'
    },
    {
        id: '2',
        title: 'Verification payment due',
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        type: 'payment'
    },
    {
        id: '3',
        title: 'Prometric exam date',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        type: 'exam'
    },
    {
        id: '4',
        title: 'OET Speaking test',
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
        type: 'exam'
    }
]

const typeConfig = {
    document: { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Document' },
    appointment: { color: 'text-purple-600', bg: 'bg-purple-100', label: 'Appointment' },
    payment: { color: 'text-green-600', bg: 'bg-green-100', label: 'Payment' },
    exam: { color: 'text-amber-600', bg: 'bg-amber-100', label: 'Exam' },
    general: { color: 'text-slate-600', bg: 'bg-slate-100', label: 'General' }
}

export default function UpcomingDeadlines({ deadlines = defaultDeadlines }: UpcomingDeadlinesProps) {
    const sortedDeadlines = [...deadlines]
        .filter(d => !d.completed)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 4)

    const getUrgencyStyle = (date: Date) => {
        const daysLeft = differenceInDays(date, new Date())

        if (isPast(date) || isToday(date)) {
            return {
                border: 'border-l-red-500',
                bg: 'bg-red-50',
                text: 'text-red-600',
                label: isToday(date) ? 'Today!' : 'Overdue'
            }
        }
        if (daysLeft <= 3) {
            return {
                border: 'border-l-amber-500',
                bg: 'bg-amber-50',
                text: 'text-amber-600',
                label: `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
            }
        }
        if (daysLeft <= 7) {
            return {
                border: 'border-l-blue-500',
                bg: 'bg-blue-50',
                text: 'text-blue-600',
                label: `${daysLeft} days left`
            }
        }
        return {
            border: 'border-l-slate-300',
            bg: 'bg-slate-50',
            text: 'text-slate-500',
            label: `${daysLeft} days left`
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Upcoming Deadlines</h3>
                        <p className="text-xs text-slate-500">Don't miss important dates</p>
                    </div>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                    <Bell className="w-4 h-4 text-slate-600" />
                </motion.button>
            </div>

            {/* Deadlines List */}
            {sortedDeadlines.length === 0 ? (
                <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
                    <p className="text-slate-500">No upcoming deadlines</p>
                    <p className="text-xs text-slate-400">You're all caught up!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedDeadlines.map((deadline, index) => {
                        const urgency = getUrgencyStyle(deadline.date)
                        const config = typeConfig[deadline.type]

                        return (
                            <motion.div
                                key={deadline.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ x: 4 }}
                                className={`
                                    relative p-4 rounded-xl border-l-4 ${urgency.border} ${urgency.bg}
                                    cursor-pointer transition-all hover:shadow-md
                                `}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium text-slate-800">{deadline.title}</h4>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                                                {config.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="text-slate-500 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {format(deadline.date, 'MMM d, yyyy')}
                                            </span>
                                            <span className={`font-medium ${urgency.text} flex items-center gap-1`}>
                                                {(isPast(deadline.date) || differenceInDays(deadline.date, new Date()) <= 3) && (
                                                    <AlertTriangle className="w-3 h-3" />
                                                )}
                                                {urgency.label}
                                            </span>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300" />
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}

            {/* View All Link */}
            {deadlines.length > 4 && (
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="w-full mt-4 py-2 text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center gap-1"
                >
                    View all deadlines
                    <ArrowRight className="w-4 h-4" />
                </motion.button>
            )}
        </motion.div>
    )
}
