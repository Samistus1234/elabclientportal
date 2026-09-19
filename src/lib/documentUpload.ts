import { supabase } from '@/lib/supabase'

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-document-upload`

async function call(action: string, body: unknown) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const res = await fetch(`${FN}?action=${action}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Upload failed')
    return json
}

/** Upload a file: get a slot, put the bytes, then record the row. */
export async function uploadClientDocument(file: File) {
    const { path, token } = await call('create_slot', { fileName: file.name })

    const { error: putError } = await supabase.storage
        .from('case-documents')
        .uploadToSignedUrl(path, token, file)
    if (putError) throw putError

    const { document } = await call('commit', {
        path,
        name: file.name.replace(/\.[^/.]+$/, ''),
    })
    return document
}
