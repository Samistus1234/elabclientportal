import { supabase } from '@/lib/supabase'

// L2: normalise a trailing slash on VITE_SUPABASE_URL the same way
// commandCenterApi.ts does, so a misconfigured env var with a trailing "/"
// doesn't produce a double-slash in the function URL.
const FN = `${(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')}/functions/v1/client-document-upload`

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

    // L2: a gateway-level failure (expired JWT, 5xx from infra in front of
    // the function, etc.) can return a non-JSON body. `res.json()` throws in
    // that case, which previously surfaced as an opaque parse error instead
    // of a usable message.
    let json: any
    try {
        json = await res.json()
    } catch {
        if (!res.ok) throw new Error(`Upload failed (${res.status}). Please try again.`)
        throw new Error('Upload failed: unexpected response from server.')
    }

    if (!res.ok) {
        // L2: on an expired JWT the platform's 401 body uses `message`, not
        // `error` — read both so the client sees "please sign in again"
        // instead of a generic "Upload failed".
        throw new Error(json?.error || json?.message || 'Upload failed')
    }
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
