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

  return json({ error: "Unknown action" }, 400);
});
