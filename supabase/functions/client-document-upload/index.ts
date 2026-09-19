// supabase/functions/client-document-upload/index.ts
// Deploy: supabase functions deploy client-document-upload --project-ref fwmhfwprvqaovidykaqt
// JWT verification is left ON (no --no-verify-jwt): this is a client-facing endpoint.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolvePersonId } from "../_shared/resolvePerson.ts";
import { resolveCaseId } from "../_shared/resolveCase.ts";
import { hasUnsafePathSegments } from "../_shared/hasUnsafePathSegments.ts";

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

  // F6/F9: everything below can throw on a malformed/null body or a resolver
  // rejecting a malformed row. Catching it here means every failure still
  // returns through json(), so the response always carries CORS headers
  // instead of surfacing to the browser as an opaque CORS failure.
  try {
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

    // F2: an unconfirmed email is not proof of ownership. If sign-in is ever
    // possible before confirmation, an attacker registering a victim's
    // address would otherwise resolve straight to the victim's person record.
    if (!user.email_confirmed_at) {
      return json({ error: "Please confirm your email address before uploading documents." }, 403);
    }

    // Client B: service role, for privileged reads and writes.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const email = user.email.toLowerCase();

    // F3: the email is attacker-influenced and must never be interpolated
    // into PostgREST filter grammar (the old `.or(\`email.eq.${email},...\`)`
    // let a comma or paren in the address inject extra predicates and match
    // a different person). Three plain .eq() lookups, merged by id, achieve
    // the same "any of these three columns" match with no string building.
    const [emailMatch, primaryMatch, secondaryMatch] = await Promise.all([
      admin.from("persons").select("id").eq("email", email),
      admin.from("persons").select("id").eq("primary_email", email),
      admin.from("persons").select("id").eq("secondary_email", email),
    ]);

    // F8: a genuine query failure must surface as 500, not as "no matching
    // client record" (a 403 would misreport a database fault as an identity
    // problem).
    const personLookupError = emailMatch.error ?? primaryMatch.error ?? secondaryMatch.error;
    if (personLookupError) {
      console.error("[client-document-upload] person lookup failed", personLookupError);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }

    const personRowsById = new Map<string, { id: string }>();
    for (const row of [
      ...(emailMatch.data ?? []),
      ...(primaryMatch.data ?? []),
      ...(secondaryMatch.data ?? []),
    ]) {
      personRowsById.set(row.id, row);
    }

    const personId = resolvePersonId(Array.from(personRowsById.values()));
    if (!personId) {
      // F10: log the auth user id, never the email address.
      console.error("[client-document-upload] no unique person for user", user.id);
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

    if (action === "commit") {
      const body = await req.json().catch(() => ({}));
      const { path, name } = (body ?? {}) as { path?: unknown; name?: unknown };

      // F6/F9: runtime checks, not a TS cast — `body as {...}` vanishes at
      // runtime, so a wrong-shaped value (e.g. {"path": 123}) must be caught
      // here rather than throwing at path.startsWith further down.
      if (typeof path !== "string" || !path || typeof name !== "string" || !name) {
        return json({ error: "path and name are required" }, 400);
      }

      // F1: reject traversal/doubled-separator paths before doing anything
      // with them.
      if (hasUnsafePathSegments(path)) {
        console.error("[client-document-upload] unsafe path rejected", { personId, path });
        return json({ error: "Forbidden" }, 403);
      }

      // Authorization: the path must sit under THIS person's prefix.
      if (!path.startsWith(`${personId}/`)) {
        console.error("[client-document-upload] path/person mismatch", { personId, path });
        return json({ error: "Forbidden" }, 403);
      }

      // F1: startsWith proves the path is shaped right, not that create_slot
      // ever issued it or that anything was actually uploaded there. Verify
      // the object exists in storage, and read its real metadata while we're
      // there (F4) instead of trusting the request body for mime/size.
      const lastSlash = path.lastIndexOf("/");
      const folder = path.slice(0, lastSlash);
      const objectName = path.slice(lastSlash + 1);

      if (!objectName) {
        return json({ error: "Forbidden" }, 403);
      }

      const { data: listing, error: listError } = await admin.storage
        .from(BUCKET)
        .list(folder, { search: objectName, limit: 1 });

      if (listError) {
        console.error("[client-document-upload] storage lookup failed", listError);
        return json({ error: "Something went wrong. Please try again." }, 500);
      }

      const object = listing?.find((f) => f.name === objectName);
      if (!object) {
        console.error("[client-document-upload] committed path has no uploaded object", { personId, path });
        return json({ error: "We could not find that upload. Please try again." }, 404);
      }

      // F4: mimeType and sizeBytes are derived from the storage object's own
      // metadata now that its existence is confirmed, never trusted as
      // fact from the browser.
      const mimeType = typeof object.metadata?.mimetype === "string" ? object.metadata.mimetype : null;
      const sizeBytes = typeof object.metadata?.size === "number" ? object.metadata.size : null;

      const { data: caseRows, error: casesError } = await admin
        .from("cases")
        .select("id, status")
        .eq("person_id", personId);

      // F8: a failing cases lookup is not "no active case" — don't silently
      // file the document unlinked when the query itself broke.
      if (casesError) {
        console.error("[client-document-upload] case lookup failed", casesError);
        return json({ error: "Something went wrong. Please try again." }, 500);
      }

      const caseId = resolveCaseId((caseRows ?? []) as { id: string; status: string }[]);

      const { data: doc, error } = await admin
        .from("documents")
        .insert({
          person_id: personId,
          case_id: caseId,                 // null when 0 or >1 active cases
          name,
          storage_path: path,
          mime_type: mimeType,
          size_bytes: sizeBytes,
          source: "client_portal",
          uploaded_by_user_id: null,       // FK targets the staff users table
        })
        // F7: return only what the UI needs — not every column, which would
        // disclose internal ids and any staff-only fields to the browser.
        .select("id, name, storage_path, uploaded_at")
        .single();

      if (error) {
        console.error("[client-document-upload] insert failed", error);
        return json({ error: "Could not record the document." }, 500);
      }
      return json({ document: doc });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("[client-document-upload] unhandled error", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
