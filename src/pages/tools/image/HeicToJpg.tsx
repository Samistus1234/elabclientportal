import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import heic2any from 'heic2any'
import ToolsLayout from '@/components/tools/ToolsLayout'
import FileDropzone from '@/components/tools/FileDropzone'
import { Loader2, Download, Trash2, Smartphone } from 'lucide-react'

interface ConvertedImage {
    original: File
    converted: Blob
    preview: string
}

export default function HeicToJpg() {
    const [files, setFiles] = useState<File[]>([])
    const [quality, setQuality] = useState(0.92)
    const [processing, setProcessing] = useState(false)
    const [progress, setProgress] = useState(0)
    const [results, setResults] = useState<ConvertedImage[]>([])

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
        setProgress(0)
        const newResults: ConvertedImage[] = []

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            try {
                const result = await heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: quality
                })

                const blob = Array.isArray(result) ? result[0] : result
                const preview = URL.createObjectURL(blob)

                newResults.push({
                    original: file,
                    converted: blob,
                    preview
                })

                setProgress(((i + 1) / files.length) * 100)
            } catch (err) {
                console.error('Conversion error:', err)
            }
        }

        setResults(newResults)
        setProcessing(false)
    }

    const downloadImage = (result: ConvertedImage) => {
        const link = document.createElement('a')
        const baseName = result.original.name.replace(/\.[^/.]+$/, '')
        link.download = `${baseName}.jpg`
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
        setProgress(0)
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / 1048576).toFixed(2) + ' MB'
    }

    return (
        <ToolsLayout
            title="HEIC to JPG"
            description="Convert iPhone HEIC photos to universal JPG format"
        >
            <div className="space-y-6">
                {/* Info Banner */}
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <Smartphone className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-blue-800 font-medium">
                            HEIC is Apple's image format
                        </p>
                        <p className="text-sm text-blue-600 mt-1">
                            iPhone photos are saved as HEIC by default. Convert them to JPG for universal compatibility.
                        </p>
                    </div>
                </div>

                {/* File Upload */}
                {results.length === 0 && (
                    <>
                        <FileDropzone
                            accept=".heic,.HEIC,image/heic,image/heif"
                            multiple={true}
                            maxSize={52428800}
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

                                {/* Quality Slider */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-700">
                                            JPG Quality
                                        </label>
                                        <span className="text-sm font-mono text-slate-600 bg-white px-2 py-1 rounded">
                                            {Math.round(quality * 100)}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="1"
                                        step="0.05"
                                        value={quality}
                                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                                    />
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>Smaller file</span>
                                        <span>Better quality</span>
                                    </div>
                                </div>

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
                                            Converting... {Math.round(progress)}%
                                        </>
                                    ) : (
                                        <>
                                            Convert {files.length} Image{files.length > 1 ? 's' : ''} to JPG
                                        </>
                                    )}
                                </motion.button>

                                {/* Progress Bar */}
                                {processing && (
                                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            className="h-full bg-gradient-to-r from-primary-500 to-blue-600"
                                        />
                                    </div>
                                )}
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
                                    {results.length} image{results.length > 1 ? 's' : ''} converted to JPG
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
                        <div className="grid sm:grid-cols-2 gap-4">
                            {results.map((result, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-slate-50 rounded-xl overflow-hidden"
                                >
                                    {/* Preview */}
                                    <div className="aspect-video bg-slate-200">
                                        <img
                                            src={result.preview}
                                            alt={result.original.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="p-4">
                                        <p className="font-medium text-slate-800 truncate mb-1">
                                            {result.original.name.replace(/\.[^/.]+$/, '')}.jpg
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-slate-500">
                                                {formatSize(result.converted.size)}
                                            </p>
                                            <button
                                                onClick={() => downloadImage(result)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-200 transition-colors"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Process More */}
                        <button
                            onClick={clearAll}
                            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
                        >
                            Convert More HEIC Images
                        </button>
                    </motion.div>
                )}
            </div>
        </ToolsLayout>
    )
}
