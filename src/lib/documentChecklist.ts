/**
 * Shared document-checklist logic for the client portal.
 *
 * The old checklist was hardcoded (passport / license / degree / transcript /
 * experience for everybody) and matched by substring against file names the
 * client uploaded inside the portal — so clients whose documents reached eLab
 * over WhatsApp always saw an empty, "nothing received" checklist.
 *
 * Now the checklist is derived from the case's pipeline + profession, and an
 * item counts as received when EITHER the client uploaded it in the portal OR
 * the Command Centre reports a matching document on file for the case.
 */

export interface ChecklistItem {
    id: string
    name: string
    required: boolean
    received: boolean
}

interface ReceivedDocLike {
    type?: string | null
    name?: string | null
}

const ITEM_DEFS: Record<string, { name: string; types: string[]; keywords: string[] }> = {
    passport: { name: 'Passport Copy', types: ['passport'], keywords: ['passport'] },
    license: { name: 'Professional License', types: ['license'], keywords: ['license', 'licence'] },
    degree: { name: 'Degree Certificate', types: ['degree', 'coe'], keywords: ['degree'] },
    transcript: { name: 'Academic Transcript', types: ['transcript'], keywords: ['transcript'] },
    experience: { name: 'Experience Letter', types: ['experience', 'experience_letter'], keywords: ['experience'] },
    dataflow_report: { name: 'DataFlow Verification Report', types: ['dataflow_report'], keywords: ['dataflow report'] },
}

const PHYSICIAN_HINTS = ['doctor', 'physician', 'medicine', 'medical', 'specialist', 'consultant', 'surgeon', 'dentist', 'anesthet', 'psychiatrist']
const NURSE_HINTS = ['nurs', 'midwif']

export function isPhysicianProfession(profession?: string | null): boolean {
    const p = (profession || '').toLowerCase()
    if (!p) return false
    return PHYSICIAN_HINTS.some(h => p.includes(h))
}

export function isNurseProfession(profession?: string | null): boolean {
    const p = (profession || '').toLowerCase()
    if (!p) return false
    return NURSE_HINTS.some(h => p.includes(h))
}

/** Which checklist items apply to this case, given pipeline + profession. */
export function checklistTemplate(opts: {
    pipelineSlug?: string | null
    profession?: string | null
    includeExperience?: boolean
}): string[] {
    const slug = (opts.pipelineSlug || '').toLowerCase()

    if (slug === 'mumaris') {
        // Letter of Work Experience is mandatory for every Mumaris applicant.
        return ['passport', 'license', 'degree', 'experience']
    }

    if (slug === 'dataflow') {
        const items = ['passport', 'license', 'degree']
        const physician = isPhysicianProfession(opts.profession)
        const nurse = isNurseProfession(opts.profession)
        // Physicians: no transcript in the DataFlow document list.
        if (!physician) items.push('transcript')
        // Work experience: private-sector packages & Mumaris need it; when the
        // case metadata says include_experience we always show it.
        if (opts.includeExperience || physician || nurse) items.push('experience')
        return items
    }

    // Unknown / other pipelines: conservative core list.
    return ['passport', 'license', 'degree']
}

/**
 * Build the checklist with received flags.
 * `receivedDocs` = documents eLab holds on file (Command Centre).
 * `portalDocs`   = documents the client uploaded inside the portal.
 */
export function buildChecklist(opts: {
    pipelineSlug?: string | null
    profession?: string | null
    includeExperience?: boolean
    receivedDocs: ReceivedDocLike[]
    portalDocs: ReceivedDocLike[]
}): ChecklistItem[] {
    const ids = checklistTemplate(opts)
    const all = [...opts.receivedDocs, ...opts.portalDocs]

    return ids.map(id => {
        const def = ITEM_DEFS[id]
        const received = all.some(d => {
            const t = (d.type || '').toLowerCase()
            if (def.types.includes(t)) return true
            const n = (d.name || '').toLowerCase()
            return def.keywords.some(k => n.includes(k))
        })
        return { id, name: def.name, required: true, received }
    })
}

/** Extra received document types worth surfacing even if not in the template. */
export function extraReceivedDocs(opts: {
    pipelineSlug?: string | null
    profession?: string | null
    includeExperience?: boolean
    receivedDocs: ReceivedDocLike[]
}): ReceivedDocLike[] {
    const ids = checklistTemplate(opts)
    const covered = new Set(ids.flatMap(id => ITEM_DEFS[id].types))
    return opts.receivedDocs.filter(d => d.type && d.type !== 'other' && !covered.has(d.type))
}
