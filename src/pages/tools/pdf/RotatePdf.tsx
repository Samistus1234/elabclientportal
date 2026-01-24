import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PDFDocument, degrees } from 'pdf-lib'
import ToolsLayout from '@/components/tools/ToolsLayout'
import FileDropzone from '@/components/tools/FileDropzone'
import DownloadButton from '@/components/tools/DownloadButton'
import { Loader2, FileText, RotateCw, RotateCcw, Check } from 'lucide-react'

type RotationAngle = 90 | 180 | 270

export default function RotatePdf() {
    const [file, setFile] = useState<File | null>(null)
    const [pageCount, setPageCount] = useState(0)
    const [rotation, setRotation] = useState<RotationAngle>(90)
    const [rotateAll, setRotateAll] = useState(true)
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
    const [processing, setProcessing] = useState(false)
    const [result, setResult] = useState<Blob | null>(null)

    const handleFilesSelected = useCallback(async (newFiles: File[]) => {
        const selectedFile = newFiles[0]
        if (!selectedFile) return

        try {
            const arrayBuffer = await selectedFile.arrayBuffer()
            const pdf = await PDFDocument.load(arrayBuffer)
            const pages = pdf.getPageCount()

            setFile(selectedFile)
            setPageCount(pages)
            setSelectedPages(new Set())
            setResult(null)
        } catch (err) {
            console.error('Error loading PDF:', err)
        }
    }, [])

    const handleRemoveFile = useCallback(() => {
        setFile(null)
        setPageCount(0)
        setSelectedPages(new Set())
        setResult(null)
    }, [])

    const togglePage = (page: number) => {
        const newSelected = new Set(selectedPages)
        if (newSelected.has(page)) {
            newSelected.delete(page)
        } else {
            newSelected.add(page)
        }
        setSelectedPages(newSelected)
    }

    const rotatePdf = async () => {
        if (!file) return

        setProcessing(true)
        try {
            const arrayBuffer = await file.arrayBuffer()
            const pdf = await PDFDocument.load(arrayBuffer)
            const pages = pdf.getPages()

            pages.forEach((page, index) => {
                if (rotateAll || selectedPages.has(index + 1)) {
                    const currentRotation = page.getRotation().angle
                    page.setRotation(degrees(currentRotation + rotation))
                }
            })

            const pdfBytes = await pdf.save()
            const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
            setResult(blob)
        } catch (err) {
            console.error('Rotation error:', err)
        }
        setProcessing(false)
    }

    const downloadResult = () => {
        if (!result || !file) return
        const link = document.createElement('a')
        const baseName = file.name.replace(/\.pdf$/i, '')
        link.download = `${baseName}_rotated.pdf`
        link.href = URL.createObjectURL(result)
        link.click()
        URL.revokeObjectURL(link.href)
    }

    const canRotate = rotateAll || selectedPages.size > 0

    return (
        <ToolsLayout
            title="Rotate PDF"
            description="Rotate PDF pages to any angle"
        >
            <div className="space-y-6">
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

                {/* Rotation Options */}
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
                                <p className="text-sm text-slate-500">{pageCount} pages</p>
                            </div>
                            <button
                                onClick={handleRemoveFile}
                                className="text-sm text-red-600 hover:text-red-700"
                            >
                                Change file
                            </button>
                        </div>

                        {/* Rotation Angle */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-700">Rotation Angle</label>
                            <div className="grid grid-cols-3 gap-3">
                                {([90, 180, 270] as RotationAngle[]).map((angle) => (
                                    <button
                                        key={angle}
                                        onClick={() => setRotation(angle)}
                                        className={`relative p-4 rounded-xl border-2 transition-all ${
                                            rotation === angle
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        {rotation === angle && (
                                            <div className="absolute top-2 right-2">
                                                <Check className="w-4 h-4 text-primary-600" />
                                            </div>
                                        )}
                                        <div className="flex items-center justify-center mb-2">
                                            {angle === 90 && <RotateCw className="w-6 h-6 text-slate-600" />}
                                            {angle === 180 && <RotateCw className="w-6 h-6 text-slate-600" style={{ transform: 'rotate(90deg)' }} />}
                                            {angle === 270 && <RotateCcw className="w-6 h-6 text-slate-600" />}
                                        </div>
                                        <p className="font-semibold text-slate-800">{angle}°</p>
                                        <p className="text-xs text-slate-500">
                                            {angle === 90 && 'Clockwise'}
                                            {angle === 180 && 'Upside down'}
                                            {angle === 270 && 'Counter-clockwise'}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Page Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-700">Pages to Rotate</label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setRotateAll(true)}
                                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                                        rotateAll
                                            ? 'border-primary-500 bg-primary-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <p className="font-medium text-slate-800">All Pages</p>
                                </button>
                                <button
                                    onClick={() => setRotateAll(false)}
                                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                                        !rotateAll
                                            ? 'border-primary-500 bg-primary-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <p className="font-medium text-slate-800">Select Pages</p>
                                </button>
                            </div>
                        </div>

                        {/* Page Grid */}
                        {!rotateAll && (
                            <div className="space-y-2">
                                <p className="text-sm text-slate-600">
                                    {selectedPages.size} page{selectedPages.size !== 1 ? 's' : ''} selected
                                </p>
                                <div className="grid grid-cols-8 sm:grid-cols-10 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl">
                                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => togglePage(page)}
                                            className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                                                selectedPages.has(page)
                                                    ? 'bg-primary-500 text-white'
                                                    : 'bg-white border border-slate-200 text-slate-700 hover:border-primary-300'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Rotate Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={rotatePdf}
                            disabled={processing || !canRotate}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-200 disabled:opacity-50"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Rotating...
                                </>
                            ) : (
                                <>
                                    <RotateCw className="w-5 h-5" />
                                    Rotate {rotateAll ? 'All' : selectedPages.size} Page{(!rotateAll && selectedPages.size === 1) ? '' : 's'}
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
                            <p className="font-semibold text-green-800">PDF rotated successfully!</p>
                            <p className="text-sm text-green-600">
                                {rotateAll ? 'All' : selectedPages.size} page{(rotateAll || selectedPages.size !== 1) ? 's' : ''} rotated {rotation}°
                            </p>
                        </div>
                        <DownloadButton onClick={downloadResult}>
                            Download Rotated PDF
                        </DownloadButton>
                        <button
                            onClick={() => {
                                setFile(null)
                                setResult(null)
                            }}
                            className="block w-full text-sm text-slate-600 hover:text-slate-800"
                        >
                            Rotate another PDF
                        </button>
                    </motion.div>
                )}
            </div>
        </ToolsLayout>
    )
}
