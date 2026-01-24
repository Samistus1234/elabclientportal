import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import imageCompression from 'browser-image-compression'
import ToolsLayout from '@/components/tools/ToolsLayout'
import FileDropzone from '@/components/tools/FileDropzone'
import { Loader2, ArrowRight, Trash2, Download } from 'lucide-react'

interface CompressedImage {
    original: File
    compressed: Blob
    originalSize: number
    compressedSize: number
    savings: number
    preview: string
}

export default function CompressImage() {
    const [files, setFiles] = useState<File[]>([])
    const [quality, setQuality] = useState(0.8)
    const [maxWidth, setMaxWidth] = useState(1920)
    const [processing, setProcessing] = useState(false)
    const [results, setResults] = useState<CompressedImage[]>([])

    const handleFilesSelected = useCallback((newFiles: File[]) => {
        setFiles(prev => [...prev, ...newFiles])
        setResults([])
    }, [])

    const handleRemoveFile = useCallback((index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }, [])

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / 1048576).toFixed(2) + ' MB'
    }

    const compressImages = async () => {
        if (files.length === 0) return

        setProcessing(true)
        const newResults: CompressedImage[] = []

        for (const file of files) {
            try {
                const options = {
                    maxSizeMB: 10,
                    maxWidthOrHeight: maxWidth,
                    useWebWorker: true,
                    initialQuality: quality
                }

                const compressed = await imageCompression(file, options)
                const preview = URL.createObjectURL(compressed)
                const savings = ((file.size - compressed.size) / file.size) * 100

                newResults.push({
                    original: file,
                    compressed,
                    originalSize: file.size,
                    compressedSize: compressed.size,
                    savings: Math.max(0, savings),
                    preview
                })
            } catch (err) {
                console.error('Compression error:', err)
            }
        }

        setResults(newResults)
        setProcessing(false)
    }

    const downloadImage = (result: CompressedImage) => {
        const link = document.createElement('a')
        const ext = result.original.name.split('.').pop() || 'jpg'
        const baseName = result.original.name.replace(/\.[^/.]+$/, '')
        link.download = `${baseName}_compressed.${ext}`
        link.href = URL.createObjectURL(result.compressed)
        link.click()
        URL.revokeObjectURL(link.href)
    }

    const downloadAll = () => {
        results.forEach((result, index) => {
            setTimeout(() => downloadImage(result), index * 200)
        })
    }

    const clearAll = () => {
        results.forEach(r => URL.revokeObjectURL(r.preview))
        setFiles([])
        setResults([])
    }

    return (
        <ToolsLayout
            title="Compress Image"
            description="Reduce image file size while maintaining quality"
        >
            <div className="space-y-6">
                {/* File Upload */}
                {results.length === 0 && (
                    <>
                        <FileDropzone
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            multiple={true}
                            maxSize={10485760}
                            onFilesSelected={handleFilesSelected}
                            files={files}
                            onRemoveFile={handleRemoveFile}
                            fileType="image"
                        />

                        {/* Options */}
                        {files.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-6 p-6 bg-slate-50 rounded-xl"
                            >
                                <h3 className="font-semibold text-slate-800">Compression Options</h3>

                                {/* Quality Slider */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-700">
                                            Quality
                                        </label>
                                        <span className="text-sm font-mono text-slate-600 bg-white px-2 py-1 rounded">
                                            {Math.round(quality * 100)}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="1"
                                        step="0.1"
                                        value={quality}
                                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                    />
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>Smaller file</span>
                                        <span>Better quality</span>
                                    </div>
                                </div>

                                {/* Max Width */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-700">
                                            Max Width/Height
                                        </label>
                                        <span className="text-sm font-mono text-slate-600 bg-white px-2 py-1 rounded">
                                            {maxWidth}px
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="640"
                                        max="4096"
                                        step="128"
                                        value={maxWidth}
                                        onChange={(e) => setMaxWidth(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                    />
                                </div>

                                {/* Compress Button */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={compressImages}
                                    disabled={processing}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-200 disabled:opacity-50"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Compressing...
                                        </>
                                    ) : (
                                        <>
                                            Compress {files.length} Image{files.length > 1 ? 's' : ''}
                                        </>
                                    )}
                                </motion.button>
                            </motion.div>
                        )}
                    </>
                )}

                {/* Results */}
                {results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        {/* Summary */}
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
                            <div>
                                <p className="font-medium text-green-800">
                                    {results.length} image{results.length > 1 ? 's' : ''} compressed successfully
                                </p>
                                <p className="text-sm text-green-600">
                                    Total savings: {formatSize(results.reduce((acc, r) => acc + (r.originalSize - r.compressedSize), 0))}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={clearAll}
                                    className="p-2 rounded-lg hover:bg-green-100 text-green-700 transition-colors"
                                    title="Start over"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={downloadAll}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Download All
                                </motion.button>
                            </div>
                        </div>

                        {/* Individual Results */}
                        <div className="space-y-3">
                            {results.map((result, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl"
                                >
                                    {/* Preview */}
                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                                        <img
                                            src={result.preview}
                                            alt={result.original.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 truncate">
                                            {result.original.name}
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <span>{formatSize(result.originalSize)}</span>
                                            <ArrowRight className="w-4 h-4" />
                                            <span className="text-green-600 font-medium">
                                                {formatSize(result.compressedSize)}
                                            </span>
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                -{result.savings.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Download */}
                                    <button
                                        onClick={() => downloadImage(result)}
                                        className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                </motion.div>
                            ))}
                        </div>

                        {/* Process More */}
                        <button
                            onClick={clearAll}
                            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
                        >
                            Compress More Images
                        </button>
                    </motion.div>
                )}
            </div>
        </ToolsLayout>
    )
}
