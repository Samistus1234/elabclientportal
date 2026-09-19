# Client document upload — repair and redesign

**Date:** 2026-09-19
**Status:** Design approved, not yet planned
**Repo:** `elabclientportal`
**Independent of:** [the native app](2026-09-19-portal-native-app-design.md). Ships first; unblocks that project's camera phase.

## Problem

In-portal document upload has never worked against the current database.

The feature was built against Supabase project `pvhwofaduoxirkroiblk` — the portal's own
project, named in the header of `supabase/functions/sql/client_documents_setup.sql`.
That project **no longer exists in the ELAB Supabase account.** The portal was repointed
to Command Centre (`fwmhfwprvqaovidykaqt`) and none of the document feature came across:

- `public.client_documents` **does not exist** in CC. Verified three ways: absent from
  `pg_class` across all schemas; direct SQL returns `42P01`; the live anon key returns
  `PGRST205 — Could not find the table 'public.client_documents' in the schema cache`.
- `supabase/functions/client-documents-api` is **not deployed** (238 functions in CC,
  not among them). It also has no upload action — only `list`, `download`,
  `update_status`, `delete`.

### Why it looks like it works

`src/pages/Documents.tsx` has two paths and only one is live:

- **Display** calls `fetchCaseStatus(...)` — "documents eLab already holds for this client
  (WhatsApp / email / office uploads)". Real data, works.
- **The `client_documents` read is swallowed** — `// Table might not exist yet - that's okay`
  → `setDocuments([])`. No error reaches the user.
- **The write cannot succeed.** After the storage put, `.from('client_documents').insert(...)`
  then `if (docError) throw docError`. The upload reports as failed.

So the page looks populated while in-portal upload is dead.

## Do not apply the abandoned SQL

`client_documents_setup.sql` must not be run. Three reasons:

1. It targets a project that no longer exists.
2. **`CREATE POLICY IF NOT EXISTS` is not valid PostgreSQL.** The script creates the
   table, five indexes, enables RLS, then errors. Run statement-by-statement it leaves
   **RLS enabled with zero policies** — a table locked to everyone, strictly worse than
   today's honest failure. This is the likely reason it was abandoned unfinished.
3. It would silo client uploads away from the documents staff actually work from.

## Why a parallel table is the wrong fix

CC already has `public.documents` — **8,694 rows** — whose columns are a near-superset of
what the portal needs: `case_id`, `person_id`, `name`, `type`, `storage_path`, `mime_type`,
`size_bytes`, `uploaded_by_user_id`, `uploaded_at`, `notes`, `is_confidential`, `label`,
`source`.

`source` already carries an established convention: `upload` (4,303), `dataflow_portal`,
`whatsapp:<id>`, `email:<addr>`, `copied_from_mumaris`. `client_portal` slots in.

`case_document_checklist` (6,050 rows) links by `document_id` with `is_received` /
`received_at` / `received_via` — the machinery that moves a case forward.

A separate `client_documents` table means a client uploads a passport, it lands where no
staff screen reads, and the case stalls while everyone believes it arrived. That failure
is silent, which makes it worse than the current one.

## Two blockers that rule out a simple repoint

1. **RLS.** `documents` INSERT requires `case_id`/`person_id` to be inside
   `get_user_org_id(auth.uid())` — a staff concept. A portal client has no org, so the
   predicate is false and the insert is denied.
2. **Foreign key.** `documents.uploaded_by_user_id` references the internal **`users`**
   (staff) table, not `auth.users`. The portal writes a Supabase auth UID there, which
   violates the FK regardless of RLS.

Identity is also thin: `persons` has **no auth linkage column** — only `email`,
`primary_email`, `secondary_email`. The portal matches clients by email string, the same
dual-column shadow issue already recorded in CC notes.

## Design: write through an edge function

Deploy and extend `client-documents-api`, which already holds a service-role client.

1. **Request slot** — client calls the function with its JWT. Function verifies the JWT,
   resolves the person by email **server-side**, returns a signed upload URL scoped to
   that person's path.
2. **Upload** — client PUTs bytes directly to storage. Large files never transit the
   function.
3. **Commit** — client calls the function, which inserts into `documents` with
   `source='client_portal'`, `person_id`, and `case_id` where resolvable, then links
   `case_document_checklist` (`document_id`, `is_received`, `received_via='client_portal'`)
   so the upload advances the case.
4. `uploaded_by_user_id` stays **NULL** — it is a staff FK and a client is not staff.
   Provenance comes from `source` + `person_id`.

### Why not client-facing RLS policies on `documents`

That table holds 8,694 records spanning every client. A client-facing SELECT policy keyed
on email matching, if subtly wrong, shows one nurse another nurse's passport — the worst
failure available here. Server-side authorization is explicit, testable and auditable; an
RLS predicate on a shared staff table is none of those.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Target table | Existing `public.documents` | Staff already work from it; avoids a silo |
| Provenance | `source='client_portal'` | Matches existing convention |
| Write path | Edge function, service role | Avoids client RLS on a shared staff table |
| File transfer | Signed upload URL, direct to storage | Keeps large files out of the function |
| `uploaded_by_user_id` | NULL for client uploads | It is a staff FK |
| Review-state UI | Drop it | See below |
| Abandoned SQL | Delete from the repo | It is a trap for the next reader |

**Review-state UI.** `documents` has no `status` / `reviewed_by` / `review_notes`. Rather
than invent a review workflow, drop the portal's review-state UI and surface the
checklist's `is_received`, which is the state staff actually act on.

## Open questions

1. **Storage bucket.** Uploads currently target `client-documents`, whose existence could
   not be proved — the storage list endpoint returns `[]` for non-existent buckets too
   (verified with a deliberately fake bucket as a control). CC has `case-documents` and
   `documents`. Prefer an existing CC bucket over creating another. Needs a service-role
   check of `storage.buckets` and its policies.
2. **Case resolution.** When a person has several open cases, which does an upload attach
   to? Options: most recent active, client picks, or leave `case_id` NULL and let staff
   file it. Leaving it NULL is safest but pushes work onto staff.
3. **Checklist matching.** Does the upload satisfy a named checklist row, or land
   unclassified for staff to match? CC has `classification_method` /
   `classification_confidence` on the checklist, suggesting existing automation worth
   reusing rather than duplicating.

## Testing

- Unit: person resolution by email across `email` / `primary_email` / `secondary_email`,
  including the no-match and multiple-match cases — the latter must fail closed, never
  attach a document to the wrong person.
- Authorization: a client cannot obtain an upload slot for another person's path; a client
  cannot commit a row naming another person.
- Integration: upload → row in `documents` with `source='client_portal'` → visible on the
  staff screen → checklist updated.
- Regression: staff upload paths unaffected; no change to the 8,694 existing rows.

## Out of scope

- Native camera capture — that is the app project's phase 3, and depends on this.
- Any change to staff-side document handling.
- HEIC normalisation. Originally the reason this investigation started; it cannot be
  assessed until uploads work. Revisit once real client uploads exist.
