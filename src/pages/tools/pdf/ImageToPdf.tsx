import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PDFDocument } from 'pdf-lib'
import ToolsLayout from '@/components/tools/ToolsLayout'
import FileDropzone from '@/components/tools/FileDropzone'
import DownloadButton from '@/components/tools/DownloadButton'
import { Loader2, Trash2, ArrowUp, ArrowDown, Image as ImageIcon } from 'lucide-react'

interface ImageFile {
    file: File
    preview: string
}

export default function ImageToPdf() {
    const [images, setImages] = useState<ImageFile[]>([])
    const [pageSize, setPageSize] = useState<'fit' | 'a4' | 'letter'>('a4')
    const [processing, setProcessing] = useState(false)
    const [result, setResult] = useState<Blob | null>(null)

    const handleFilesSelected = useCallback(async (newFiles: File[]) => {
        const imageFiles: ImageFile[] = newFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }))
        setImages(prev => [...prev, ...imageFiles])
        setResult(null)
    }, [])

    const handleRemoveFile = useCallback((index: number) => {
        setImages(prev => {
            const removed = prev[index]
            URL.revokeObjectURL(removed.preview)
            return prev.filter((_, i) => i !== index)
        })
        setResult(null)
    }, [])

    const moveImage = (index: number, direction: 'up' | 'down') => {
        const newImages = [...images]
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= newImages.length) return

        [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]]
        setImages(newImages)
        setResult(null)
    }

    const convertToPdf = async () => {
        if (images.length === 0) return

        setProcessing(true)
        try {
            const pdf = await PDFDocument.create()

            // Page dimensions
            const pageSizes = {
                a4: { width: 595.28, height: 841.89 },
                letter: { width: 612, height: 792 },
                fit: null
            }

            for (const imageFile of images) {
                const arrayBuffer = await imageFile.file.arrayBuffer()
                const uint8Array = new Uint8Array(arrayBuffer)

                let image
                const fileType = imageFile.file.type

                if (fileType === 'image/jpeg' || fileType === 'image/jpg') {
                    image = await pdf.embedJpg(uint8Array)
                } else if (fileType === 'image/png') {
                    image = await pdf.embedPng(uint8Array)
                } else {
                    // Convert other formats to PNG via canvas
                    const blob = new Blob([arrayBuffer], { type: fileType })
                    const bitmap = await createImageBitmap(blob)
                    const canvas = document.createElement('canvas')
                    canvas.width = bitmap.width
                    canvas.height = bitmap.height
                    const ctx = canvas.getContext('2d')
                    if (!ctx) continue
                    ctx.drawImage(bitmap, 0, 0)

                    const pngBlob = await new Promise<Blob>((resolve) => {
                        canvas.toBlob((blob) => resolve(blob!), 'image/png')
                    })
                    const pngBuffer = await pngBlob.arrayBuffer()
                    image = await pdf.embedPng(new Uint8Array(pngBuffer))
                }

                const imageDims = image.scale(1)
                let pageWidth, pageHeight

                if (pageSize === 'fit') {
                    pageWidth = imageDims.width
                    pageHeight = imageDims.height
                } else {
                    const size = pageSizes[pageSize]!
                    pageWidth = size.width
                    pageHeight = size.height
                }

                const page = pdf.addPage([pageWidth, pageHeight])

                // Scale image to fit page while maintaining aspect ratio
                const scale = Math.min(
                    pageWidth / imageDims.width,
                    pageHeight / imageDims.height
                )
                const scaledWidth = imageDims.width * scale
                const scaledHeight = imageDims.height * scale

                // Center image on page
                const x = (pageWidth - scaledWidth) / 2
                const y = (pageHeight - scaledHeight) / 2

                page.drawImage(image, {
                    x,
                    y,
                    width: scaledWidth,
                    height: scaledHeight
                })
            }

            const pdfBytes = await pdf.save()
            const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
            setResult(blob)
        } catch (err) {
            console.error('Conversion error:', err)
        }
        setProcessing(false)
    }

    const downloadResult = () => {
        if (!result) return
        const link = document.createElement('a')
        link.download = 'images.pdf'
        link.href = URL.createObjectURL(result)
        link.click()
        URL.revokeObjectURL(link.href)
    }

    const clearAll = () => {
        images.forEach(img => URL.revokeObjectURL(img.preview))
        setImages([])
        setResult(null)
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / 1048576).toFixed(2) + ' MB'
    }

    return (
        <ToolsLayout
            title="Image to PDF"
            description="Convert images to PDF document"
        >
            <div className="space-y-6">
                {/* File Upload */}
                <FileDropzone
                    accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
                    multiple={true}
                    maxSize={10485760}
                    maxFiles={20}
                    onFilesSelected={handleFilesSelected}
                    files={images.map(i => i.file)}
                    onRemoveFile={handleRemoveFile}
                    fileType="image"
                />

                {/* Image List with Reordering */}
                {images.length > 0 && !result && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-600">
                                {images.length} image{images.length > 1 ? 's' : ''} will become {images.length} page{images.length > 1 ? 's' : ''}
                            </p>
                            <button
                                onClick={clearAll}
                                className="text-sm text-red-600 hover:text-red-700"
                            >
                                Clear all
                            </button>
                        </div>

                        {/* Image Preview Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {images.map((imageFile, index) => (
                                <motion.div
                                    key={`${imageFile.file.name}-${index}`}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="relative group"
                                >
                                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-slate-100 border-2 border-slate-200">
                                        <img
                                            src={imageFile.preview}
                                            alt={imageFile.file.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 text-white text-xs rounded">
                                        {index + 1}
                                    </div>
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => moveImage(index, 'up')}
                                            disabled={index === 0}
                                            className="p-1 bg-white rounded shadow disabled:opacity-50"
                                        >
                                            <ArrowUp className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => moveImage(index, 'down')}
                                            disabled={index === images.length - 1}
                                            className="p-1 bg-white rounded shadow disabled:opacity-50"
                                        >
                                            <ArrowDown className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => handleRemoveFile(index)}
                                            className="p-1 bg-red-500 text-white rounded shadow"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500 truncate">
                                        {imageFile.file.name}
                                    </p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Page Size Options */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Page Size</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'a4', label: 'A4', desc: '210 × 297 mm' },
                                    { id: 'letter', label: 'Letter', desc: '8.5 × 11 in' },
                                    { id: 'fit', label: 'Fit Image', desc: 'Match image size' }
                                ].map((size) => (
                                    <button
                                        key={size.id}
                                        onClick={() => setPageSize(size.id as typeof pageSize)}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                                            pageSize === size.id
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <p className="font-medium text-slate-800">{size.label}</p>
                                        <p className="text-xs text-slate-500">{size.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Convert Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={convertToPdf}
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
                                    <ImageIcon className="w-5 h-5" />
                                    Convert {images.length} Image{images.length > 1 ? 's' : ''} to PDF
                                </>
                            )}
                        </motion.button>
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
                            <p className="font-semibold text-green-800">PDF created successfully!</p>
                            <p className="text-sm text-green-600">
                                {images.length} page{images.length > 1 ? 's' : ''} • {formatSize(result.size)}
                            </p>
                        </div>
                        <DownloadButton onClick={downloadResult}>
                            Download PDF
                        </DownloadButton>
                        <button
                            onClick={clearAll}
                            className="block w-full text-sm text-slate-600 hover:text-slate-800"
                        >
                            Convert more images
                        </button>
                    </motion.div>
                )}
            </div>
        </ToolsLayout>
    )
}
