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

A **new** function, `client-document-upload`. **Do not extend `client-documents-api`** — it
authenticates with a shared static key (`SYNC_API_KEY`) and deploys `--no-verify-jwt`,
making it a machine-to-machine endpoint for Command Centre. Putting a client-facing path
behind a shared secret means a browser holding that key could read every client's
documents. The new function verifies the caller's **JWT** and derives identity from it,
using service role only for the privileged write.

1. **Request slot** — client calls the function with its JWT. Function verifies the JWT,
   resolves the person by email **server-side**, returns a signed upload URL scoped to
   that person's path.
2. **Upload** — client PUTs bytes directly to storage. Large files never transit the
   function.
3. **Commit** — client calls the function, which inserts into `documents` with
   `source='client_portal'`, `person_id`, and `case_id` where resolvable, `case_id` only when the
   person has exactly one active case. Checklist linkage is deferred — see resolved
   question 3.
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
| Write path | New JWT-verifying edge function | Avoids client RLS on a shared staff table |
| Which function | New `client-document-upload`, not `client-documents-api` | The latter is M2M, gated by a shared static key |
| File transfer | Signed upload URL, direct to storage | Keeps large files out of the function |
| `uploaded_by_user_id` | NULL for client uploads | It is a staff FK |
| Review-state UI | Drop it | See below |
| Abandoned SQL | Delete from the repo | It is a trap for the next reader |

**Review-state UI.** `documents` has no `status` / `reviewed_by` / `review_notes`. Rather
than invent a review workflow, drop the portal's review-state UI and surface the
checklist's `is_received`, which is the state staff actually act on.

## Resolved questions

1. ~~Storage bucket~~ — **resolved: `case-documents`** (private). CC has 18 buckets and
   **no `client-documents` among them**, so the portal's `storage.from('client-documents')
   .upload(...)` fails at the storage put, *before* the missing-table insert — upload has
   never worked from its very first step. `case-documents` holds **8,716 objects** against
   the table's 8,694 rows and is where case documents actually live; paths are prefixed by
   person/case UUID (`uncategorized/` for 3,266 unfiled). The public `documents` bucket
   holds only 110 objects and is something else.
2. ~~Case resolution~~ — **resolved: exactly-one-active-case, else NULL.** If the person has
   precisely one case with `status='active'`, attach its `case_id`; with zero or several,
   leave `case_id` NULL for staff to file. **Corrected 2026-09-20 — the original figure here was wrong.**
   It said "957 have exactly one active case, 83 have two or more, so this resolves ~92%",
   which silently excluded the **617 persons with ZERO active cases**, who also get
   `case_id` NULL. The real distribution is **957 resolve, 617 zero-active unfiled, 83
   many-active unfiled** — so **700 of 1,657 persons (42%) land unfiled**, not 8%.
   (The `on_hold` status is irrelevant in practice: the database contains zero such cases.)
   This does not change the decision — guessing among cases is still worse than leaving one
   unfiled — but it changes the consequence, and see the release gate below. Guessing among several cases would file a passport against
   the wrong application, which is worse than leaving it unfiled.
3. ~~Checklist matching~~ — **resolved: deferred to a later iteration.** v1 does not write
   `case_document_checklist`. Marking `is_received` on a guessed row tells staff a document
   arrived that did not — a silent false positive, the exact failure mode this spec exists
   to avoid. CC already has classification machinery (`classification_method`,
   `classification_confidence`); reuse it later rather than duplicate it now. Staff
   visibility is delivered by the `documents` row alone, which is what this repair is for.

## Noted for separate follow-up

The `documents` bucket is **public** and holds 110 objects. Not this project's target and
not necessarily a problem — but a public bucket in a system handling passports and
licensing certificates is worth an explicit look. Out of scope here; raised so it is not
lost.

## RELEASE GATE — staff cannot see unfiled uploads

Found by the final whole-branch review, 2026-09-20, and verified.

An upload with `case_id` NULL is written successfully, reported to the client as successful,
and **is visible on no staff screen**. Every Command Centre read of `documents` filters by
case: `src/pages/CaseDetail.tsx:176` (`.eq('case_id', id)`), `src/lib/documents/documentService.ts:97`
(`getDocuments(caseId)`), and `src/pages/PersonDetail.tsx` never loads documents at all.

Combined with the corrected 42% figure above, that is this spec's own stated failure mode —
"a client uploads a passport, it lands where no staff screen reads, and the case stalls while
everyone believes it arrived" — reintroduced one layer up.

The fix lives in the **Command Centre repo**, which this plan does not touch, so it is out of
scope here. It is a gate on *announcing* the feature, not on deploying or merging it:

- Deploying and merging this branch is safe. Nothing regresses; upload goes from broken to working.
- **Do not tell clients the feature exists** until staff have a surface listing
  `source = 'client_portal' AND case_id IS NULL`, or uploads are attached some other way.

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
