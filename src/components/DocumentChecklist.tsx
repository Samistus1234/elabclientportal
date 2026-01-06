import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
    CheckCircle2,
    Upload,
    AlertCircle,
    Clock,
    ChevronRight,
    Paperclip
} from 'lucide-react'

interface Document {
    id: string
    name: string
    status: 'uploaded' | 'pending' | 'required' | 'reviewing'
    required: boolean
}

interface DocumentChecklistProps {
    documents?: Document[]
}

const defaultDocuments: Document[] = [
    { id: '1', name: 'Passport Copy', status: 'uploaded', required: true },
    { id: '2', name: 'Nursing License', status: 'uploaded', required: true },
    { id: '3', name: 'Degree Certificate', status: 'reviewing', required: true },
    { id: '4', name: 'Transcript', status: 'pending', required: true },
    { id: '5', name: 'Experience Letter', status: 'required', required: true },
    { id: '6', name: 'Good Standing Certificate', status: 'required', required: false }
]

const statusConfig = {
    uploaded: {
        icon: CheckCircle2,
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: 'Uploaded',
        ringColor: 'ring-green-500'
    },
    pending: {
        icon: Clock,
        color: 'text-amber-600',
        bg: 'bg-amber-100',
        label: 'Pending',
        ringColor: 'ring-amber-500'
    },
    required: {
        icon: AlertCircle,
        color: 'text-red-600',
        bg: 'bg-red-100',
        label: 'Required',
        ringColor: 'ring-red-500'
    },
    reviewing: {
        icon: Clock,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        label: 'Reviewing',
        ringColor: 'ring-blue-500'
    }
}

export default function DocumentChecklist({ documents = defaultDocuments }: DocumentChecklistProps) {
    const uploadedCount = documents.filter(d => d.status === 'uploaded').length
    const progress = Math.round((uploadedCount / documents.length) * 100)

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                        <Paperclip className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Document Checklist</h3>
                        <p className="text-xs text-slate-500">{uploadedCount} of {documents.length} uploaded</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold text-primary-600">{progress}%</span>
                    <p className="text-xs text-slate-400">Complete</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-slate-100 rounded-full mb-5 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                />
            </div>

            {/* Documents List */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                {documents.map((doc, index) => {
                    const config = statusConfig[doc.status]
                    const StatusIcon = config.icon

                    return (
                        <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ x: 4, backgroundColor: 'rgba(248, 250, 252, 1)' }}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 cursor-pointer transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                                    <StatusIcon className={`w-4 h-4 ${config.color}`} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                        {doc.name}
                                        {doc.required && (
                                            <span className="text-red-400 text-xs">*</span>
                                        )}
                                    </p>
                                    <p className={`text-xs ${config.color}`}>{config.label}</p>
                                </div>
                            </div>

                            {doc.status === 'required' || doc.status === 'pending' ? (
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="p-2 rounded-lg bg-primary-100 text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Upload className="w-4 h-4" />
                                </motion.button>
                            ) : (
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                            )}
                        </motion.div>
                    )
                })}
            </div>

            {/* Upload Button */}
            <Link to="/documents">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full mt-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 hover:shadow-xl transition-shadow"
                >
                    <Upload className="w-4 h-4" />
                    Upload Documents
                </motion.button>
            </Link>
        </motion.div>
    )
}
