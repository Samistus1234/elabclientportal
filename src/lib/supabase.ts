import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helper functions for password-based login
export async function signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })
    return { session: data.session, user: data.user, error }
}

// Legacy magic link function (kept for backwards compatibility)
export async function sendMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
    })
    return { error }
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
}

export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
}

export async function getUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
}

// Get portal user info (determines if user is applicant, recruiter, or institutional contact)
export interface PortalUserInfo {
    portal_user_id: string
    person_id: string | null
    user_type: 'applicant' | 'recruiter' | 'institutional_contact'
    first_name: string | null
    last_name: string | null
    email: string
    recruiter_id: string | null
    company_name: string | null
    institutional_contact_id: string | null
    is_active: boolean
}

export async function getPortalUserInfo(): Promise<{ data: PortalUserInfo | null; error: any }> {
    const { data, error } = await supabase.rpc('get_portal_user_info')
    if (error) {
        console.error('Error fetching portal user info:', error)
        return { data: null, error }
    }
    // RPC returns an array, get first item
    const userInfo = Array.isArray(data) ? data[0] : data
    return { data: userInfo || null, error: null }
}

// Get recruiter cases
export async function getRecruiterCases() {
    const { data, error } = await supabase.rpc('get_my_recruiter_cases')
    return { data: data || [], error }
}

// Get single recruiter case
export async function getRecruiterCase(caseId: string) {
    const { data, error } = await supabase.rpc('get_my_recruiter_case', { p_case_id: caseId })
    // RPC returns array, get first item
    const caseData = Array.isArray(data) ? data[0] : data
    return { data: caseData || null, error }
}

// Get recruiter case stage history
export async function getRecruiterCaseStageHistory(caseId: string) {
    const { data, error } = await supabase.rpc('get_recruiter_case_stage_history', { p_case_id: caseId })
    return { data: data || [], error }
}

// Get recruiter stats
export async function getRecruiterStats() {
    const { data, error } = await supabase.rpc('get_my_recruiter_stats')
    const stats = Array.isArray(data) ? data[0] : data
    return { data: stats || null, error }
}

// ============================================================
// APPLICANT FUNCTIONS
// ============================================================

// Get applicant's person info
export async function getMyPersonInfo() {
    const { data, error } = await supabase.rpc('get_my_person_info')
    const personInfo = Array.isArray(data) ? data[0] : data
    return { data: personInfo || null, error }
}

// Get applicant's cases
export async function getMyCases() {
    const { data, error } = await supabase.rpc('get_my_synced_cases')
    return { data: data || [], error }
}

// Get single case detail for applicant
export async function getMyCase(caseId: string) {
    const { data, error } = await supabase.rpc('get_my_case', { p_case_id: caseId })
    const caseData = Array.isArray(data) ? data[0] : data
    return { data: caseData || null, error }
}

// Get case stage history for applicant
export async function getMyCaseStageHistory(caseId: string) {
    const { data, error } = await supabase.rpc('get_my_case_stage_history', { p_case_id: caseId })
    return { data: data || [], error }
}

// Get pipeline stages
export async function getPipelineStages(pipelineId: string) {
    const { data, error } = await supabase.rpc('get_pipeline_stages', { p_pipeline_id: pipelineId })
    return { data: data || [], error }
}

// ============================================================
// SERVICE REQUESTS FUNCTIONS
// ============================================================

export interface ServiceRequestParams {
    candidateName: string
    candidateEmail?: string
    candidatePhone?: string
    requestedService: string
    serviceCategory?: string
    relatedCaseId?: string
    relatedCaseReference?: string
    relatedPipelineName?: string
    urgency?: 'low' | 'normal' | 'high' | 'urgent'
    notes?: string
}

export async function createServiceRequest(params: ServiceRequestParams) {
    const { data, error } = await supabase.rpc('create_service_request', {
        p_candidate_name: params.candidateName,
        p_candidate_email: params.candidateEmail || null,
        p_candidate_phone: params.candidatePhone || null,
        p_requested_service: params.requestedService,
        p_service_category: params.serviceCategory || null,
        p_related_case_id: params.relatedCaseId || null,
        p_related_case_reference: params.relatedCaseReference || null,
        p_related_pipeline_name: params.relatedPipelineName || null,
        p_urgency: params.urgency || 'normal',
        p_notes: params.notes || null
    })

    // If request was created successfully, trigger email notification
    if (!error && data) {
        triggerServiceRequestNotification({
            id: data,
            ...params
        }).catch(err => {
            // Don't fail if notification fails, just log it
            console.warn('Failed to send service request notification:', err)
        })
    }

    return { data, error }
}

// Helper function to trigger email notification for new service requests
async function triggerServiceRequestNotification(request: ServiceRequestParams & { id: string }) {
    try {
        // Get current user info to include recruiter details
        const { data: userInfo } = await getPortalUserInfo()

        const payload = {
            type: 'INSERT',
            table: 'service_requests',
            record: {
                id: request.id,
                candidate_name: request.candidateName,
                candidate_email: request.candidateEmail || null,
                candidate_phone: request.candidatePhone || null,
                requested_service: request.requestedService,
                service_category: request.serviceCategory || null,
                related_case_id: request.relatedCaseId || null,
                related_case_reference: request.relatedCaseReference || null,
                related_pipeline_name: request.relatedPipelineName || null,
                urgency: request.urgency || 'normal',
                notes: request.notes || null,
                status: 'pending',
                recruiter_id: userInfo?.recruiter_id || null,
                recruiter_name: userInfo ? `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() : null,
                recruiter_company: userInfo?.company_name || null,
                created_at: new Date().toISOString()
            }
        }

        // Call the Edge Function directly
        const { error } = await supabase.functions.invoke('notify-service-request', {
            body: payload
        })

        if (error) {
            console.warn('Notification function error:', error)
        }
    } catch (err) {
        console.warn('Error triggering notification:', err)
    }
}

export interface ServiceRequest {
    out_id: string
    out_candidate_name: string
    out_candidate_email: string | null
    out_requested_service: string
    out_service_category: string | null
    out_related_case_reference: string | null
    out_related_pipeline_name: string | null
    out_urgency: string
    out_status: string
    out_requester_notes: string | null
    out_admin_notes: string | null
    out_assigned_to: string | null
    out_created_at: string
    out_updated_at: string
}

export async function getMyServiceRequests(): Promise<{ data: ServiceRequest[]; error: any }> {
    const { data, error } = await supabase.rpc('get_my_service_requests')
    return { data: data || [], error }
}

// ============================================================
// RECRUITER INVOICE FUNCTIONS
// ============================================================

export interface RecruiterInvoice {
    out_id: string
    out_invoice_number: string
    out_currency: string
    out_subtotal: number
    out_discount_amount: number
    out_tax_amount: number
    out_total_amount: number
    out_amount_paid: number
    out_amount_due: number
    out_status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled'
    out_due_date: string | null
    out_payment_link: string | null
    out_notes: string | null
    out_created_at: string
    out_sent_at: string | null
    out_paid_at: string | null
    out_case_reference: string | null
    out_person_name: string | null
    out_has_payment_proof: boolean
}

export interface RecruiterInvoiceDetail extends RecruiterInvoice {
    out_case_id: string | null
    out_person_email: string | null
    out_line_items: InvoiceLineItem[]
    out_payment_proofs: PaymentProof[]
}

export interface InvoiceLineItem {
    id: string
    description: string
    quantity: number
    unit_price: number
    discount_amount: number
    tax_amount: number
    line_total: number
}

export interface PaymentProof {
    id: string
    amount_claimed: number
    currency: string
    payment_date: string
    bank_reference: string | null
    status: 'pending' | 'verified' | 'rejected' | 'needs_info'
    reviewer_notes: string | null
    created_at: string
}

export interface BankAccount {
    out_id: string
    out_bank_name: string
    out_account_name: string
    out_account_number: string
    out_routing_code: string | null
    out_swift_code: string | null
    out_currency: string
    out_is_default: boolean
    out_notes: string | null
}

export interface RecruiterInvoiceStats {
    out_total_invoices: number
    out_pending_invoices: number
    out_paid_invoices: number
    out_overdue_invoices: number
    out_total_amount: number
    out_amount_paid: number
    out_amount_due: number
    out_pending_proofs: number
}

// Get all invoices for the authenticated recruiter
export async function getRecruiterInvoices(): Promise<{ data: RecruiterInvoice[]; error: any }> {
    const { data, error } = await supabase.rpc('get_recruiter_invoices')
    return { data: data || [], error }
}

// Get single invoice detail
export async function getRecruiterInvoiceDetail(invoiceId: string): Promise<{ data: RecruiterInvoiceDetail | null; error: any }> {
    const { data, error } = await supabase.rpc('get_recruiter_invoice_detail', { p_invoice_id: invoiceId })
    const invoiceData = Array.isArray(data) ? data[0] : data
    return { data: invoiceData || null, error }
}

// Get bank accounts for payment
export async function getPaymentBankAccounts(currency?: string): Promise<{ data: BankAccount[]; error: any }> {
    const { data, error } = await supabase.rpc('get_payment_bank_accounts', { p_currency: currency || null })
    return { data: data || [], error }
}

// Get invoice stats
export async function getRecruiterInvoiceStats(): Promise<{ data: RecruiterInvoiceStats | null; error: any }> {
    const { data, error } = await supabase.rpc('get_recruiter_invoice_stats')
    const stats = Array.isArray(data) ? data[0] : data
    return { data: stats || null, error }
}

// Submit payment proof for bank transfer
export interface SubmitPaymentProofParams {
    invoiceId: string
    amountClaimed: number
    currency: string
    paymentDate: string
    bankReference?: string
    payerName?: string
    payerNotes?: string
    proofFileUrl: string
    proofFileName?: string
    proofFileType?: string
}

export async function submitPaymentProof(params: SubmitPaymentProofParams): Promise<{ data: string | null; error: any }> {
    const { data, error } = await supabase.rpc('submit_payment_proof', {
        p_invoice_id: params.invoiceId,
        p_amount_claimed: params.amountClaimed,
        p_currency: params.currency,
        p_payment_date: params.paymentDate,
        p_bank_reference: params.bankReference || null,
        p_payer_name: params.payerName || null,
        p_payer_notes: params.payerNotes || null,
        p_proof_file_url: params.proofFileUrl,
        p_proof_file_name: params.proofFileName || null,
        p_proof_file_type: params.proofFileType || null
    })
    return { data, error }
}

// ============================================================
// CURRENCY RATES FUNCTIONS
// ============================================================

export interface CurrencyRate {
    id: string
    from_currency: string
    to_currency: string
    rate: number
    effective_date: string
}

// Get latest exchange rates from database
export async function getCurrencyRates(): Promise<{ data: CurrencyRate[]; error: any }> {
    const { data, error } = await supabase
        .from('currency_rates')
        .select('id, from_currency, to_currency, rate, effective_date')
        .eq('is_active', true)
        .order('effective_date', { ascending: false })

    return { data: data || [], error }
}

// Get latest rate for a specific currency pair
export async function getLatestRate(fromCurrency: string, toCurrency: string): Promise<{ data: CurrencyRate | null; error: any }> {
    const { data, error } = await supabase
        .from('currency_rates')
        .select('id, from_currency, to_currency, rate, effective_date')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .eq('is_active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single()

    return { data: data || null, error }
}

// Upload payment proof file to storage
export async function uploadPaymentProof(file: File, invoiceId: string): Promise<{ url: string | null; error: any }> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${invoiceId}/${Date.now()}.${fileExt}`
    const filePath = `payment-proofs/${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

    if (uploadError) {
        return { url: null, error: uploadError }
    }

    const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

    return { url: publicUrl, error: null }
}

// ============================================================
// INSTITUTIONAL CONTACT PAYMENT FUNCTIONS
// ============================================================

export type PaymentType = 'official_fee' | 'facilitation_fee' | 'processing_fee' | 'courier_fee' | 'other'
export type PaymentStatus = 'pending' | 'paid' | 'confirmed' | 'refunded'

export interface PaymentBreakdownItem {
    type: PaymentType
    total: number
    confirmed: number
    pending: number
    count: number
}

export interface ContactPaymentSummary {
    total_amount: number
    confirmed_amount: number
    pending_amount: number
    currency: string
    breakdown_by_type: PaymentBreakdownItem[]
    total_payments_count: number
}

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
    official_fee: 'Official Fee',
    facilitation_fee: 'Facilitation Fee',
    processing_fee: 'Processing Fee',
    courier_fee: 'Courier Fee',
    other: 'Other',
}

// Get payment summary for a contact's verification requests
export async function getContactPaymentSummary(contactId: string): Promise<{ data: ContactPaymentSummary | null; error: any }> {
    try {
        // Get all verification requests for this contact
        const { data: requests, error: requestsError } = await supabase
            .from('verification_requests')
            .select('id')
            .eq('contact_id', contactId)

        if (requestsError) return { data: null, error: requestsError }

        if (!requests || requests.length === 0) {
            return {
                data: {
                    total_amount: 0,
                    confirmed_amount: 0,
                    pending_amount: 0,
                    currency: 'AED',
                    breakdown_by_type: [],
                    total_payments_count: 0,
                },
                error: null,
            }
        }

        const requestIds = requests.map((r) => r.id)

        // Get all payments for these requests
        const { data: payments, error: paymentsError } = await supabase
            .from('verification_request_payments')
            .select('*')
            .in('verification_request_id', requestIds)

        if (paymentsError) return { data: null, error: paymentsError }

        if (!payments || payments.length === 0) {
            return {
                data: {
                    total_amount: 0,
                    confirmed_amount: 0,
                    pending_amount: 0,
                    currency: 'AED',
                    breakdown_by_type: [],
                    total_payments_count: 0,
                },
                error: null,
            }
        }

        // Aggregate by payment type
        const breakdownMap = new Map<PaymentType, PaymentBreakdownItem>()
        let totalAmount = 0
        let confirmedAmount = 0
        let pendingAmount = 0
        let currency = 'AED'

        for (const payment of payments) {
            const amount = payment.amount || 0
            const type = payment.payment_type as PaymentType
            const status = payment.status as PaymentStatus

            if (payment.currency) {
                currency = payment.currency
            }

            totalAmount += amount
            if (status === 'confirmed' || status === 'paid') {
                confirmedAmount += amount
            } else if (status === 'pending') {
                pendingAmount += amount
            }

            if (!breakdownMap.has(type)) {
                breakdownMap.set(type, {
                    type,
                    total: 0,
                    confirmed: 0,
                    pending: 0,
                    count: 0,
                })
            }

            const item = breakdownMap.get(type)!
            item.total += amount
            item.count += 1
            if (status === 'confirmed' || status === 'paid') {
                item.confirmed += amount
            } else if (status === 'pending') {
                item.pending += amount
            }
        }

        return {
            data: {
                total_amount: totalAmount,
                confirmed_amount: confirmedAmount,
                pending_amount: pendingAmount,
                currency,
                breakdown_by_type: Array.from(breakdownMap.values()),
                total_payments_count: payments.length,
            },
            error: null,
        }
    } catch (err: any) {
        return { data: null, error: err }
    }
}
