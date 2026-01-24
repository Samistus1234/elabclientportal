import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PDFDocument } from 'pdf-lib'
import ToolsLayout from '@/components/tools/ToolsLayout'
import FileDropzone from '@/components/tools/FileDropzone'
import { Loader2, Download, FileText } from 'lucide-react'

interface SplitResult {
    name: string
    blob: Blob
    pages: number
}

export default function SplitPdf() {
    const [file, setFile] = useState<File | null>(null)
    const [pageCount, setPageCount] = useState(0)
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
    const [splitMode, setSplitMode] = useState<'selected' | 'all' | 'range'>('selected')
    const [rangeStart, setRangeStart] = useState(1)
    const [rangeEnd, setRangeEnd] = useState(1)
    const [processing, setProcessing] = useState(false)
    const [results, setResults] = useState<SplitResult[]>([])

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
            setRangeStart(1)
            setRangeEnd(pages)
            setResults([])
        } catch (err) {
            console.error('Error loading PDF:', err)
        }
    }, [])

    const handleRemoveFile = useCallback(() => {
        setFile(null)
        setPageCount(0)
        setSelectedPages(new Set())
        setResults([])
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

    const selectAll = () => {
        const all = new Set(Array.from({ length: pageCount }, (_, i) => i + 1))
        setSelectedPages(all)
    }

    const selectNone = () => {
        setSelectedPages(new Set())
    }

    const splitPdf = async () => {
        if (!file) return

        setProcessing(true)
        const newResults: SplitResult[] = []

        try {
            const arrayBuffer = await file.arrayBuffer()
            const sourcePdf = await PDFDocument.load(arrayBuffer)
            const baseName = file.name.replace(/\.pdf$/i, '')

            if (splitMode === 'all') {
                // Split each page into separate PDF
                for (let i = 0; i < pageCount; i++) {
                    const newPdf = await PDFDocument.create()
                    const [page] = await newPdf.copyPages(sourcePdf, [i])
                    newPdf.addPage(page)

                    const pdfBytes = await newPdf.save()
                    const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })

                    newResults.push({
                        name: `${baseName}_page_${i + 1}.pdf`,
                        blob,
                        pages: 1
                    })
                }
            } else if (splitMode === 'selected' && selectedPages.size > 0) {
                // Extract selected pages into one PDF
                const newPdf = await PDFDocument.create()
                const sortedPages = Array.from(selectedPages).sort((a, b) => a - b)
                const pageIndices = sortedPages.map(p => p - 1)
                const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices)
                copiedPages.forEach(page => newPdf.addPage(page))

                const pdfBytes = await newPdf.save()
                const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })

                newResults.push({
                    name: `${baseName}_extracted.pdf`,
                    blob,
                    pages: sortedPages.length
                })
            } else if (splitMode === 'range') {
                // Extract range of pages
                const newPdf = await PDFDocument.create()
                const pageIndices = Array.from(
                    { length: rangeEnd - rangeStart + 1 },
                    (_, i) => rangeStart - 1 + i
                )
                const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices)
                copiedPages.forEach(page => newPdf.addPage(page))

                const pdfBytes = await newPdf.save()
                const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })

                newResults.push({
                    name: `${baseName}_pages_${rangeStart}-${rangeEnd}.pdf`,
                    blob,
                    pages: pageIndices.length
                })
            }

            setResults(newResults)
        } catch (err) {
            console.error('Split error:', err)
        }

        setProcessing(false)
    }

    const downloadResult = (result: SplitResult) => {
        const link = document.createElement('a')
        link.download = result.name
        link.href = URL.createObjectURL(result.blob)
        link.click()
        URL.revokeObjectURL(link.href)
    }

    const downloadAll = () => {
        results.forEach((result, index) => {
            setTimeout(() => downloadResult(result), index * 200)
        })
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / 1048576).toFixed(2) + ' MB'
    }

    const canSplit =
        (splitMode === 'all') ||
        (splitMode === 'selected' && selectedPages.size > 0) ||
        (splitMode === 'range' && rangeStart <= rangeEnd)

    return (
        <ToolsLayout
            title="Split PDF"
            description="Extract pages or split PDF into multiple files"
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

                {/* Split Options */}
                {file && results.length === 0 && (
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

                        {/* Split Mode Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-700">Split Mode</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'selected', label: 'Select Pages', desc: 'Pick specific pages' },
                                    { id: 'range', label: 'Page Range', desc: 'Extract a range' },
                                    { id: 'all', label: 'All Pages', desc: 'One file per page' }
                                ].map((mode) => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setSplitMode(mode.id as typeof splitMode)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                                            splitMode === mode.id
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <p className="font-medium text-slate-800">{mode.label}</p>
                                        <p className="text-xs text-slate-500 mt-1">{mode.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Page Selection Grid */}
                        {splitMode === 'selected' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-700">
                                        Select Pages ({selectedPages.size} selected)
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={selectAll}
                                            className="text-xs text-primary-600 hover:text-primary-700"
                                        >
                                            Select all
                                        </button>
                                        <button
                                            onClick={selectNone}
                                            className="text-xs text-slate-500 hover:text-slate-700"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
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

                        {/* Range Selection */}
                        {splitMode === 'range' && (
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                                <div className="flex-1">
                                    <label className="text-xs text-slate-500">From page</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={pageCount}
                                        value={rangeStart}
                                        onChange={(e) => setRangeStart(Math.max(1, Math.min(parseInt(e.target.value) || 1, pageCount)))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                    />
                                </div>
                                <span className="text-slate-400 mt-5">to</span>
                                <div className="flex-1">
                                    <label className="text-xs text-slate-500">To page</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={pageCount}
                                        value={rangeEnd}
                                        onChange={(e) => setRangeEnd(Math.max(1, Math.min(parseInt(e.target.value) || 1, pageCount)))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Split Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={splitPdf}
                            disabled={processing || !canSplit}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-200 disabled:opacity-50"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Splitting PDF...
                                </>
                            ) : (
                                <>Split PDF</>
                            )}
                        </motion.button>
                    </motion.div>
                )}

                {/* Results */}
                {results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
                            <div>
                                <p className="font-medium text-green-800">
                                    PDF split into {results.length} file{results.length > 1 ? 's' : ''}
                                </p>
                            </div>
                            {results.length > 1 && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={downloadAll}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Download All
                                </motion.button>
                            )}
                        </div>

                        <div className="space-y-2">
                            {results.map((result, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                                >
                                    <FileText className="w-5 h-5 text-primary-500" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-700 truncate">{result.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {result.pages} page{result.pages > 1 ? 's' : ''} • {formatSize(result.blob.size)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => downloadResult(result)}
                                        className="p-2 rounded-lg hover:bg-slate-200 text-slate-600"
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                </motion.div>
                            ))}
                        </div>

                        <button
                            onClick={() => {
                                setFile(null)
                                setResults([])
                            }}
                            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
                        >
                            Split Another PDF
                        </button>
                    </motion.div>
                )}
            </div>
        </ToolsLayout>
    )
}
