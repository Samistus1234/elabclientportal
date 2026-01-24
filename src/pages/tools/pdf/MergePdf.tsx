import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PDFDocument } from 'pdf-lib'
import ToolsLayout from '@/components/tools/ToolsLayout'
import FileDropzone from '@/components/tools/FileDropzone'
import DownloadButton from '@/components/tools/DownloadButton'
import { Loader2, GripVertical, Trash2, ArrowUp, ArrowDown } from 'lucide-react'

interface PDFFile {
    file: File
    pageCount: number
}

export default function MergePdf() {
    const [files, setFiles] = useState<PDFFile[]>([])
    const [processing, setProcessing] = useState(false)
    const [result, setResult] = useState<Blob | null>(null)
    const [loading, setLoading] = useState(false)

    const handleFilesSelected = useCallback(async (newFiles: File[]) => {
        setLoading(true)
        const pdfFiles: PDFFile[] = []

        for (const file of newFiles) {
            try {
                const arrayBuffer = await file.arrayBuffer()
                const pdf = await PDFDocument.load(arrayBuffer)
                pdfFiles.push({
                    file,
                    pageCount: pdf.getPageCount()
                })
            } catch (err) {
                console.error('Error loading PDF:', err)
            }
        }

        setFiles(prev => [...prev, ...pdfFiles])
        setResult(null)
        setLoading(false)
    }, [])

    const handleRemoveFile = useCallback((index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
        setResult(null)
    }, [])

    const moveFile = (index: number, direction: 'up' | 'down') => {
        const newFiles = [...files]
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= newFiles.length) return

        [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]]
        setFiles(newFiles)
        setResult(null)
    }

    const mergePdfs = async () => {
        if (files.length < 2) return

        setProcessing(true)
        try {
            const mergedPdf = await PDFDocument.create()

            for (const { file } of files) {
                const arrayBuffer = await file.arrayBuffer()
                const pdf = await PDFDocument.load(arrayBuffer)
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
                copiedPages.forEach(page => mergedPdf.addPage(page))
            }

            const pdfBytes = await mergedPdf.save()
            const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
            setResult(blob)
        } catch (err) {
            console.error('Merge error:', err)
        }
        setProcessing(false)
    }

    const downloadResult = () => {
        if (!result) return
        const link = document.createElement('a')
        link.download = 'merged.pdf'
        link.href = URL.createObjectURL(result)
        link.click()
        URL.revokeObjectURL(link.href)
    }

    const clearAll = () => {
        setFiles([])
        setResult(null)
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / 1048576).toFixed(2) + ' MB'
    }

    const totalPages = files.reduce((acc, f) => acc + f.pageCount, 0)

    return (
        <ToolsLayout
            title="Merge PDF"
            description="Combine multiple PDF files into one document"
        >
            <div className="space-y-6">
                {/* File Upload */}
                <FileDropzone
                    accept="application/pdf,.pdf"
                    multiple={true}
                    maxSize={52428800}
                    maxFiles={20}
                    onFilesSelected={handleFilesSelected}
                    files={files.map(f => f.file)}
                    onRemoveFile={handleRemoveFile}
                    fileType="pdf"
                />

                {/* Loading indicator */}
                {loading && (
                    <div className="flex items-center justify-center gap-2 py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                        <span className="text-slate-600">Loading PDFs...</span>
                    </div>
                )}

                {/* File List with Reordering */}
                {files.length > 0 && !loading && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-600">
                                {files.length} file{files.length > 1 ? 's' : ''} • {totalPages} total page{totalPages > 1 ? 's' : ''}
                            </p>
                            <button
                                onClick={clearAll}
                                className="text-sm text-red-600 hover:text-red-700"
                            >
                                Clear all
                            </button>
                        </div>

                        <div className="space-y-2">
                            {files.map((pdfFile, index) => (
                                <motion.div
                                    key={`${pdfFile.file.name}-${index}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                                >
                                    <GripVertical className="w-5 h-5 text-slate-400 cursor-grab" />

                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-700 truncate">
                                            {pdfFile.file.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {pdfFile.pageCount} page{pdfFile.pageCount > 1 ? 's' : ''} • {formatSize(pdfFile.file.size)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => moveFile(index, 'up')}
                                            disabled={index === 0}
                                            className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <ArrowUp className="w-4 h-4 text-slate-600" />
                                        </button>
                                        <button
                                            onClick={() => moveFile(index, 'down')}
                                            disabled={index === files.length - 1}
                                            className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <ArrowDown className="w-4 h-4 text-slate-600" />
                                        </button>
                                        <button
                                            onClick={() => handleRemoveFile(index)}
                                            className="p-1.5 rounded hover:bg-red-100 text-red-500"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Merge Button */}
                        {files.length >= 2 && !result && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={mergePdfs}
                                disabled={processing}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-200 disabled:opacity-50"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Merging PDFs...
                                    </>
                                ) : (
                                    <>Merge {files.length} PDFs</>
                                )}
                            </motion.button>
                        )}

                        {files.length < 2 && (
                            <p className="text-center text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                                Add at least 2 PDF files to merge
                            </p>
                        )}
                    </motion.div>
                )}

                {/* Result */}
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4 p-6 bg-green-50 border border-green-200 rounded-xl text-center"
                    >
                        <div>
                            <p className="font-semibold text-green-800">PDFs merged successfully!</p>
                            <p className="text-sm text-green-600">
                                {totalPages} pages combined • {formatSize(result.size)}
                            </p>
                        </div>
                        <DownloadButton onClick={downloadResult}>
                            Download Merged PDF
                        </DownloadButton>
                        <button
                            onClick={clearAll}
                            className="block w-full text-sm text-slate-600 hover:text-slate-800"
                        >
                            Merge more PDFs
                        </button>
                    </motion.div>
                )}
            </div>
        </ToolsLayout>
    )
}
