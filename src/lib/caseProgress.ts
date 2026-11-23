import { supabase } from '@/lib/supabase'

export type PhaseState = 'done' | 'current' | 'upcoming'
export type KeyDateKind = 'valid_until' | 'event' | 'due'
/** Open items: todo / in_progress / waiting (R20). Items in the Done group carry 'done'. */
export type ItemStatus = 'todo' | 'in_progress' | 'waiting' | 'done'
export type FeeState =
    | 'paid' | 'being_checked' | 'part_paid' | 'invoiced'
    | 'coming_later' | 'paid_directly' | 'to_be_invoiced'

export interface ProgressItem {
    title: string
    status: ItemStatus
    note: string | null
    third_party: string | null
    /** Sent only for waiting_on_you items (R21d). */
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
    amount_due_currency: string | null
    invoice_shared: boolean
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
    /** Open items in phases after the current one, titles only, in phase order (R20). */
    coming_up: { phase: string; titles: string[] }[]
    key_dates: { label: string; kind: KeyDateKind; date: string }[]
    fees: ProgressFee[]
    last_updated: string | null
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

/** "In progress" / "Not started" for open items outside Waiting on you (R20). */
export function itemStatusLabel(status: ItemStatus): string | null {
    switch (status) {
        case 'in_progress':
        case 'waiting': return 'In progress'
        case 'todo': return 'Not started'
        default: return null
    }
}

/** Today's date as YYYY-MM-DD in the viewer's local time. */
export function todayIso(now: Date = new Date()): string {
    const p = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

/** A valid_until strictly before today has expired (R21f). */
export function isExpired(validUntil: string | null, today: string = todayIso()): boolean {
    return !!validUntil && validUntil < today
}

export function feeStateLabel(fee: ProgressFee): string {
    switch (fee.state) {
        case 'paid': return 'Paid'
        case 'being_checked': return 'Payment being checked'
        // amount_due is in the invoice's own currency, which can differ from the line's.
        case 'part_paid':
            return fee.amount_due == null ? 'Part paid'
                : `Part paid, ${money(fee.amount_due, fee.amount_due_currency || fee.currency)} left`
        case 'invoiced':
            return fee.amount_due == null ? 'To pay'
                : `To pay: ${money(fee.amount_due, fee.amount_due_currency || fee.currency)}`
        case 'coming_later': return fee.due_with ? `Later, when ${fee.due_with}` : 'Later'
        case 'paid_directly': return `Paid directly to ${isElabPayee(fee.payee) ? 'eLab' : fee.payee}`
        case 'to_be_invoiced': return 'To be invoiced'
    }
}

export async function getCaseProgress(token: string): Promise<CaseProgress | null> {
    if (!UUID_RE.test(token)) return null
    if (import.meta.env.DEV) {
        const fx = new URLSearchParams(window.location.search).get('fixture')
        if (fx === '1') return FIXTURE
        if (fx === 'alldone') return FIXTURE_ALL_DONE
    }
    const { data, error } = await supabase.rpc('get_public_case_progress', { p_token: token })
    if (error) throw error
    return (data as CaseProgress | null) ?? null
}

const item = (title: string, extra: Partial<ProgressItem> = {}): ProgressItem => ({
    title, status: 'todo', note: null, third_party: null, due_on: null, valid_until: null,
    event_date: null, done_on: null, is_milestone: false, ...extra,
})

// Dev-only samples (`?fixture=1`, `?fixture=alldone`); never reached in production builds.
// The main sample is a mid-case Texas case (route texas_bon with optional item 5),
// items 1-3 done, so the page shows what a real client sees: titles and phase
// labels are the real ones from 20261123120000_licensure_checklist.sql.
const T = {
    ces: 'Your credential evaluation (CES) report',
    quote: 'Quote agreed and first payment made',
    appOpen: 'Your Texas application is open',
    nmcn: 'Nigerian licence verification received by the Texas Board',
    scfhs: 'Saudi licence verification received by the Texas Board',
    prints: 'Your fingerprints have been accepted',
    juris: 'Jurisprudence exam passed',
    cleared: 'The Texas Board has cleared your file',
    att: 'Your ATT (Authorization to Test) has been issued',
    city: 'Test city chosen',
    booked: 'Your exam is booked',
    result: 'Your exam result',
    licence: 'Your Texas nursing licence has been issued',
}

const FIXTURE: CaseProgress = {
    first_name: 'Amaka',
    case_reference: 'ELB-2026-04821',
    service: 'Texas nursing licence (NCLEX)',
    deliverable: 'Your Texas nursing licence',
    is_complete: false,
    last_updated: '2026-11-20T10:00:00Z',
    phases: [
        { label: 'Getting started', state: 'done' },
        { label: 'Preparing your documents and verifications', state: 'current' },
        { label: 'With the board', state: 'upcoming' },
        { label: 'Your exam', state: 'upcoming' },
        { label: 'Licensed / complete', state: 'upcoming' },
    ],
    groups: {
        waiting_on_you: [
            item(T.prints, {
                status: 'waiting',
                note: 'Book your IdentoGO appointment with the code we sent on WhatsApp, then send us the receipt.',
                due_on: '2026-12-05',
            }),
            item(T.juris, { note: 'Take the online Texas jurisprudence exam. We will send you the link and a short guide.' }),
        ],
        with_elab: [],
        with_others: [
            item(T.nmcn, {
                status: 'in_progress', third_party: 'NMCN',
                note: 'NMCN sends this straight to the Texas Board. It usually takes several weeks.',
            }),
            item(T.scfhs, { third_party: 'SCFHS' }),
        ],
        done: [
            item(T.ces, { status: 'done', done_on: '2026-10-28', valid_until: '2027-10-28' }),
            item(T.quote, { status: 'done', done_on: '2026-11-02' }),
            item(T.appOpen, { status: 'done', done_on: '2026-11-12', is_milestone: true, valid_until: '2027-11-12' }),
        ],
    },
    coming_up: [
        { phase: 'With the board', titles: [T.cleared] },
        { phase: 'Your exam', titles: [T.att, T.city, T.booked, T.result] },
        { phase: 'Licensed / complete', titles: [T.licence] },
    ],
    key_dates: [
        { label: T.prints, kind: 'due', date: '2026-12-05' },
        { label: T.ces, kind: 'valid_until', date: '2027-10-28' },
        { label: T.appOpen, kind: 'valid_until', date: '2027-11-12' },
    ],
    fees: [
        { label: 'eLab service fee, first part', payee: 'elab', amount: 500, currency: 'USD', state: 'paid', invoice_id: null, amount_due: null, amount_due_currency: null, invoice_shared: false, due_with: null },
        { label: 'Credential evaluation (CES)', payee: 'elab', amount: 550, currency: 'USD', state: 'being_checked', invoice_id: null, amount_due: null, amount_due_currency: null, invoice_shared: false, due_with: null },
        { label: 'eLab service fee, second part', payee: 'elab', amount: 400, currency: 'USD', state: 'part_paid', invoice_id: '11111111-1111-4111-8111-111111111111', amount_due: 150, amount_due_currency: 'USD', invoice_shared: false, due_with: null },
        { label: 'NMCN licence verification', payee: 'elab', amount: 70000, currency: 'NGN', state: 'invoiced', invoice_id: '22222222-2222-4222-8222-222222222222', amount_due: 70000, amount_due_currency: 'NGN', invoice_shared: false, due_with: null },
        { label: 'NCLEX registration', payee: 'Pearson VUE', amount: 350, currency: 'USD', state: 'coming_later', invoice_id: null, amount_due: null, amount_due_currency: null, invoice_shared: false, due_with: T.att },
        { label: 'Courier', payee: 'elab', amount: 40, currency: 'USD', state: 'coming_later', invoice_id: null, amount_due: null, amount_due_currency: null, invoice_shared: false, due_with: null },
        { label: 'Texas Board application fee', payee: 'Texas Board of Nursing', amount: 100, currency: 'USD', state: 'paid_directly', invoice_id: null, amount_due: null, amount_due_currency: null, invoice_shared: false, due_with: null },
        { label: 'SCFHS licence verification', payee: 'elab', amount: 300, currency: 'SAR', state: 'to_be_invoiced', invoice_id: null, amount_due: null, amount_due_currency: null, invoice_shared: false, due_with: null },
        // USD line billed on an NGN invoice
        { label: 'Document courier', payee: 'elab', amount: 30, currency: 'USD', state: 'invoiced', invoice_id: '33333333-3333-4333-8333-333333333333', amount_due: 45000, amount_due_currency: 'NGN', invoice_shared: false, due_with: null },
        // shared invoice: no per-line amount
        { label: 'Translation', payee: 'elab', amount: 20, currency: 'USD', state: 'invoiced', invoice_id: '44444444-4444-4444-8444-444444444444', amount_due: null, amount_due_currency: null, invoice_shared: true, due_with: null },
        { label: 'Notarisation', payee: 'elab', amount: 25, currency: 'USD', state: 'part_paid', invoice_id: '44444444-4444-4444-8444-444444444444', amount_due: null, amount_due_currency: null, invoice_shared: true, due_with: null },
    ],
}

// A case finished in September 2026; the CES, application and ATT validity
// dates have since passed, so those rows show "Expired" (R21f).
const FIXTURE_ALL_DONE: CaseProgress = {
    ...FIXTURE,
    is_complete: true,
    last_updated: '2026-09-14T09:30:00Z',
    phases: FIXTURE.phases.map((p) => ({ ...p, state: 'done' as const })),
    groups: {
        waiting_on_you: [], with_elab: [], with_others: [],
        done: [
            item(T.ces, { status: 'done', done_on: '2025-10-28', valid_until: '2026-10-28' }),
            item(T.quote, { status: 'done', done_on: '2025-11-02' }),
            item(T.appOpen, { status: 'done', done_on: '2025-11-12', is_milestone: true, valid_until: '2026-11-12' }),
            item(T.nmcn, { status: 'done', third_party: 'NMCN', done_on: '2025-12-20' }),
            item(T.scfhs, { status: 'done', third_party: 'SCFHS', done_on: '2026-01-08' }),
            item(T.prints, { status: 'done', done_on: '2025-12-03' }),
            item(T.juris, { status: 'done', done_on: '2025-12-10' }),
            item(T.cleared, { status: 'done', done_on: '2026-02-15' }),
            item(T.att, { status: 'done', done_on: '2026-03-01', is_milestone: true, valid_until: '2026-05-30' }),
            item(T.city, { status: 'done', done_on: '2026-03-04' }),
            item(T.booked, { status: 'done', done_on: '2026-03-10', is_milestone: true, event_date: '2026-04-22' }),
            item(T.result, { status: 'done', done_on: '2026-04-24', is_milestone: true }),
            item(T.licence, { status: 'done', done_on: '2026-09-14', is_milestone: true }),
        ],
    },
    coming_up: [],
    key_dates: [],
    fees: FIXTURE.fees.filter((f) => f.state === 'paid' || f.state === 'paid_directly'),
}
