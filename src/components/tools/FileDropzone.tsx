import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react'

interface FileDropzoneProps {
    accept: string
    multiple?: boolean
    maxSize?: number // in bytes
    maxFiles?: number
    onFilesSelected: (files: File[]) => void
    files: File[]
    onRemoveFile: (index: number) => void
    fileType?: 'pdf' | 'image' | 'any'
}

export default function FileDropzone({
    accept,
    multiple = false,
    maxSize = 52428800, // 50MB default
    maxFiles = 20,
    onFilesSelected,
    files,
    onRemoveFile,
    fileType = 'any'
}: FileDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const validateFiles = useCallback((fileList: FileList | File[]): File[] => {
        const validFiles: File[] = []
        const fileArray = Array.from(fileList)

        for (const file of fileArray) {
            if (file.size > maxSize) {
                setError(`File "${file.name}" exceeds ${Math.round(maxSize / 1048576)}MB limit`)
                continue
            }

            if (files.length + validFiles.length >= maxFiles) {
                setError(`Maximum ${maxFiles} files allowed`)
                break
            }

            validFiles.push(file)
        }

        if (validFiles.length > 0) {
            setError(null)
        }

        return validFiles
    }, [files.length, maxFiles, maxSize])

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

        const validFiles = validateFiles(e.dataTransfer.files)
        if (validFiles.length > 0) {
            onFilesSelected(multiple ? validFiles : [validFiles[0]])
        }
    }, [validateFiles, onFilesSelected, multiple])

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const validFiles = validateFiles(e.target.files)
            if (validFiles.length > 0) {
                onFilesSelected(multiple ? validFiles : [validFiles[0]])
            }
        }
        e.target.value = ''
    }, [validateFiles, onFilesSelected, multiple])

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / 1048576).toFixed(1) + ' MB'
    }

    const FileIcon = fileType === 'pdf' ? FileText : fileType === 'image' ? ImageIcon : FileText

    return (
        <div className="space-y-4">
            {/* Dropzone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    isDragging
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
                }`}
            >
                <input
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <motion.div
                    animate={isDragging ? { scale: 1.05 } : { scale: 1 }}
                    className="flex flex-col items-center gap-3"
                >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                        isDragging ? 'bg-primary-100' : 'bg-slate-100'
                    }`}>
                        <Upload className={`w-8 h-8 ${isDragging ? 'text-primary-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                        <p className="text-slate-700 font-medium">
                            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                            or click to browse
                        </p>
                    </div>
                    <p className="text-xs text-slate-400">
                        {multiple ? `Up to ${maxFiles} files, ` : ''}Max {Math.round(maxSize / 1048576)}MB per file
                    </p>
                </motion.div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                    >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* File List */}
            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                    >
                        {files.map((file, index) => (
                            <motion.div
                                key={`${file.name}-${index}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                            >
                                <FileIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => onRemoveFile(index)}
                                    className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                    <X className="w-4 h-4 text-slate-500" />
                                </button>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
