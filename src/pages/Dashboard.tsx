import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, signOut } from '@/lib/supabase'
import { motion } from 'framer-motion'
import {
    LogOut,
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Sparkles,
    User
} from 'lucide-react'

interface CaseData {
    id: string
    case_reference: string
    status: string
    priority: string
    created_at: string
    updated_at: string
    pipeline: {
        name: string
        slug: string
    }
    current_stage: {
        name: string
        slug: string
    }
    metadata: Record<string, any>
}

interface PersonData {
    id: string
    first_name: string
    last_name: string
    email: string
}

export default function Dashboard() {
    const [person, setPerson] = useState<PersonData | null>(null)
    const [cases, setCases] = useState<CaseData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadClientData()
    }, [])

    const loadClientData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user?.email) throw new Error('No user found')

            // Find person by email
            const { data: personData, error: personError } = await supabase
                .from('persons')
                .select('id, first_name, last_name, email, primary_email')
                .or(`email.eq.${user.email},primary_email.eq.${user.email}`)
                .single()

            if (personError || !personData) {
                throw new Error('No account found for this email. Please contact support.')
            }

            setPerson(personData)

            // Load cases for this person
            const { data: casesData, error: casesError } = await supabase
                .from('cases')
                .select(`
          id,
          case_reference,
          status,
          priority,
          created_at,
          updated_at,
          metadata,
          pipeline:pipelines(name, slug),
          current_stage:pipeline_stages!cases_current_stage_id_fkey(name, slug)
        `)
                .eq('person_id', personData.id)
                .order('created_at', { ascending: false })

            if (casesError) throw casesError
            setCases((casesData || []) as unknown as CaseData[])

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSignOut = async () => {
        await signOut()
        window.location.href = '/login'
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="w-5 h-5 text-success-500" />
            case 'active':
                return <Clock className="w-5 h-5 text-primary-500" />
            case 'on_hold':
                return <AlertCircle className="w-5 h-5 text-warning-500" />
            default:
                return <FileText className="w-5 h-5 text-slate-400" />
        }
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            active: 'bg-primary-100 text-primary-700',
            completed: 'bg-success-100 text-success-700',
            on_hold: 'bg-warning-100 text-warning-700',
            cancelled: 'bg-red-100 text-red-700',
        }
        return styles[status] || 'bg-slate-100 text-slate-700'
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                    <p className="text-slate-600">Loading your dashboard...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="glass-card rounded-2xl p-8 max-w-md text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Oops!</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button
                        onClick={handleSignOut}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                        Sign out and try again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-semibold text-slate-800">ELAB Portal</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-slate-600">
                            <User className="w-4 h-4" />
                            <span className="text-sm">{person?.first_name}</span>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Sign out"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-6 py-8">
                {/* Welcome Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">
                        Welcome back, {person?.first_name}! 👋
                    </h1>
                    <p className="text-slate-600">
                        Here's an overview of your applications.
                    </p>
                </motion.div>

                {/* Stats Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
                >
                    <div className="glass-card rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-primary-600" />
                            </div>
                            <span className="text-2xl font-bold text-slate-800">{cases.length}</span>
                        </div>
                        <p className="text-slate-600 text-sm">Total Applications</p>
                    </div>
                    <div className="glass-card rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-success-600" />
                            </div>
                            <span className="text-2xl font-bold text-slate-800">
                                {cases.filter(c => c.status === 'completed').length}
                            </span>
                        </div>
                        <p className="text-slate-600 text-sm">Completed</p>
                    </div>
                    <div className="glass-card rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-warning-100 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-warning-600" />
                            </div>
                            <span className="text-2xl font-bold text-slate-800">
                                {cases.filter(c => c.status === 'active').length}
                            </span>
                        </div>
                        <p className="text-slate-600 text-sm">In Progress</p>
                    </div>
                </motion.div>

                {/* Cases List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h2 className="text-xl font-semibold text-slate-800 mb-4">Your Applications</h2>

                    {cases.length === 0 ? (
                        <div className="glass-card rounded-xl p-8 text-center">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-600">No applications found.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cases.map((caseItem, index) => (
                                <motion.div
                                    key={caseItem.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 * index }}
                                >
                                    <Link
                                        to={`/case/${caseItem.id}`}
                                        className="glass-card rounded-xl p-5 block hover:shadow-lg transition-all group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                {getStatusIcon(caseItem.status)}
                                                <div>
                                                    <h3 className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors">
                                                        {caseItem.pipeline?.name || 'Application'}
                                                    </h3>
                                                    <p className="text-slate-500 text-sm">
                                                        {caseItem.current_stage?.name || 'Processing'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(caseItem.status)}`}>
                                                    {caseItem.status.replace('_', ' ')}
                                                </span>
                                                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary-500 transition-colors" />
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    )
}
