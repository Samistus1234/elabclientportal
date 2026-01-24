import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PDFDocument } from 'pdf-lib'
import ToolsLayout from '@/components/tools/ToolsLayout'
import FileDropzone from '@/components/tools/FileDropzone'
import DownloadButton from '@/components/tools/DownloadButton'
import { Loader2, FileText, ArrowRight, AlertCircle } from 'lucide-react'

interface CompressionResult {
    originalSize: number
    compressedSize: number
    blob: Blob
    savings: number
}

export default function CompressPdf() {
    const [file, setFile] = useState<File | null>(null)
    const [pageCount, setPageCount] = useState(0)
    const [processing, setProcessing] = useState(false)
    const [result, setResult] = useState<CompressionResult | null>(null)

    const handleFilesSelected = useCallback(async (newFiles: File[]) => {
        const selectedFile = newFiles[0]
        if (!selectedFile) return

        try {
            const arrayBuffer = await selectedFile.arrayBuffer()
            const pdf = await PDFDocument.load(arrayBuffer)

            setFile(selectedFile)
            setPageCount(pdf.getPageCount())
            setResult(null)
        } catch (err) {
            console.error('Error loading PDF:', err)
        }
    }, [])

    const handleRemoveFile = useCallback(() => {
        setFile(null)
        setPageCount(0)
        setResult(null)
    }, [])

    const compressPdf = async () => {
        if (!file) return

        setProcessing(true)
        try {
            const arrayBuffer = await file.arrayBuffer()
            const pdf = await PDFDocument.load(arrayBuffer, {
                updateMetadata: false
            })

            // Remove metadata to reduce size
            pdf.setTitle('')
            pdf.setAuthor('')
            pdf.setSubject('')
            pdf.setKeywords([])
            pdf.setProducer('')
            pdf.setCreator('')

            // Save with compression options
            const pdfBytes = await pdf.save({
                useObjectStreams: true,
                addDefaultPage: false,
            })

            const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
            const savings = ((file.size - blob.size) / file.size) * 100

            setResult({
                originalSize: file.size,
                compressedSize: blob.size,
                blob,
                savings: Math.max(0, savings)
            })
        } catch (err) {
            console.error('Compression error:', err)
        }
        setProcessing(false)
    }

    const downloadResult = () => {
        if (!result || !file) return
        const link = document.createElement('a')
        const baseName = file.name.replace(/\.pdf$/i, '')
        link.download = `${baseName}_compressed.pdf`
        link.href = URL.createObjectURL(result.blob)
        link.click()
        URL.revokeObjectURL(link.href)
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / 1048576).toFixed(2) + ' MB'
    }

    return (
        <ToolsLayout
            title="Compress PDF"
            description="Reduce PDF file size while maintaining quality"
        >
            <div className="space-y-6">
                {/* Info Banner */}
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-blue-800 font-medium">
                            Client-side compression
                        </p>
                        <p className="text-sm text-blue-600 mt-1">
                            This tool removes metadata and optimizes the PDF structure. For maximum compression of image-heavy PDFs, consider using a server-based tool.
                        </p>
                    </div>
                </div>

                {/* File Upload */}
                {!file && (
                    <FileDropzone
                        accept="application/pdf,.pdf"
                        multiple={false}
                        maxSize={52428800}
                        onFilesSelected={handleFilesSelected}
                        files={file ? [file] : []}
                        onRemoveFile={handleRemoveFile}
                        fileType="pdf"
                    />
                )}

                {/* File Info & Compress */}
                {file && !result && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-6"
                    >
                        {/* File Info */}
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                            <FileText className="w-8 h-8 text-primary-500" />
                            <div className="flex-1">
                                <p className="font-medium text-slate-800">{file.name}</p>
                                <p className="text-sm text-slate-500">
                                    {pageCount} pages • {formatSize(file.size)}
                                </p>
                            </div>
                            <button
                                onClick={handleRemoveFile}
                                className="text-sm text-red-600 hover:text-red-700"
                            >
                                Change file
                            </button>
                        </div>

                        {/* Compress Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={compressPdf}
                            disabled={processing}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-200 disabled:opacity-50"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Compressing PDF...
                                </>
                            ) : (
                                <>Compress PDF</>
                            )}
                        </motion.button>
                    </motion.div>
                )}

                {/* Result */}
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Compression Stats */}
                        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                            <div className="flex items-center justify-center gap-6 mb-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-slate-800">
                                        {formatSize(result.originalSize)}
                                    </p>
                                    <p className="text-sm text-slate-500">Original</p>
                                </div>
                                <ArrowRight className="w-6 h-6 text-green-500" />
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-600">
                                        {formatSize(result.compressedSize)}
                                    </p>
                                    <p className="text-sm text-slate-500">Compressed</p>
                                </div>
                            </div>

                            {result.savings > 0 ? (
                                <div className="text-center">
                                    <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-full font-semibold">
                                        {result.savings.toFixed(1)}% smaller
                                    </span>
                                </div>
                            ) : (
                                <p className="text-center text-sm text-amber-600">
                                    This PDF is already optimized and cannot be compressed further.
                                </p>
                            )}
                        </div>

                        {/* Download Button */}
                        <div className="text-center space-y-3">
                            <DownloadButton onClick={downloadResult}>
                                Download Compressed PDF
                            </DownloadButton>
                            <button
                                onClick={() => {
                                    setFile(null)
                                    setResult(null)
                                }}
                                className="block w-full text-sm text-slate-600 hover:text-slate-800"
                            >
                                Compress another PDF
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </ToolsLayout>
    )
}
