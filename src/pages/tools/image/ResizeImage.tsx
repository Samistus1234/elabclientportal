import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import ToolsLayout from '@/components/tools/ToolsLayout'
import FileDropzone from '@/components/tools/FileDropzone'
import { Loader2, Download, Trash2, Link, Unlink } from 'lucide-react'

interface PresetSize {
    label: string
    width: number
    height: number
}

const presets: PresetSize[] = [
    { label: 'Instagram Post', width: 1080, height: 1080 },
    { label: 'Instagram Story', width: 1080, height: 1920 },
    { label: 'Twitter Post', width: 1200, height: 675 },
    { label: 'Facebook Cover', width: 820, height: 312 },
    { label: 'HD 1080p', width: 1920, height: 1080 },
    { label: '4K', width: 3840, height: 2160 }
]

interface ResizedImage {
    original: File
    resized: Blob
    width: number
    height: number
    preview: string
}

export default function ResizeImage() {
    const [files, setFiles] = useState<File[]>([])
    const [width, setWidth] = useState(1920)
    const [height, setHeight] = useState(1080)
    const [maintainAspect, setMaintainAspect] = useState(true)
    const [originalAspect, setOriginalAspect] = useState<number | null>(null)
    const [processing, setProcessing] = useState(false)
    const [results, setResults] = useState<ResizedImage[]>([])

    const handleFilesSelected = useCallback((newFiles: File[]) => {
        setFiles(prev => [...prev, ...newFiles])
        setResults([])

        // Get aspect ratio from first file
        if (newFiles.length > 0) {
            const img = new Image()
            img.onload = () => {
                setOriginalAspect(img.width / img.height)
                setWidth(img.width)
                setHeight(img.height)
                URL.revokeObjectURL(img.src)
            }
            img.src = URL.createObjectURL(newFiles[0])
        }
    }, [])

    const handleRemoveFile = useCallback((index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
        if (files.length === 1) {
            setOriginalAspect(null)
        }
    }, [files.length])

    const handleWidthChange = (newWidth: number) => {
        setWidth(newWidth)
        if (maintainAspect && originalAspect) {
            setHeight(Math.round(newWidth / originalAspect))
        }
    }

    const handleHeightChange = (newHeight: number) => {
        setHeight(newHeight)
        if (maintainAspect && originalAspect) {
            setWidth(Math.round(newHeight * originalAspect))
        }
    }

    const applyPreset = (preset: PresetSize) => {
        setWidth(preset.width)
        setHeight(preset.height)
        setMaintainAspect(false)
    }

    const resizeImages = async () => {
        if (files.length === 0) return

        setProcessing(true)
        const newResults: ResizedImage[] = []

        for (const file of files) {
            try {
                const img = await createImageBitmap(file)
                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (!ctx) throw new Error('Canvas context not available')

                // Draw resized image
                ctx.drawImage(img, 0, 0, width, height)

                // Get format from original file
                const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
                const blob = await new Promise<Blob>((resolve, reject) => {
                    canvas.toBlob(
                        (blob) => blob ? resolve(blob) : reject(new Error('Resize failed')),
                        format,
                        0.92
                    )
                })

                const preview = URL.createObjectURL(blob)

                newResults.push({
                    original: file,
                    resized: blob,
                    width,
                    height,
                    preview
                })
            } catch (err) {
                console.error('Resize error:', err)
            }
        }

        setResults(newResults)
        setProcessing(false)
    }

    const downloadImage = (result: ResizedImage) => {
        const link = document.createElement('a')
        const ext = result.original.name.split('.').pop() || 'jpg'
        const baseName = result.original.name.replace(/\.[^/.]+$/, '')
        link.download = `${baseName}_${result.width}x${result.height}.${ext}`
        link.href = URL.createObjectURL(result.resized)
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
        setOriginalAspect(null)
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / 1048576).toFixed(2) + ' MB'
    }

    return (
        <ToolsLayout
            title="Resize Image"
            description="Resize images to specific dimensions"
        >
            <div className="space-y-6">
                {/* File Upload */}
                {results.length === 0 && (
                    <>
                        <FileDropzone
                            accept="image/jpeg,image/png,image/webp"
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
                                <h3 className="font-semibold text-slate-800">Resize Options</h3>

                                {/* Presets */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">
                                        Presets
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {presets.map((preset) => (
                                            <button
                                                key={preset.label}
                                                onClick={() => applyPreset(preset)}
                                                className={`p-3 text-left rounded-lg border-2 transition-all ${
                                                    width === preset.width && height === preset.height
                                                        ? 'border-primary-500 bg-primary-50'
                                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                                }`}
                                            >
                                                <p className="text-sm font-medium text-slate-800">{preset.label}</p>
                                                <p className="text-xs text-slate-500">{preset.width} x {preset.height}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Dimensions */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-700">
                                            Custom Dimensions
                                        </label>
                                        <button
                                            onClick={() => setMaintainAspect(!maintainAspect)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                                maintainAspect
                                                    ? 'bg-primary-100 text-primary-700'
                                                    : 'bg-slate-200 text-slate-600'
                                            }`}
                                        >
                                            {maintainAspect ? (
                                                <Link className="w-4 h-4" />
                                            ) : (
                                                <Unlink className="w-4 h-4" />
                                            )}
                                            Aspect Ratio
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">Width (px)</label>
                                            <input
                                                type="number"
                                                value={width}
                                                onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                                                min="1"
                                                max="8192"
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">Height (px)</label>
                                            <input
                                                type="number"
                                                value={height}
                                                onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                                                min="1"
                                                max="8192"
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Resize Button */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={resizeImages}
                                    disabled={processing || width < 1 || height < 1}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-200 disabled:opacity-50"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Resizing...
                                        </>
                                    ) : (
                                        <>
                                            Resize to {width} x {height}
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
                                    {results.length} image{results.length > 1 ? 's' : ''} resized to {width} x {height}
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
                                        <p className="text-sm text-slate-500">
                                            {result.width} x {result.height} ({formatSize(result.resized.size)})
                                        </p>
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
                            Resize More Images
                        </button>
                    </motion.div>
                )}
            </div>
        </ToolsLayout>
    )
}
