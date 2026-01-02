import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { motion } from 'framer-motion'
import { TrendingUp, Activity, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react'

interface CaseData {
    id: string
    status: string
    pipeline?: { name: string } | null
    current_stage?: { name: string } | null
}

interface ApplicationStatusChartProps {
    cases: CaseData[]
}

const STATUS_CONFIG = {
    active: {
        color: '#0ea5e9',
        gradientFrom: '#38bdf8',
        gradientTo: '#0284c7',
        label: 'In Progress',
        icon: Clock,
        bgColor: 'bg-primary-100',
        textColor: 'text-primary-700'
    },
    completed: {
        color: '#22c55e',
        gradientFrom: '#4ade80',
        gradientTo: '#16a34a',
        label: 'Completed',
        icon: CheckCircle2,
        bgColor: 'bg-success-100',
        textColor: 'text-success-700'
    },
    on_hold: {
        color: '#f59e0b',
        gradientFrom: '#fbbf24',
        gradientTo: '#d97706',
        label: 'On Hold',
        icon: AlertCircle,
        bgColor: 'bg-warning-100',
        textColor: 'text-warning-700'
    },
    cancelled: {
        color: '#ef4444',
        gradientFrom: '#f87171',
        gradientTo: '#dc2626',
        label: 'Cancelled',
        icon: XCircle,
        bgColor: 'bg-red-100',
        textColor: 'text-red-700'
    }
}

export default function ApplicationStatusChart({ cases }: ApplicationStatusChartProps) {
    const statusCounts = cases.reduce((acc, c) => {
        const status = c.status || 'active'
        acc[status] = (acc[status] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const chartData = Object.entries(statusCounts).map(([status, count]) => ({
        name: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label || status,
        value: count,
        status,
        color: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || '#94a3b8'
    }))

    const totalCases = cases.length
    const completedCases = statusCounts['completed'] || 0
    const activeCases = statusCounts['active'] || 0
    const completionRate = totalCases > 0 ? Math.round((completedCases / totalCases) * 100) : 0

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            return (
                <div className="glass-card rounded-lg px-3 py-2 shadow-lg">
                    <p className="font-medium text-slate-800">{data.name}</p>
                    <p className="text-sm text-slate-600">
                        {data.value} application{data.value !== 1 ? 's' : ''}
                    </p>
                </div>
            )
        }
        return null
    }

    // Custom legend
    const CustomLegend = () => (
        <div className="flex flex-wrap justify-center gap-4 mt-4">
            {chartData.map((entry, index) => {
                const config = STATUS_CONFIG[entry.status as keyof typeof STATUS_CONFIG]
                const Icon = config?.icon || Activity
                return (
                    <motion.div
                        key={entry.status}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 + 0.5 }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config?.bgColor || 'bg-slate-100'}`}
                    >
                        <Icon className={`w-4 h-4 ${config?.textColor || 'text-slate-600'}`} />
                        <span className={`text-sm font-medium ${config?.textColor || 'text-slate-600'}`}>
                            {entry.name}: {entry.value}
                        </span>
                    </motion.div>
                )
            })}
        </div>
    )

    if (cases.length === 0) {
        return (
            <div className="glass-card rounded-2xl p-6 text-center">
                <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No applications to display</p>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6"
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Application Overview</h3>
                        <p className="text-slate-500 text-xs">Status distribution</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-success-50 px-3 py-1.5 rounded-full">
                    <TrendingUp className="w-4 h-4 text-success-600" />
                    <span className="text-sm font-medium text-success-700">
                        {completionRate}% complete
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Pie Chart */}
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <defs>
                                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                    <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor={config.gradientFrom} />
                                        <stop offset="100%" stopColor={config.gradientTo} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="value"
                                animationBegin={200}
                                animationDuration={1000}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={`url(#gradient-${entry.status})`}
                                        stroke="none"
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-4"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-primary-600" />
                            <span className="text-xs text-primary-600 font-medium">Active</span>
                        </div>
                        <p className="text-2xl font-bold text-primary-700">{activeCases}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-gradient-to-br from-success-50 to-success-100 rounded-xl p-4"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-success-600" />
                            <span className="text-xs text-success-600 font-medium">Completed</span>
                        </div>
                        <p className="text-2xl font-bold text-success-700">{completedCases}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-gradient-to-br from-warning-50 to-warning-100 rounded-xl p-4"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-warning-600" />
                            <span className="text-xs text-warning-600 font-medium">On Hold</span>
                        </div>
                        <p className="text-2xl font-bold text-warning-700">{statusCounts['on_hold'] || 0}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4 text-slate-600" />
                            <span className="text-xs text-slate-600 font-medium">Total</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-700">{totalCases}</p>
                    </motion.div>
                </div>
            </div>

            <CustomLegend />
        </motion.div>
    )
}
