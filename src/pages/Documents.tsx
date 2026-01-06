import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowLeft,
    Upload,
    FileText,
    Image,
    File,
    CheckCircle,
    Clock,
    AlertCircle,
    X,
    Download,
    Trash2,
    Eye,
    Loader2,
    FolderOpen,
    CloudUpload
} from 'lucide-react'

interface Document {
    id: string
    name: string
    file_name: string
    file_path: string
    file_size: number
    file_type: string
    status: 'pending' | 'approved' | 'rejected' | 'reviewing'
    uploaded_at: string
    notes?: string
}

interface UploadingFile {
    id: string
    file: File
    progress: number
    status: 'uploading' | 'success' | 'error'
    error?: string
}

const ACCEPTED_FILE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const documentCategories = [
    { id: 'passport', name: 'Passport Copy', required: true },
    { id: 'license', name: 'Professional License', required: true },
    { id: 'degree', name: 'Degree Certificate', required: true },
    { id: 'transcript', name: 'Academic Transcript', required: true },
    { id: 'experience', name: 'Experience Letter', required: true },
    { id: 'good_standing', name: 'Good Standing Certificate', required: false },
    { id: 'other', name: 'Other Documents', required: false }
]

const statusConfig = {
    pending: {
        icon: Clock,
        color: 'text-amber-600',
        bg: 'bg-amber-100',
        label: 'Pending Review'
    },
    reviewing: {
        icon: Eye,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        label: 'Under Review'
    },
    approved: {
        icon: CheckCircle,
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: 'Approved'
    },
    rejected: {
        icon: AlertCircle,
        color: 'text-red-600',
        bg: 'bg-red-100',
        label: 'Needs Resubmission'
    }
}

function getFileIcon(fileType: string) {
    if (fileType.startsWith('image/')) return Image
    if (fileType === 'application/pdf') return FileText
    return File
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function Documents() {
    const [documents, setDocuments] = useState<Document[]>([])
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [isDragging, setIsDragging] = useState(false)
    const [personId, setPersonId] = useState<string | null>(null)

    useEffect(() => {
        loadDocuments()
    }, [])

    const loadDocuments = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user?.email) throw new Error('Not authenticated')

            // Get person ID
            const { data: personData, error: personError } = await supabase
                .from('persons')
                .select('id')
                .or(`email.eq.${user.email},primary_email.eq.${user.email}`)
                .single()

            if (personError || !personData) {
                throw new Error('Could not find your profile')
            }

            setPersonId(personData.id)

            // Load documents for this person
            const { data: docs, error: docsError } = await supabase
                .from('client_documents')
                .select('*')
                .eq('person_id', personData.id)
                .order('uploaded_at', { ascending: false })

            if (docsError) {
                // Table might not exist yet - that's okay
                console.log('Documents table may not exist yet:', docsError)
                setDocuments([])
            } else {
                setDocuments(docs || [])
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const files = Array.from(e.dataTransfer.files)
        handleFiles(files)
    }, [personId])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        handleFiles(files)
        e.target.value = '' // Reset input
    }

    const handleFiles = async (files: File[]) => {
        if (!personId) {
            setError('Please wait for your profile to load')
            return
        }

        for (const file of files) {
            // Validate file type
            if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
                setError(`File type not supported: ${file.name}. Please upload PDF, images, or Word documents.`)
                continue
            }

            // Validate file size
            if (file.size > MAX_FILE_SIZE) {
                setError(`File too large: ${file.name}. Maximum size is 10MB.`)
                continue
            }

            const uploadId = crypto.randomUUID()
            setUploadingFiles(prev => [...prev, {
                id: uploadId,
                file,
                progress: 0,
                status: 'uploading'
            }])

            try {
                // Create unique file path
                const fileExt = file.name.split('.').pop()
                const fileName = `${personId}/${Date.now()}_${crypto.randomUUID()}.${fileExt}`

                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('client-documents')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false
                    })

                if (uploadError) throw uploadError

                // Update progress to 50% (upload complete)
                setUploadingFiles(prev => prev.map(f =>
                    f.id === uploadId ? { ...f, progress: 50 } : f
                ))

                // Save document record to database
                const { data: docData, error: docError } = await supabase
                    .from('client_documents')
                    .insert({
                        person_id: personId,
                        name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                        file_name: file.name,
                        file_path: uploadData.path,
                        file_size: file.size,
                        file_type: file.type,
                        status: 'pending',
                        uploaded_at: new Date().toISOString()
                    })
                    .select()
                    .single()

                if (docError) throw docError

                // Update progress to 100%
                setUploadingFiles(prev => prev.map(f =>
                    f.id === uploadId ? { ...f, progress: 100, status: 'success' } : f
                ))

                // Add to documents list
                if (docData) {
                    setDocuments(prev => [docData, ...prev])
                }

                // Remove from uploading list after delay
                setTimeout(() => {
                    setUploadingFiles(prev => prev.filter(f => f.id !== uploadId))
                }, 2000)

            } catch (err: any) {
                console.error('Upload error:', err)
                setUploadingFiles(prev => prev.map(f =>
                    f.id === uploadId ? { ...f, status: 'error', error: err.message } : f
                ))
            }
        }
    }

    const handleDownload = async (doc: Document) => {
        try {
            const { data, error } = await supabase.storage
                .from('client-documents')
                .download(doc.file_path)

            if (error) throw error

            // Create download link
            const url = URL.createObjectURL(data)
            const a = document.createElement('a')
            a.href = url
            a.download = doc.file_name
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (err: any) {
            setError('Failed to download file: ' + err.message)
        }
    }

    const handleDelete = async (doc: Document) => {
        if (!confirm('Are you sure you want to delete this document?')) return

        try {
            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from('client-documents')
                .remove([doc.file_path])

            if (storageError) throw storageError

            // Delete from database
            const { error: dbError } = await supabase
                .from('client_documents')
                .delete()
                .eq('id', doc.id)

            if (dbError) throw dbError

            // Remove from local state
            setDocuments(prev => prev.filter(d => d.id !== doc.id))
        } catch (err: any) {
            setError('Failed to delete file: ' + err.message)
        }
    }

    const filteredDocuments = selectedCategory === 'all'
        ? documents
        : documents.filter(d => d.name.toLowerCase().includes(selectedCategory.toLowerCase()))

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                    <p className="text-slate-600">Loading your documents...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-100/50 sticky top-0 z-20">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link
                            to="/dashboard"
                            className="flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-medium">Back to Dashboard</span>
                        </Link>
                        <img
                            src="/elab-logo.png"
                            alt="ELAB Solutions International"
                            className="h-10"
                        />
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <div className="bg-gradient-to-r from-primary-500 to-accent-500 text-white py-10 sm:py-12">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <FolderOpen className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">My Documents</h1>
                            <p className="text-white/80 mt-1">Upload and manage your application documents</p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                {/* Error Message */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <p className="text-red-700">{error}</p>
                            </div>
                            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
                                <X className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Upload Area */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`
                        border-2 border-dashed rounded-2xl p-8 text-center transition-all mb-8
                        ${isDragging
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-slate-300 bg-white hover:border-primary-400 hover:bg-slate-50'
                        }
                    `}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center">
                        <div className={`
                            w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors
                            ${isDragging ? 'bg-primary-100' : 'bg-slate-100'}
                        `}>
                            <CloudUpload className={`w-8 h-8 ${isDragging ? 'text-primary-600' : 'text-slate-400'}`} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">
                            {isDragging ? 'Drop files here' : 'Drag and drop files here'}
                        </h3>
                        <p className="text-slate-500 text-sm mb-4">
                            or click to browse from your device
                        </p>
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <span className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors">
                                <Upload className="w-5 h-5" />
                                Select Files
                            </span>
                        </label>
                        <p className="text-xs text-slate-400 mt-4">
                            Supported formats: PDF, JPG, PNG, WEBP, DOC, DOCX • Max size: 10MB
                        </p>
                    </div>
                </motion.div>

                {/* Uploading Files Progress */}
                <AnimatePresence>
                    {uploadingFiles.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-8 space-y-3"
                        >
                            <h3 className="font-semibold text-slate-800">Uploading...</h3>
                            {uploadingFiles.map(upload => (
                                <div
                                    key={upload.id}
                                    className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-slate-700 truncate">
                                            {upload.file.name}
                                        </span>
                                        {upload.status === 'uploading' && (
                                            <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                                        )}
                                        {upload.status === 'success' && (
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                        )}
                                        {upload.status === 'error' && (
                                            <AlertCircle className="w-4 h-4 text-red-500" />
                                        )}
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${upload.progress}%` }}
                                            className={`h-full rounded-full ${
                                                upload.status === 'error' ? 'bg-red-500' :
                                                upload.status === 'success' ? 'bg-green-500' : 'bg-primary-500'
                                            }`}
                                        />
                                    </div>
                                    {upload.error && (
                                        <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                                    )}
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Required Documents Checklist */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-sm p-6 mb-8"
                >
                    <h3 className="font-semibold text-slate-800 mb-4">Required Documents</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {documentCategories.filter(c => c.required).map(category => {
                            const uploaded = documents.some(d =>
                                d.name.toLowerCase().includes(category.id.replace('_', ' '))
                            )
                            return (
                                <div
                                    key={category.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl ${
                                        uploaded ? 'bg-green-50' : 'bg-slate-50'
                                    }`}
                                >
                                    {uploaded ? (
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                                    )}
                                    <span className={`text-sm ${uploaded ? 'text-green-700' : 'text-slate-600'}`}>
                                        {category.name}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </motion.div>

                {/* Documents List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl shadow-sm overflow-hidden"
                >
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-800">
                                Uploaded Documents ({documents.length})
                            </h3>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="all">All Documents</option>
                                {documentCategories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {filteredDocuments.length === 0 ? (
                        <div className="p-12 text-center">
                            <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No documents uploaded yet</p>
                            <p className="text-sm text-slate-400 mt-1">
                                Upload your documents using the area above
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredDocuments.map((doc, index) => {
                                const FileIcon = getFileIcon(doc.file_type)
                                const status = statusConfig[doc.status]
                                const StatusIcon = status.icon

                                return (
                                    <motion.div
                                        key={doc.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="p-4 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                <FileIcon className="w-6 h-6 text-slate-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-slate-800 truncate">
                                                    {doc.name}
                                                </h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs text-slate-400">
                                                        {formatFileSize(doc.file_size)}
                                                    </span>
                                                    <span className="text-xs text-slate-300">•</span>
                                                    <span className="text-xs text-slate-400">
                                                        {new Date(doc.uploaded_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bg}`}>
                                                <StatusIcon className={`w-4 h-4 ${status.color}`} />
                                                <span className={`text-xs font-medium ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleDownload(doc)}
                                                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-primary-600 transition-colors"
                                                    title="Download"
                                                >
                                                    <Download className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(doc)}
                                                    className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                        {doc.notes && (
                                            <p className="mt-2 ml-16 text-sm text-slate-500 bg-slate-50 p-2 rounded-lg">
                                                {doc.notes}
                                            </p>
                                        )}
                                    </motion.div>
                                )
                            })}
                        </div>
                    )}
                </motion.div>

                {/* Help Text */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center text-sm text-slate-400 mt-8"
                >
                    Need help? Contact us at{' '}
                    <a href="mailto:support@elabsolution.org" className="text-primary-600 hover:underline">
                        support@elabsolution.org
                    </a>
                </motion.p>
            </div>
        </div>
    )
}
