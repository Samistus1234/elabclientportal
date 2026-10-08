// Data for the signed-in applicant pages. Every RPC here resolves the caller to
// their own person on the server and returns only their records (Command Centre
// migrations 20261008170000 / 20261008190000).
import { supabase } from '@/lib/supabase'
import { normalizePipelineStagesForDisplay } from '@/lib/dataflowStages'

export interface MyPerson {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
}

export interface MyCase {
    id: string
    case_reference: string | null
    status: string
    updated_at: string
    created_at: string
    start_date: string | null
    metadata: Record<string, any> | null
    pipeline_id: string | null
    pipeline_name: string | null
    pipeline_slug: string | null
    stage_id: string | null
    stage_name: string | null
    stage_slug: string | null
}

export interface Stage {
    id: string
    name: string
    slug: string
    order_index: number
}

export interface MyInvoice {
    id: string
    invoice_number: string
    status: string
    currency: string
    total: number
    amount_paid: number
    amount_due: number
    issue_date: string | null
    due_date: string | null
    paid_date: string | null
    application_name: string | null
    receipt_url: string | null
}

export interface MyUpdate {
    kind: 'stage' | 'document' | 'invoice' | 'payment'
    title: string
    detail: string | null
    happened_at: string
    case_id: string | null
    ref_id: string
}

export interface MyDocument {
    id: string
    name: string
    received_via: string
    uploaded_at: string | null
    case_id: string | null
    application_name: string | null
}

export interface WaitingCase {
    case_id: string
    application_name: string | null
    since: string | null
}

export interface MyTicket {
    id: string
    ticket_number: string
    subject: string
    status: string
    created_at: string
    last_activity_at: string | null
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T[]> {
    const { data, error } = await supabase.rpc(fn, args)
    if (error) throw error
    return (Array.isArray(data) ? data : data ? [data] : []) as T[]
}

export async function getMyPerson(): Promise<MyPerson | null> {
    const rows = await rpc<MyPerson>('get_my_person_info')
    return rows[0] ?? null
}

export async function getMyCases(): Promise<MyCase[]> {
    const rows = await rpc<any>('get_my_synced_cases')
    return rows.map((c) => ({
        id: c.out_id,
        case_reference: c.out_case_reference ?? c.out_external_case_number ?? null,
        status: c.out_status,
        updated_at: c.out_updated_at,
        created_at: c.out_created_at,
        start_date: c.out_start_date,
        metadata: c.out_metadata,
        pipeline_id: c.out_pipeline_id,
        pipeline_name: c.out_pipeline_name,
        pipeline_slug: c.out_pipeline_slug,
        stage_id: c.out_current_stage_id,
        stage_name: c.out_current_stage_name,
        stage_slug: c.out_current_stage_slug,
    }))
}

export async function getMyCase(caseId: string): Promise<MyCase | null> {
    const { data, error } = await supabase.rpc('get_my_synced_case', { p_case_id: caseId })
    if (error) throw error
    if (!data) return null
    const c = data as any
    return {
        id: c.id,
        case_reference: c.case_reference,
        status: c.status,
        updated_at: c.updated_at,
        created_at: c.created_at,
        start_date: c.start_date,
        metadata: c.metadata,
        pipeline_id: c.pipeline_id,
        pipeline_name: c.pipeline_name,
        pipeline_slug: c.pipeline_slug,
        stage_id: c.current_stage_id,
        stage_name: c.current_stage_name,
        stage_slug: c.current_stage_slug,
    }
}

/** Client-facing stages only (staff-only steps hidden, client labels). */
export async function getStages(pipelineId: string, pipelineSlug: string | null): Promise<Stage[]> {
    const rows = await rpc<Stage>('get_pipeline_stages', { p_pipeline_id: pipelineId })
    return normalizePipelineStagesForDisplay(rows, pipelineSlug)
}

export async function getCaseHistory(caseId: string) {
    return rpc<{ id: string; created_at: string; from_stage_name: string | null; to_stage_name: string }>(
        'get_my_case_stage_history',
        { p_case_id: caseId },
    )
}

export const getMyInvoices = () => rpc<MyInvoice>('get_my_invoices')
export const getMyUpdates = (limit = 30) => rpc<MyUpdate>('get_my_updates', { p_limit: limit })
export const getMyDocuments = () => rpc<MyDocument>('get_my_documents')
export const getMyWaitingCases = () => rpc<WaitingCase>('get_my_waiting_cases')
export const getMyTickets = () => rpc<MyTicket>('get_my_tickets')

/** Where a case sits in its client steps: 1-based position and count (null if unknown). */
export function stepPosition(stages: Stage[] | undefined, stageId: string | null) {
    if (!stages?.length || !stageId) return null
    const i = stages.findIndex((s) => s.id === stageId)
    if (i < 0) return null
    return { index: i + 1, count: stages.length, pct: Math.round(((i + 1) / stages.length) * 100) }
}

export function formatMoney(amount: number | null | undefined, currency: string | null | undefined) {
    const value = Number(amount ?? 0)
    const code = (currency || 'NGN').toUpperCase()
    try {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(value)
    } catch {
        return `${code} ${value.toLocaleString()}`
    }
}

export function formatDate(value: string | null | undefined, withYear = false) {
    if (!value) return ''
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    const sameYear = d.getFullYear() === new Date().getFullYear()
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(withYear || !sameYear ? { year: 'numeric' } : {}) })
}

export function timeAgo(value: string | null | undefined) {
    if (!value) return ''
    const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)
    if (days <= 0) return 'today'
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`
    return formatDate(value, true)
}

export function greeting() {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/** A case is done when the client status says so. */
export function isFinished(c: MyCase) {
    return ['completed', 'closed', 'cancelled', 'archived'].includes((c.status || '').toLowerCase())
}
