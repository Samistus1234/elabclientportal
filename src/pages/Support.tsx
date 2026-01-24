import { useState, useEffect, useCallback, useRef } from 'react'
import { Send, CheckCircle, Search, HelpCircle, ArrowLeft, Loader2, Paperclip, X, FileText } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'

type PortalView = "form" | "success" | "track"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function Support() {
    const [view, setView] = useState<PortalView>("form")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [createdTicketNumber, setCreatedTicketNumber] = useState("")

    // Form state
    const [formData, setFormData] = useState({
        email: "",
        name: "",
        phone: "",
        subject: "",
        description: "",
        category: "",
        case_reference: "",
    })

    // Attachment state
    const [attachments, setAttachments] = useState<File[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes

    // Tracking state
    const [trackEmail, setTrackEmail] = useState("")
    const [trackTicketNumber, setTrackTicketNumber] = useState("")
    const [trackedTicket, setTrackedTicket] = useState<any>(null)
    const [isTracking, setIsTracking] = useState(false)

    // URL parameters for auto-tracking from email links
    const [searchParams] = useSearchParams()

    // Auto-track function for URL parameters
    const autoTrackTicket = useCallback(async (email: string, ticketNumber: string) => {
        setIsTracking(true)
        setError(null)

        try {
            const response = await fetch(
                `${SUPABASE_URL}/functions/v1/public-ticket-track`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({
                        email: email.toLowerCase().trim(),
                        ticket_number: ticketNumber.trim().toUpperCase(),
                    }),
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Ticket not found')
            }

            setTrackedTicket(result.ticket)
        } catch (err: any) {
            setError("No ticket found with that number and email combination.")
            setTrackedTicket(null)
        } finally {
            setIsTracking(false)
        }
    }, [])

    // Handle URL parameters for auto-tracking from email links
    useEffect(() => {
        const shouldTrack = searchParams.get('track')
        const ticketParam = searchParams.get('ticket')
        const emailParam = searchParams.get('email')

        if (shouldTrack === 'true' && ticketParam && emailParam) {
            // Switch to track view
            setView('track')
            // Populate the form fields
            setTrackEmail(emailParam)
            setTrackTicketNumber(ticketParam)
            // Auto-trigger tracking
            autoTrackTicket(emailParam, ticketParam)
        }
    }, [searchParams, autoTrackTicket])

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return

        const newFiles: File[] = []
        let hasError = false

        Array.from(files).forEach(file => {
            if (file.size > MAX_FILE_SIZE) {
                setError(`File "${file.name}" exceeds 5MB limit`)
                hasError = true
                return
            }
            // Check if file already exists
            if (!attachments.some(att => att.name === file.name && att.size === file.size)) {
                newFiles.push(file)
            }
        })

        if (!hasError && newFiles.length > 0) {
            setAttachments(prev => [...prev, ...newFiles])
            setError(null)
        }

        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    // Remove attachment
    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    // Format file size
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!formData.email || !formData.name || !formData.subject || !formData.description) {
            setError("Please fill in all required fields")
            return
        }

        setIsSubmitting(true)

        try {
            // Convert attachments to base64
            const attachmentData = await Promise.all(
                attachments.map(async (file) => {
                    return new Promise<{ name: string; type: string; size: number; data: string }>((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onload = () => {
                            const base64 = (reader.result as string).split(',')[1]
                            resolve({
                                name: file.name,
                                type: file.type,
                                size: file.size,
                                data: base64
                            })
                        }
                        reader.onerror = reject
                        reader.readAsDataURL(file)
                    })
                })
            )

            const response = await fetch(
                `${SUPABASE_URL}/functions/v1/public-ticket-submit`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({
                        email: formData.email.toLowerCase().trim(),
                        name: formData.name.trim(),
                        phone: formData.phone?.trim() || null,
                        subject: formData.subject.trim(),
                        description: formData.description.trim(),
                        category: formData.category || 'general',
                        case_reference: formData.case_reference?.trim() || null,
                        attachments: attachmentData.length > 0 ? attachmentData : null,
                    }),
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to submit ticket')
            }

            setCreatedTicketNumber(result.ticket_number)
            setView("success")
            setFormData({
                email: "",
                name: "",
                phone: "",
                subject: "",
                description: "",
                category: "",
                case_reference: "",
            })
            setAttachments([])
        } catch (err: any) {
            setError(err.message || "Unable to submit your request. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleTrackTicket = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!trackEmail || !trackTicketNumber) {
            setError("Please enter your email and ticket number")
            return
        }

        setIsTracking(true)

        try {
            const response = await fetch(
                `${SUPABASE_URL}/functions/v1/public-ticket-track`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({
                        email: trackEmail.toLowerCase().trim(),
                        ticket_number: trackTicketNumber.trim().toUpperCase(),
                    }),
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Ticket not found')
            }

            setTrackedTicket(result.ticket)
        } catch (err: any) {
            setError("No ticket found with that number and email combination.")
            setTrackedTicket(null)
        } finally {
            setIsTracking(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new':
            case 'open':
                return 'bg-blue-100 text-blue-800'
            case 'pending':
                return 'bg-yellow-100 text-yellow-800'
            case 'solved':
            case 'closed':
                return 'bg-green-100 text-green-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link to="/login" className="text-slate-500 hover:text-slate-700">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800">ELAB Solutions</h1>
                                <p className="text-xs text-slate-500">Client Support Portal</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setView("form"); setTrackedTicket(null); setError(null) }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    view === "form"
                                        ? "bg-primary-500 text-white shadow-md"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                <HelpCircle className="w-4 h-4 inline mr-1" />
                                Submit Request
                            </button>
                            <button
                                onClick={() => { setView("track"); setTrackedTicket(null); setError(null) }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    view === "track"
                                        ? "bg-primary-500 text-white shadow-md"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                <Search className="w-4 h-4 inline mr-1" />
                                Track Ticket
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-8">
                {/* Success View */}
                {view === "success" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-2xl p-8 text-center"
                    >
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Request Submitted!</h2>
                        <p className="text-slate-600 mb-4">
                            Your support ticket has been created successfully.
                        </p>
                        <div className="bg-slate-100 rounded-xl p-4 mb-6">
                            <p className="text-sm text-slate-500">Your Ticket Number</p>
                            <p className="text-2xl font-mono font-bold text-primary-600">{createdTicketNumber}</p>
                        </div>
                        <p className="text-sm text-slate-500 mb-6">
                            Please save this ticket number. You can use it to track the status of your request.
                            We'll also send a confirmation to your email.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setView("form")}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all"
                            >
                                Submit Another Request
                            </button>
                            <button
                                onClick={() => { setView("track"); setTrackTicketNumber(createdTicketNumber) }}
                                className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
                            >
                                Track This Ticket
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Track Ticket View */}
                {view === "track" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-2xl p-8"
                    >
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Track Your Ticket</h2>
                        <p className="text-slate-600 text-sm mb-6">
                            Enter your email and ticket number to check the status of your request.
                        </p>

                        <form onSubmit={handleTrackTicket} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={trackEmail}
                                        onChange={(e) => setTrackEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                        Ticket Number
                                    </label>
                                    <input
                                        type="text"
                                        value={trackTicketNumber}
                                        onChange={(e) => setTrackTicketNumber(e.target.value)}
                                        placeholder="TKT-XXXXXX-XXXX"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isTracking}
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isTracking ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Search className="w-4 h-4" />
                                        Find Ticket
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Tracked Ticket Result */}
                        {trackedTicket && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6 border-2 border-slate-200 rounded-xl p-5 space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-slate-800">{trackedTicket.ticket_number}</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(trackedTicket.status)}`}>
                                        {trackedTicket.status}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">{trackedTicket.subject}</h3>
                                    <p className="text-sm text-slate-600 mt-1">{trackedTicket.description}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-slate-500">Submitted</p>
                                        <p className="font-medium">{new Date(trackedTicket.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Priority</p>
                                        <p className="font-medium capitalize">{trackedTicket.priority}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* Submit Ticket Form */}
                {view === "form" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div className="glass-card rounded-2xl p-8">
                            <h2 className="text-xl font-bold text-slate-800 mb-2">How Can We Help?</h2>
                            <p className="text-slate-600 text-sm mb-6">
                                Submit a support request and our team will get back to you as soon as possible.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Contact Information */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Your Information
                                    </h3>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                Full Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Your full name"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                Email Address *
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="your@email.com"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                Phone Number (Optional)
                                            </label>
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="+234 xxx xxx xxxx"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                Case Reference (If you have one)
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.case_reference}
                                                onChange={(e) => setFormData({ ...formData, case_reference: e.target.value })}
                                                placeholder="e.g., DF-001, CG-001"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Request Details */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Your Request
                                    </h3>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Category
                                        </label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none bg-white"
                                        >
                                            <option value="">Select a category</option>
                                            <option value="case_status">Case Status Inquiry</option>
                                            <option value="documents">Document Upload Help</option>
                                            <option value="payment">Payment & Billing</option>
                                            <option value="technical">Technical Issue</option>
                                            <option value="general">General Question</option>
                                            <option value="complaint">Complaint</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Subject *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.subject}
                                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                            placeholder="Brief summary of your request"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Description *
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Please describe your request in detail. Include any relevant information like dates, names, or reference numbers."
                                            rows={5}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all outline-none resize-none"
                                        />
                                    </div>

                                    {/* Attachment Upload */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Attachments (Optional)
                                        </label>
                                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 hover:border-primary-300 transition-colors">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileSelect}
                                                multiple
                                                className="hidden"
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.xlsx,.xls,.csv"
                                            />
                                            <div
                                                className="flex flex-col items-center justify-center cursor-pointer"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <Paperclip className="w-8 h-8 text-slate-400 mb-2" />
                                                <p className="text-sm text-slate-600 text-center">
                                                    Click to upload files
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Max 5MB per file (PDF, DOC, Images, Excel)
                                                </p>
                                            </div>
                                        </div>

                                        {/* Attached Files List */}
                                        {attachments.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {attachments.map((file, index) => (
                                                    <div
                                                        key={`${file.name}-${index}`}
                                                        className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                                            <span className="text-sm text-slate-700 truncate">{file.name}</span>
                                                            <span className="text-xs text-slate-400 flex-shrink-0">
                                                                ({formatFileSize(file.size)})
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeAttachment(index)}
                                                            className="p-1 hover:bg-red-100 rounded-full transition-colors"
                                                        >
                                                            <X className="w-4 h-4 text-red-500" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary-200"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Submit Request
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Contact Info */}
                        <div className="glass-card rounded-2xl p-6">
                            <h3 className="font-semibold text-slate-800 mb-3">Need Immediate Assistance?</h3>
                            <div className="grid gap-4 sm:grid-cols-2 text-sm">
                                <div>
                                    <p className="text-slate-500">Nigeria Office</p>
                                    <p className="font-medium">+234 816 563 4195</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">USA Office</p>
                                    <p className="font-medium">+1 (929) 419-2327</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 mt-3">
                                Email: <a href="mailto:support@elabsolution.org" className="text-primary-600 hover:underline">support@elabsolution.org</a>
                            </p>
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t bg-white/50 mt-auto">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="text-center text-sm text-slate-500">
                        <p>&copy; {new Date().getFullYear()} ELAB Solutions International LLC. All rights reserved.</p>
                        <p className="mt-1">Lagos, Nigeria | Houston, Texas, USA</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
