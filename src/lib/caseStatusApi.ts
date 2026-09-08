import { buildCommandCenterUrl, commandCenterHeaders } from './commandCenterApi'

export interface ReceivedDocument {
    id: string
    name: string
    type: string | null
    label: string | null
    uploaded_at: string | null
    source_kind: 'whatsapp' | 'email' | 'portal' | 'mumaris' | 'office' | string
}

export interface CaseStatus {
    case_id: string
    case_reference: string | null
    case_status: string | null
    pipeline_slug: string | null
    pipeline_name: string | null
    profession: string | null
    include_experience: boolean
    documents_received_count: number
    documents_received_at: string | null
    documents: ReceivedDocument[]
}

/**
 * Ask the Command Centre which documents eLab already holds for this client
 * (WhatsApp / email / office uploads), so the portal reflects reality instead
 * of showing every client an empty "please upload" state.
 *
 * Fails soft: on any error we return [] and the portal behaves as before.
 */
export async function fetchCaseStatus(emails: (string | null | undefined)[]): Promise<CaseStatus[]> {
    const clean = Array.from(new Set(emails.filter((e): e is string => !!e && e.includes('@'))))
        .map(e => e.trim().toLowerCase())
    if (clean.length === 0) return []

    try {
        const response = await fetch(buildCommandCenterUrl('/portal-case-status'), {
            method: 'POST',
            headers: commandCenterHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ emails: clean }),
        })
        if (!response.ok) return []
        const data = await response.json()
        return Array.isArray(data?.cases) ? (data.cases as CaseStatus[]) : []
    } catch {
        return []
    }
}

export function sourceKindLabel(kind: string): string {
    switch (kind) {
        case 'whatsapp': return 'Received via WhatsApp'
        case 'email': return 'Received via email'
        case 'portal': return 'Uploaded by you'
        case 'mumaris': return 'Carried over from Mumaris'
        default: return 'Received by our office'
    }
}
