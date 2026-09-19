# Client Document Upload Repair — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make in-portal document upload work, by writing client uploads into Command Centre's existing `documents` table through a new JWT-verifying edge function.

**Architecture:** The browser never writes documents directly. A new edge function, `client-document-upload`, verifies the caller's JWT, resolves their person record server-side, hands back a signed upload URL scoped to that person's path in the private `case-documents` bucket, and then commits a row to `public.documents` with `source='client_portal'`. Identity resolution and case resolution are pure functions with Deno tests; the function is a thin shell around them.

**Tech Stack:** Deno (Supabase Edge Functions), `@supabase/supabase-js` v2, React 18 + Vite + TypeScript, PostgreSQL/Supabase.

**Spec:** `docs/superpowers/specs/2026-09-19-client-document-upload-design.md`

## Global Constraints

- **Target database:** Command Centre, project ref `fwmhfwprvqaovidykaqt`. The portal points here. Project `pvhwofaduoxirkroiblk` referenced in old files **no longer exists** — ignore every instruction mentioning it.
- **Target table:** `public.documents` (8,694 existing rows). **Never create `client_documents`.**
- **Target bucket:** `case-documents` (private, 8,716 objects). **Never create `client-documents`.**
- **Provenance:** every client-written row sets `source = 'client_portal'` exactly.
- **`uploaded_by_user_id` must be NULL** on client uploads. It is a foreign key to the internal staff `users` table, not `auth.users`.
- **Do not write `case_document_checklist`** in this plan. Deferred by the spec.
- **Do not extend `client-documents-api`.** It is gated by a shared static `SYNC_API_KEY` and deploys `--no-verify-jwt`; it is machine-to-machine.
- **Never run** `supabase/functions/sql/client_documents_setup.sql`. It uses invalid `CREATE POLICY IF NOT EXISTS` syntax and would leave RLS enabled with no policies.
- **No schema migrations.** This plan changes no table definitions.
- Existing staff upload paths and the 8,694 existing rows must be unaffected.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/functions/_shared/resolvePerson.ts` (create) | Pure: auth email → person id. Fails closed. |
| `supabase/functions/_shared/resolveCase.ts` (create) | Pure: person id → case id or null. |
| `supabase/functions/_shared/resolvePerson.test.ts` (create) | Deno tests for person resolution. |
| `supabase/functions/_shared/resolveCase.test.ts` (create) | Deno tests for case resolution. |
| `supabase/functions/client-document-upload/index.ts` (create) | JWT-verifying HTTP shell; `create_slot` + `commit`. |
| `src/lib/documentUpload.ts` (create) | Browser client for the two endpoints. |
| `src/pages/Documents.tsx` (modify) | Rewire upload; remove dead phantom-table code. |
| `supabase/functions/sql/client_documents_setup.sql` (delete) | Trap for the next reader. |
| `supabase/functions/client-documents-api/` (delete) | Undeployed, targets a dead project. |

---

### Task 1: Person resolution (pure, fails closed)

**Files:**
- Create: `supabase/functions/_shared/resolvePerson.ts`
- Test: `supabase/functions/_shared/resolvePerson.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `resolvePersonId(rows: PersonRow[]): string | null` and `type PersonRow = { id: string }`. Task 3 calls this.

The portal matches clients to `persons` by email across three columns (`email`, `primary_email`, `secondary_email`). The query lives in the function; this module decides what to do with the result. **Multiple matches must resolve to `null`, never to the first row** — attaching a passport to the wrong person is the worst outcome available here.

- [ ] **Step 1: Write the failing test**

```ts
// supabase/functions/_shared/resolvePerson.test.ts
import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { resolvePersonId } from "./resolvePerson.ts";

Deno.test("resolvePersonId: exactly one match returns its id", () => {
  assertEquals(resolvePersonId([{ id: "p1" }]), "p1");
});

Deno.test("resolvePersonId: no match returns null", () => {
  assertEquals(resolvePersonId([]), null);
});

Deno.test("resolvePersonId: multiple matches fail closed", () => {
  assertEquals(resolvePersonId([{ id: "p1" }, { id: "p2" }]), null);
});

Deno.test("resolvePersonId: null input fails closed", () => {
  assertEquals(resolvePersonId(null as unknown as { id: string }[]), null);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `deno test supabase/functions/_shared/resolvePerson.test.ts --allow-none`
Expected: FAIL — module `./resolvePerson.ts` not found.

- [ ] **Step 3: Write the minimal implementation**

```ts
// supabase/functions/_shared/resolvePerson.ts
export type PersonRow = { id: string };

/**
 * Decide which person a client's email belongs to.
 *
 * Fails closed on ambiguity: with zero or several matches this returns null
 * and the caller must refuse the upload. Picking the first of several rows
 * would file a client's passport against a stranger's application.
 */
export function resolvePersonId(rows: PersonRow[]): string | null {
  if (!Array.isArray(rows) || rows.length !== 1) return null;
  return rows[0].id ?? null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `deno test supabase/functions/_shared/resolvePerson.test.ts --allow-none`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/resolvePerson.ts supabase/functions/_shared/resolvePerson.test.ts
git commit -m "feat(upload): person resolution that fails closed on ambiguity"
```

---

### Task 2: Case resolution (exactly-one-active, else null)

**Files:**
- Create: `supabase/functions/_shared/resolveCase.ts`
- Test: `supabase/functions/_shared/resolveCase.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `resolveCaseId(rows: CaseRow[]): string | null` and `type CaseRow = { id: string; status: string }`. Task 4 calls this.

957 persons have exactly one active case; 83 have two or more. Attach only when unambiguous. `pipeline_status` values are `active`, `on_hold`, `completed`, `cancelled` — only `active` counts.

- [ ] **Step 1: Write the failing test**

```ts
// supabase/functions/_shared/resolveCase.test.ts
import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { resolveCaseId } from "./resolveCase.ts";

Deno.test("resolveCaseId: exactly one active case attaches", () => {
  assertEquals(resolveCaseId([{ id: "c1", status: "active" }]), "c1");
});

Deno.test("resolveCaseId: two active cases leave it unfiled", () => {
  assertEquals(
    resolveCaseId([{ id: "c1", status: "active" }, { id: "c2", status: "active" }]),
    null,
  );
});

Deno.test("resolveCaseId: non-active statuses are ignored", () => {
  assertEquals(
    resolveCaseId([
      { id: "c1", status: "completed" },
      { id: "c2", status: "cancelled" },
      { id: "c3", status: "on_hold" },
      { id: "c4", status: "active" },
    ]),
    "c4",
  );
});

Deno.test("resolveCaseId: no active case leaves it unfiled", () => {
  assertEquals(resolveCaseId([{ id: "c1", status: "completed" }]), null);
});

Deno.test("resolveCaseId: empty input leaves it unfiled", () => {
  assertEquals(resolveCaseId([]), null);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `deno test supabase/functions/_shared/resolveCase.test.ts --allow-none`
Expected: FAIL — module `./resolveCase.ts` not found.

- [ ] **Step 3: Write the minimal implementation**

```ts
// supabase/functions/_shared/resolveCase.ts
export type CaseRow = { id: string; status: string };

/**
 * Pick the case an upload belongs to, or null to leave it for staff to file.
 *
 * Only `active` cases count. With zero or several, return null: guessing
 * among a client's open applications files the document against the wrong one,
 * which is worse than leaving it unfiled.
 */
export function resolveCaseId(rows: CaseRow[]): string | null {
  if (!Array.isArray(rows)) return null;
  const active = rows.filter((r) => r.status === "active");
  return active.length === 1 ? active[0].id : null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `deno test supabase/functions/_shared/resolveCase.test.ts --allow-none`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/resolveCase.ts supabase/functions/_shared/resolveCase.test.ts
git commit -m "feat(upload): attach a case only when exactly one is active"
```

---

### Task 3: `create_slot` — JWT verify, resolve person, signed upload URL

**Files:**
- Create: `supabase/functions/client-document-upload/index.ts`

**Interfaces:**
- Consumes: `resolvePersonId` (Task 1).
- Produces: `POST ?action=create_slot` → `200 { path: string, token: string }` or `403 { error }`. Task 6 calls this.

Two Supabase clients are needed and **must not be confused**: one built with the caller's JWT purely to identify them, and one with the service role to do privileged reads and the signed-URL creation. The caller's token never grants the write.

- [ ] **Step 1: Write the implementation**

```ts
// supabase/functions/client-document-upload/index.ts
// Deploy: supabase functions deploy client-document-upload --project-ref fwmhfwprvqaovidykaqt
// JWT verification is left ON (no --no-verify-jwt): this is a client-facing endpoint.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolvePersonId } from "../_shared/resolvePerson.ts";
import { resolveCaseId } from "../_shared/resolveCase.ts";

const BUCKET = "case-documents";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  // Client A: the caller's own token, used ONLY to establish who they are.
  const asCaller = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authError } = await asCaller.auth.getUser();
  if (authError || !user?.email) return json({ error: "Unauthorized" }, 401);

  // Client B: service role, for privileged reads and writes.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const email = user.email.toLowerCase();
  const { data: personRows } = await admin
    .from("persons")
    .select("id")
    .or(`email.eq.${email},primary_email.eq.${email},secondary_email.eq.${email}`);

  const personId = resolvePersonId((personRows ?? []) as { id: string }[]);
  if (!personId) {
    console.error("[client-document-upload] no unique person for", email);
    return json({ error: "We could not match your account to a client record." }, 403);
  }

  const action = new URL(req.url).searchParams.get("action");

  if (action === "create_slot") {
    const { fileName } = await req.json().catch(() => ({ fileName: null }));
    if (!fileName || typeof fileName !== "string") {
      return json({ error: "fileName is required" }, 400);
    }
    const safe = fileName.replace(/[^A-Za-z0-9._-]/g, "_").slice(-120);
    const path = `${personId}/${crypto.randomUUID()}-${safe}`;

    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) {
      console.error("[client-document-upload] signed url failed", error);
      return json({ error: "Could not start the upload." }, 500);
    }
    return json({ path: data.path, token: data.token });
  }

  return json({ error: "Unknown action" }, 400);
});
```

- [ ] **Step 2: Type-check it**

Run: `deno check supabase/functions/client-document-upload/index.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/client-document-upload/index.ts
git commit -m "feat(upload): create_slot issues a person-scoped signed upload URL"
```

---

### Task 4: `commit` — record the row in `documents`

**Files:**
- Modify: `supabase/functions/client-document-upload/index.ts` (add a second action before the `Unknown action` return)

**Interfaces:**
- Consumes: `resolveCaseId` (Task 2), the `admin` client and `personId` already in scope from Task 3.
- Produces: `POST ?action=commit` → `200 { document }` or an error. Task 6 calls this.

**The path must be re-derived from `personId`, not trusted from the request.** A client could otherwise commit a row naming a path under someone else's prefix.

- [ ] **Step 1: Write the implementation**

Insert immediately before `return json({ error: "Unknown action" }, 400);`:

```ts
  if (action === "commit") {
    const body = await req.json().catch(() => ({}));
    const { path, name, mimeType, sizeBytes } = body as {
      path?: string; name?: string; mimeType?: string; sizeBytes?: number;
    };

    if (!path || !name) return json({ error: "path and name are required" }, 400);

    // Authorization: the path must sit under THIS person's prefix.
    if (!path.startsWith(`${personId}/`)) {
      console.error("[client-document-upload] path/person mismatch", { personId, path });
      return json({ error: "Forbidden" }, 403);
    }

    const { data: caseRows } = await admin
      .from("cases")
      .select("id, status")
      .eq("person_id", personId);

    const caseId = resolveCaseId((caseRows ?? []) as { id: string; status: string }[]);

    const { data: doc, error } = await admin
      .from("documents")
      .insert({
        person_id: personId,
        case_id: caseId,                 // null when 0 or >1 active cases
        name,
        storage_path: path,
        mime_type: mimeType ?? null,
        size_bytes: sizeBytes ?? null,
        source: "client_portal",
        uploaded_by_user_id: null,       // FK targets the staff users table
      })
      .select()
      .single();

    if (error) {
      console.error("[client-document-upload] insert failed", error);
      return json({ error: "Could not record the document." }, 500);
    }
    return json({ document: doc });
  }

```

- [ ] **Step 2: Type-check it**

Run: `deno check supabase/functions/client-document-upload/index.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/client-document-upload/index.ts
git commit -m "feat(upload): commit writes documents rows with source=client_portal"
```

---

### Task 5: Deploy and verify against production

**Files:** none changed.

**Interfaces:**
- Consumes: the function from Tasks 3–4.
- Produces: a deployed `client-document-upload` on `fwmhfwprvqaovidykaqt`.

- [ ] **Step 1: Deploy**

```bash
cd ~/elabclientportal
supabase functions deploy client-document-upload --project-ref fwmhfwprvqaovidykaqt
```

Expected: deploy succeeds and the function appears in `supabase functions list --project-ref fwmhfwprvqaovidykaqt`.

- [ ] **Step 2: Verify it rejects anonymous callers**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  "https://fwmhfwprvqaovidykaqt.supabase.co/functions/v1/client-document-upload?action=create_slot" \
  -H "Content-Type: application/json" -d '{"fileName":"x.pdf"}'
```

Expected: `401`. A `200` here means JWT verification is off — stop and fix before going further.

- [ ] **Step 3: Record the pre-change row count**

```bash
cd "/Users/samuel/elabcommand center/elabcommandcentre-main"
supabase db query --linked "select count(*) as before_count from documents;"
```

Expected: 8694 or higher. Note the number; Task 6 compares against it.

- [ ] **Step 4: Commit the deploy note**

```bash
cd ~/elabclientportal
git commit --allow-empty -m "chore(upload): deploy client-document-upload to fwmhfwprvqaovidykaqt"
```

---

### Task 6: Rewire the browser upload path

**Files:**
- Create: `src/lib/documentUpload.ts`
- Modify: `src/pages/Documents.tsx:199-288` (`handleFiles`)

**Interfaces:**
- Consumes: `create_slot` and `commit` (Tasks 3–4).
- Produces: `uploadClientDocument(file: File): Promise<Document>` used by `handleFiles`.

- [ ] **Step 1: Write the browser client**

```ts
// src/lib/documentUpload.ts
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
    mimeType: file.type,
    sizeBytes: file.size,
  })
  return document
}
```

- [ ] **Step 2: Replace the upload body in `handleFiles`**

In `src/pages/Documents.tsx`, replace everything from `// Upload to Supabase Storage` through `if (docError) throw docError` (currently lines 230–264) with:

```ts
                const doc = await uploadClientDocument(file)

                setUploadingFiles(prev => prev.map(f =>
                    f.id === uploadId ? { ...f, progress: 100, status: 'success' } : f
                ))
                if (doc) setDocuments(prev => [doc, ...prev])
```

Add the import at the top of the file:

```ts
import { uploadClientDocument } from '@/lib/documentUpload'
```

- [ ] **Step 3: Align the `Document` interface with the real table**

The interface currently declares `status` as **required** and names four columns that
`public.documents` does not have (`case_reference`, `reviewed_by`, `reviewed_at`,
`review_notes`) — they belonged to the phantom `client_documents`. Assigning a real
`documents` row to this type is a compile error. Replace the interface at
`src/pages/Documents.tsx:26-40` with:

```ts
interface Document {
    id: string
    name: string
    storage_path: string
    mime_type?: string
    size_bytes?: number
    uploaded_at: string
    notes?: string
    type?: string
    label?: string
    source?: string
    /** Not a column on `documents`; the renderer falls back to 'pending'. */
    status?: 'pending' | 'approved' | 'rejected' | 'needs_revision'
}
```

The render site already tolerates this — `statusConfig[doc.status] || statusConfig.pending`
— so an absent status displays as pending, which is accurate for a fresh client upload.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Upload one file as a real client and verify it landed**

Sign in to the portal as a test client, upload a small PDF, then:

```bash
cd "/Users/samuel/elabcommand center/elabcommandcentre-main"
supabase db query --linked "select id, name, person_id, case_id, source, storage_path from documents where source='client_portal' order by uploaded_at desc limit 3;"
```

Expected: exactly one new row, `source = client_portal`, `storage_path` beginning with the person's UUID. Confirm the count rose by exactly one from Task 5 Step 3. Confirm the document is visible on the staff screen in Command Centre.

- [ ] **Step 6: Commit**

```bash
git add src/lib/documentUpload.ts src/pages/Documents.tsx
git commit -m "fix(documents): upload through the edge function into CC documents"
```

---

### Task 7: Remove the dead phantom-table code and files

**Files:**
- Modify: `src/pages/Documents.tsx` (the `client_documents` read at :157, `handleDownload` at :290, `handleDelete` at :311, and the `personId` state at :120)
- Delete: `supabase/functions/sql/client_documents_setup.sql`
- Delete: `supabase/functions/client-documents-api/`

`handleDownload` and `handleDelete` both act on entries of the `documents` list. That list was only ever filled from the phantom table, so in production it is always empty and both handlers are unreachable. They also reference the non-existent `client-documents` bucket. Remove them rather than port them; a download path can be added later against `case-documents` with a signed URL if clients ask for one.

- [ ] **Step 1: Remove the dead read**

In `loadDocuments`, delete the `.from('client_documents')` select and the `if (docsError)`
block that follows it, leaving `setDocuments([])`. Keep the `fetchCaseStatus(...)` call —
it is the working path that populates the page. Anchor on the `.from('client_documents')`
string rather than a line number; Task 6 has already shifted the file.

- [ ] **Step 2: Remove the unreachable handlers**

Delete `handleDownload` and `handleDelete` entirely, along with any JSX buttons calling
them. Both act on entries of the `documents` list and both reference the non-existent
`client-documents` bucket.

- [ ] **Step 3: Remove the now-unused `personId` state**

Delete the `const [personId, setPersonId] = useState<string | null>(null)` declaration and
the `setPersonId(personData.id)` call. The person is now resolved server-side, so the
browser no longer needs it. The `persons` lookup in `loadDocuments` may stay if other code
uses `personData`; if nothing does, remove that query too.

- [ ] **Step 4: Delete the trap files**

```bash
git rm supabase/functions/sql/client_documents_setup.sql
git rm -r supabase/functions/client-documents-api
```

- [ ] **Step 5: Build and lint**

Run: `npm run build && npm run lint`
Expected: both succeed with no unused-variable errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(documents): remove phantom-table code and dead setup files

The client_documents table never existed in Command Centre, so the read was
always swallowed, the documents list was always empty, and handleDownload and
handleDelete were unreachable. The setup SQL targets a deleted project and uses
invalid CREATE POLICY IF NOT EXISTS syntax; client-documents-api was never
deployed and is gated by a shared static key."
```

---

## Verification

After Task 7:

- [ ] A client can upload a document and see it succeed.
- [ ] The row appears in `documents` with `source='client_portal'` and a `person_id`.
- [ ] Staff can see the document in Command Centre.
- [ ] `case_id` is set when the client has exactly one active case, NULL otherwise.
- [ ] Anonymous calls to the function return 401.
- [ ] No row references bucket `client-documents`; no table `client_documents` was created.
- [ ] Existing document count grew only by test uploads.
