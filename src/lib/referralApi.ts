import { supabase } from './supabase'
import { buildCommandCenterUrl } from './commandCenterApi'

/**
 * Referral programme — data access.
 *
 * Reads come from Command Centre RPCs (security definer, the caller's own rows
 * only). Writes that need privileges the browser must not hold — creating an
 * account, creating a case, issuing a code — go through Command Centre edge
 * functions.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export interface ReferrerStats {
    referred: number
    in_progress: number
    completed: number
    earned_ngn: number
    available_ngn: number
    requested_ngn: number
    paid_ngn: number
    pending_rate: number
    open_payout: boolean
}

export interface ReferrerProfile {
    id: string
    referral_code: string | null
    status: 'pending' | 'approved' | 'rejected' | 'suspended'
    first_name: string
    last_name: string | null
    email: string
    phone: string | null
    bank_name: string | null
    account_name: string | null
    account_number: string | null
    approved_at: string | null
    stats: ReferrerStats
    rates: Record<string, number> | null
}

export interface ReferralRow {
    case_id: string
    case_reference: string
    client_name: string
    service: string
    service_slug: string
    stage_label: string
    case_status: string
    step: number
    referred_at: string
    updated_at: string
    commission_status: string | null
    commission_ngn: number | null
}

export interface PayoutRow {
    id: string
    amount_ngn: number
    status: 'requested' | 'paid' | 'rejected'
    requested_at: string
    paid_at: string | null
    payment_reference: string | null
    notes: string | null
}

export async function fetchReferrerProfile(): Promise<ReferrerProfile | null> {
    const { data, error } = await supabase.rpc('get_my_referrer_profile')
    if (error) throw error
    return (data as ReferrerProfile) ?? null
}

export async function fetchMyReferrals(): Promise<ReferralRow[]> {
    const { data, error } = await supabase.rpc('get_my_referrals')
    if (error) throw error
    return (data as ReferralRow[]) ?? []
}

export async function fetchMyPayouts(): Promise<PayoutRow[]> {
    const { data, error } = await supabase.rpc('get_my_referral_payouts')
    if (error) throw error
    return (data as PayoutRow[]) ?? []
}

export async function savePayoutDetails(details: {
    bank_name: string
    account_name: string
    account_number: string
}): Promise<void> {
    const { error } = await supabase.rpc('update_my_referral_payout_details', {
        p_bank_name: details.bank_name,
        p_account_name: details.account_name,
        p_account_number: details.account_number,
    })
    if (error) throw error
}

export async function requestPayout(): Promise<{ amount_ngn: number }> {
    const { data, error } = await supabase.rpc('request_referral_payout')
    if (error) throw error
    const result = data as { payout_id: string; amount_ngn: number }
    // Tell the team; failure here must not look like a failed request.
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
        fetch(buildCommandCenterUrl('/referral-payout-notify'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ payoutId: result.payout_id }),
        }).catch(() => undefined)
    }
    return result
}

async function callPublicFunction(path: string, body: unknown) {
    const response = await fetch(buildCommandCenterUrl(path), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data?.success === false) {
        throw new ReferralApiError(data?.error || 'Something went wrong. Please try again.', data?.error_code ?? null)
    }
    return data
}

export interface ReferrerApplication {
    firstName: string
    lastName: string
    email: string
    phone: string
    country: string
    profession: string
    audience: string
    networkSize: string
    note: string
    password: string
    hp?: string
}

export class ReferralApiError extends Error {
    code: string | null
    constructor(message: string, code: string | null) {
        super(message)
        this.code = code
    }
}

export function submitReferrerApplication(payload: ReferrerApplication) {
    return callPublicFunction('/referral-apply', payload) as Promise<{
        success: true
        status: string
        existing_account?: boolean
    }>
}

export interface PublicReferral {
    referral_code: string
    referrer_first_name: string
}

export async function fetchReferralLanding(code: string): Promise<PublicReferral | null> {
    const { data, error } = await supabase.rpc('get_referral_landing', { p_code: code })
    if (error) throw error
    return (data as PublicReferral) ?? null
}

export interface ReferralLead {
    code: string
    fullName: string
    phone: string
    email: string
    profession: string
    service: string
    destination: string
    note: string
    hp?: string
}

export interface ReferralLeadResult {
    success: true
    outcome: 'case_created' | 'existing_case'
    case_reference: string
    service_label?: string
    referrer_first_name?: string
}

export function submitReferralLead(payload: ReferralLead) {
    return callPublicFunction('/referral-lead', payload) as Promise<ReferralLeadResult>
}

/** Referred-person journey, as the referrer sees it. Commission is earned when
 *  the referred client pays, so the fourth rung is about the service being paid
 *  for rather than the case file being closed. */
export const STEP_LABELS = ['Referred', 'Case opened', 'In progress', 'Service complete', 'Commission paid']

export function formatNaira(amount: number | null | undefined): string {
    const value = Number(amount ?? 0)
    return `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(value: string | null | undefined): string {
    if (!value) return '—'
    return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const SERVICE_OPTIONS: { value: string; label: string }[] = [
    { value: 'dataflow', label: 'DataFlow verification' },
    { value: 'mumaris', label: 'Mumaris / SCFHS licensing (Saudi)' },
    { value: 'qatar_evaluation', label: 'Qatar evaluation (DHP)' },
    { value: 'exam_booking', label: 'Exam booking (Prometric, NCLEX, Pearson VUE)' },
    { value: 'cgfns', label: 'CGFNS credential evaluation' },
    { value: 'uae_licensing', label: 'UAE licensing' },
    { value: 'academy', label: 'Academy programmes' },
    { value: 'other', label: 'Something else' },
]

export const SERVICE_LABELS: Record<string, string> = {
    dataflow: 'DataFlow verification',
    mumaris: 'Mumaris / SCFHS',
    qatar_evaluation: 'Qatar evaluation',
    exam_booking: 'Exam booking',
    cgfns: 'CGFNS evaluation',
    uae_licensing: 'UAE licensing',
    academy: 'Academy',
    miscellaneous: 'Other service',
}

export const PROFESSION_OPTIONS = [
    'Nurse',
    'Midwife',
    'Doctor',
    'Pharmacist',
    'Lab scientist',
    'Other healthcare professional',
    'Not a healthcare professional',
]

export const DESTINATION_OPTIONS = [
    'Saudi Arabia',
    'Qatar',
    'Oman',
    'UAE',
    'Kuwait',
    'Bahrain',
    'United Kingdom',
    'Ireland',
    'United States',
    'Canada',
    'Australia',
    'Not sure yet',
]

export { SUPABASE_URL }
