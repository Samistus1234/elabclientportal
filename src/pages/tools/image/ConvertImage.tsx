import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import ToolsLayout from '@/components/tools/ToolsLayout'
import FileDropzone from '@/components/tools/FileDropzone'
import { Loader2, Download, Trash2, ArrowRight, Check } from 'lucide-react'

type OutputFormat = 'jpeg' | 'png' | 'webp'

interface ConvertedImage {
    original: File
    converted: Blob
    format: OutputFormat
    preview: string
}

export default function ConvertImage() {
    const [files, setFiles] = useState<File[]>([])
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpeg')
    const [quality, setQuality] = useState(0.9)
    const [processing, setProcessing] = useState(false)
    const [results, setResults] = useState<ConvertedImage[]>([])

    const formats: { id: OutputFormat; label: string; ext: string }[] = [
        { id: 'jpeg', label: 'JPEG', ext: 'jpg' },
        { id: 'png', label: 'PNG', ext: 'png' },
        { id: 'webp', label: 'WebP', ext: 'webp' }
    ]

    const handleFilesSelected = useCallback((newFiles: File[]) => {
        setFiles(prev => [...prev, ...newFiles])
        setResults([])
    }, [])

    const handleRemoveFile = useCallback((index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }, [])

    const convertImages = async () => {
        if (files.length === 0) return

        setProcessing(true)
        const newResults: ConvertedImage[] = []

        for (const file of files) {
            try {
                // Create image element
                const img = await createImageBitmap(file)

                // Create canvas
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height

                const ctx = canvas.getContext('2d')
                if (!ctx) throw new Error('Canvas context not available')

                // Draw image
                ctx.drawImage(img, 0, 0)

                // Convert to blob
                const blob = await new Promise<Blob>((resolve, reject) => {
                    canvas.toBlob(
                        (blob) => blob ? resolve(blob) : reject(new Error('Conversion failed')),
                        `image/${outputFormat}`,
                        quality
                    )
                })

                const preview = URL.createObjectURL(blob)

                newResults.push({
                    original: file,
                    converted: blob,
                    format: outputFormat,
                    preview
                })
            } catch (err) {
                console.error('Conversion error:', err)
            }
        }

        setResults(newResults)
        setProcessing(false)
    }

    const downloadImage = (result: ConvertedImage) => {
        const link = document.createElement('a')
        const ext = formats.find(f => f.id === result.format)?.ext || result.format
        const baseName = result.original.name.replace(/\.[^/.]+$/, '')
        link.download = `${baseName}.${ext}`
        link.href = URL.createObjectURL(result.converted)
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

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / 1048576).toFixed(2) + ' MB'
    }

    return (
        <ToolsLayout
            title="Convert Image"
            description="Convert images between JPEG, PNG, and WebP formats"
        >
            <div className="space-y-6">
                {/* File Upload */}
                {results.length === 0 && (
                    <>
                        <FileDropzone
                            accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
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
                                <h3 className="font-semibold text-slate-800">Conversion Options</h3>

                                {/* Format Selection */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">
                                        Output Format
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {formats.map((format) => (
                                            <button
                                                key={format.id}
                                                onClick={() => setOutputFormat(format.id)}
                                                className={`relative p-4 rounded-xl border-2 transition-all ${
                                                    outputFormat === format.id
                                                        ? 'border-primary-500 bg-primary-50'
                                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                                }`}
                                            >
                                                {outputFormat === format.id && (
                                                    <div className="absolute top-2 right-2">
                                                        <Check className="w-4 h-4 text-primary-600" />
                                                    </div>
                                                )}
                                                <p className="font-semibold text-slate-800">{format.label}</p>
                                                <p className="text-xs text-slate-500 mt-1">.{format.ext}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Quality Slider (for JPEG and WebP) */}
                                {outputFormat !== 'png' && (
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
                                    </div>
                                )}

                                {/* Convert Button */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={convertImages}
                                    disabled={processing}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-200 disabled:opacity-50"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Converting...
                                        </>
                                    ) : (
                                        <>
                                            Convert to {formats.find(f => f.id === outputFormat)?.label}
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
                                    {results.length} image{results.length > 1 ? 's' : ''} converted to {formats.find(f => f.id === outputFormat)?.label}
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
                                            <span>{result.original.name.split('.').pop()?.toUpperCase()}</span>
                                            <ArrowRight className="w-4 h-4" />
                                            <span className="text-primary-600 font-medium">
                                                {formats.find(f => f.id === result.format)?.label}
                                            </span>
                                            <span className="text-slate-400">
                                                ({formatSize(result.converted.size)})
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
                            Convert More Images
                        </button>
                    </motion.div>
                )}
            </div>
        </ToolsLayout>
    )
}
