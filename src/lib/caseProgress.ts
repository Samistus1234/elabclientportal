import { supabase } from '@/lib/supabase'

export type PhaseState = 'done' | 'current' | 'upcoming'
export type KeyDateKind = 'valid_until' | 'event' | 'due'
export type FeeState =
    | 'paid' | 'being_checked' | 'part_paid' | 'invoiced'
    | 'coming_later' | 'paid_directly' | 'to_be_invoiced'

export interface ProgressItem {
    title: string
    note: string | null
    third_party: string | null
    due_on: string | null
    valid_until: string | null
    event_date: string | null
    done_on: string | null
    is_milestone: boolean
}

export interface ProgressFee {
    label: string
    payee: string
    amount: number
    currency: string
    state: FeeState
    invoice_id: string | null
    amount_due: number | null
    due_with: string | null
}

export interface CaseProgress {
    first_name: string
    case_reference: string
    service: string
    deliverable: string
    is_complete: boolean
    phases: { label: string; state: PhaseState }[]
    groups: {
        waiting_on_you: ProgressItem[]
        with_elab: ProgressItem[]
        with_others: ProgressItem[]
        done: ProgressItem[]
    }
    key_dates: { label: string; kind: KeyDateKind; date: string }[]
    fees: ProgressFee[]
    last_updated: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function keyDateLabel(kind: KeyDateKind): string {
    switch (kind) {
        case 'valid_until': return 'Valid until'
        case 'event': return 'Date'
        case 'due': return 'Due'
    }
}

function money(n: number | null, currency: string): string {
    return `${(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`
}

export function formatMoney(n: number, currency: string): string {
    return money(n, currency)
}

export function isElabPayee(payee: string): boolean {
    return payee.trim().toLowerCase() === 'elab'
}

/** Latest done_on first, items with no date last; ties keep the reversed RPC order. */
export function sortDoneLatestFirst(items: ProgressItem[]): ProgressItem[] {
    return [...items].reverse().sort((a, b) => {
        if (a.done_on === b.done_on) return 0
        if (!a.done_on) return 1
        if (!b.done_on) return -1
        return a.done_on < b.done_on ? 1 : -1
    })
}

export function feeStateLabel(fee: ProgressFee): string {
    switch (fee.state) {
        case 'paid': return 'Paid'
        case 'being_checked': return 'Payment being checked'
        case 'part_paid': return `Part paid, ${money(fee.amount_due, fee.currency)} left`
        case 'invoiced': return `To pay: ${money(fee.amount_due, fee.currency)}`
        case 'coming_later': return fee.due_with ? `Later, when ${fee.due_with}` : 'Later'
        case 'paid_directly': return `Paid directly to ${isElabPayee(fee.payee) ? 'eLab' : fee.payee}`
        case 'to_be_invoiced': return 'To be invoiced'
    }
}

export async function getCaseProgress(token: string): Promise<CaseProgress | null> {
    if (!UUID_RE.test(token)) return null
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('fixture') === '1') {
        return FIXTURE
    }
    const { data, error } = await supabase.rpc('get_public_case_progress', { p_token: token })
    if (error) throw error
    return (data as CaseProgress | null) ?? null
}

const item = (title: string, extra: Partial<ProgressItem> = {}): ProgressItem => ({
    title, note: null, third_party: null, due_on: null, valid_until: null,
    event_date: null, done_on: null, is_milestone: false, ...extra,
})

// Dev-only sample (`?fixture=1`); never reached in production builds.
const FIXTURE: CaseProgress = {
    first_name: 'Amaka',
    case_reference: 'ELB-2026-04821',
    service: 'Texas nursing licence',
    deliverable: 'Authorization to Test',
    is_complete: false,
    last_updated: '2026-11-20T10:00:00Z',
    phases: [
        { label: 'Getting started', state: 'done' },
        { label: 'Board application', state: 'current' },
        { label: 'Fingerprints', state: 'upcoming' },
        { label: 'Authorization to Test', state: 'upcoming' },
    ],
    groups: {
        waiting_on_you: [
            item('Send a clear photo of your passport', {
                note: 'The photo page, all four corners visible, no glare.', due_on: '2026-12-01',
            }),
        ],
        with_elab: [
            item('Complete your board application', { note: 'We are filling in your profile and answering the background questions.' }),
        ],
        with_others: [
            item('Verification from your nursing council', { third_party: 'NMCN', note: 'They send it straight to the board. This usually takes several weeks.' }),
            item('Transcript from your school', { third_party: 'University of Nigeria', valid_until: '2027-02-10' }),
            item('Fingerprint appointment', { third_party: 'NMCN', event_date: '2026-12-15' }),
        ],
        done: [
            item('Account created', { done_on: '2026-11-02' }),
            item('Documents received', { done_on: '2026-11-05' }),
            item('Application fee paid', { done_on: '2026-11-08' }),
            item('Identity check', { done_on: '2026-11-10' }),
        ],
    },
    key_dates: [
        { label: 'Fingerprint appointment', kind: 'event', date: '2026-12-15' },
        { label: 'Send a clear photo of your passport', kind: 'due', date: '2026-12-01' },
        { label: 'Transcript from your school', kind: 'valid_until', date: '2027-02-10' },
    ],
    fees: [
        { label: 'Board application fee', payee: 'Texas BON', amount: 373, currency: 'USD', state: 'paid', invoice_id: null, amount_due: null, due_with: null },
        { label: 'eLab service fee, first part', payee: 'elab', amount: 500, currency: 'USD', state: 'being_checked', invoice_id: null, amount_due: null, due_with: null },
        { label: 'eLab service fee, second part', payee: 'elab', amount: 400, currency: 'USD', state: 'part_paid', invoice_id: '11111111-1111-4111-8111-111111111111', amount_due: 150, due_with: null },
        { label: 'Fingerprint processing', payee: 'elab', amount: 60000, currency: 'NGN', state: 'invoiced', invoice_id: '22222222-2222-4222-8222-222222222222', amount_due: 60000, due_with: null },
        { label: 'Exam booking', payee: 'elab', amount: 150, currency: 'USD', state: 'coming_later', invoice_id: null, amount_due: null, due_with: 'your Authorization to Test arrives' },
        { label: 'Courier', payee: 'elab', amount: 40, currency: 'USD', state: 'coming_later', invoice_id: null, amount_due: null, due_with: null },
        { label: 'Fingerprint card', payee: 'IdentoGO', amount: 50, currency: 'USD', state: 'paid_directly', invoice_id: null, amount_due: null, due_with: null },
        { label: 'Licence verification', payee: 'elab', amount: 70000, currency: 'NGN', state: 'to_be_invoiced', invoice_id: null, amount_due: null, due_with: null },
    ],
}
