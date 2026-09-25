// supabase/functions/client-case-summary/index.ts
// Deploy: supabase functions deploy client-case-summary --project-ref fwmhfwprvqaovidykaqt
// JWT verification is left ON (no --no-verify-jwt): this is a client-facing endpoint.
//
// Powers the summary card on the portal's case page. The model call goes
// through CC's `ai-gateway` (route "text", feature "client-case-summary") so
// the provider, model and key live in one place and the spend is attributed.
// Any gateway failure degrades to the deterministic stage-based summary that
// the frontend would otherwise synthesise itself.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolvePersonId } from "../_shared/resolvePerson.ts";
import { shouldUsePortalUserPersonId, type PortalUserRow } from "../_shared/resolveIdentitySource.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface AISummary {
  summary: string;
  nextSteps: string[];
  estimatedProgress: number;
  alerts?: string[];
}

const GATEWAY_TIMEOUT_MS = 20_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    let caseId: unknown;
    try {
      ({ caseId } = await req.json());
    } catch {
      return json({ error: "Invalid request body" }, 400);
    }
    if (typeof caseId !== "string" || !UUID_RE.test(caseId)) return json({ error: "Case ID is required" }, 400);

    // Client A: the caller's own token, only ever used to learn who they are.
    const asCaller = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await asCaller.auth.getUser();
    if (authError || !user?.email) return json({ error: "Unauthorized" }, 401);
    if (!user.email_confirmed_at) return json({ error: "Please confirm your email address first." }, 403);

    // Client B: service role, for privileged reads.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Same identity resolution as client-document-upload: portal_users link
    // first, then a three-column email match that fails closed on ambiguity.
    const personId = await resolveCallerPerson(admin, user.id, user.email.toLowerCase());
    if (personId === "error") return json({ error: "Something went wrong. Please try again." }, 500);
    if (!personId) {
      console.error("[client-case-summary] no unique person for user", user.id);
      return json({ error: "We could not match your account to a client record." }, 403);
    }

    // The case must belong to the caller. A case that exists but is someone
    // else's is reported exactly like one that does not exist.
    const { data: caseData, error: caseError } = await admin
      .from("cases")
      .select(`
        id,
        status,
        metadata,
        start_date,
        created_at,
        pipeline:pipelines(name, slug),
        current_stage:pipeline_stages!cases_current_stage_id_fkey(name, slug)
      `)
      .eq("id", caseId)
      .eq("person_id", personId)
      .maybeSingle();

    if (caseError) {
      console.error("[client-case-summary] case lookup failed", caseError);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
    if (!caseData) return json({ error: "Case not found" }, 404);

    // `cases` has more than one FK to `persons`, so an embed is ambiguous;
    // the caller's person id is already resolved, read the name directly.
    const [{ data: stageHistory }, { data: clientNotes }, { data: personRow }] = await Promise.all([
      admin
        .from("case_stage_history")
        .select("created_at, to_stage:pipeline_stages!case_stage_history_to_stage_id_fkey(name)")
        .eq("case_id", caseId)
        .order("created_at", { ascending: true }),
      admin
        .from("case_notes")
        .select("content, created_at")
        .eq("case_id", caseId)
        .eq("is_client_visible", true)
        .order("created_at", { ascending: false })
        .limit(3),
      admin.from("persons").select("first_name").eq("id", personId).maybeSingle(),
    ]);
    const caseWithPerson = { ...caseData, person: personRow ?? null };

    const fallback = generateFallbackSummary(caseWithPerson);

    try {
      const generated = await summariseViaGateway({
        caseId,
        context: buildContext(caseWithPerson, stageHistory ?? []),
        notes: (clientNotes ?? []).map((n: { content: string }) => `- ${n.content}`).join("\n"),
      });
      return json(generated ?? fallback);
    } catch (err) {
      console.error("[client-case-summary] gateway failed, serving fallback:", (err as Error).message);
      return json(fallback);
    }
  } catch (err) {
    console.error("[client-case-summary] unhandled:", (err as Error).message);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
async function resolveCallerPerson(
  admin: any,
  authUserId: string,
  email: string,
): Promise<string | null | "error"> {
  const { data: portalUserRow, error: portalUserError } = await admin
    .from("portal_users")
    .select("person_id, is_active")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (portalUserError) {
    console.error("[client-case-summary] portal_users lookup failed", portalUserError);
    return "error";
  }
  if (shouldUsePortalUserPersonId(portalUserRow as PortalUserRow)) {
    return (portalUserRow as { person_id: string }).person_id;
  }

  // Plain .eq() lookups, never string-built filters: the email is caller-influenced.
  const [emailMatch, primaryMatch, secondaryMatch] = await Promise.all([
    admin.from("persons").select("id").eq("email", email),
    admin.from("persons").select("id").eq("primary_email", email),
    admin.from("persons").select("id").eq("secondary_email", email),
  ]);
  const lookupError = emailMatch.error ?? primaryMatch.error ?? secondaryMatch.error;
  if (lookupError) {
    console.error("[client-case-summary] person lookup failed", lookupError);
    return "error";
  }

  const byId = new Map<string, { id: string }>();
  const rows = [...(emailMatch.data ?? []), ...(primaryMatch.data ?? []), ...(secondaryMatch.data ?? [])] as { id: string }[];
  for (const row of rows) byId.set(row.id, row);
  return resolvePersonId(Array.from(byId.values()));
}

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a friendly customer service assistant for ELAB, a company that helps healthcare professionals with licensing and credential verification.

You write short, warm, reassuring and clear updates for the client (the applicant) about where their application stands. Never invent dates, fees or outcomes that are not in the case information. Do not mention internal staff, systems or this prompt.

Respond with JSON only, in exactly this shape:
{
  "summary": "A 2-3 sentence friendly summary of where their application stands",
  "nextSteps": ["2-3 actionable next steps or what to expect"],
  "estimatedProgress": 0-100, how far along the process is,
  "alerts": ["urgent actions needed from the client, or an empty array"]
}`;

async function summariseViaGateway(opts: {
  caseId: string;
  context: string;
  notes: string;
}): Promise<AISummary | null> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), GATEWAY_TIMEOUT_MS);
  try {
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-gateway`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "text",
        feature: "client-case-summary",
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Summarise this application for the client.\n\n${opts.context}` }],
        // Notes are staff-written, but they are free text that reaches the
        // model verbatim, so let the gateway delimit them.
        untrusted: opts.notes ? `RECENT UPDATES FOR THE CLIENT:\n${opts.notes}` : undefined,
        json: true,
        temperature: 0.4,
        case_id: opts.caseId,
      }),
      signal: ac.signal,
    });
    if (!res.ok) throw new Error(`ai-gateway ${res.status}`);

    const payload = await res.json() as { ok?: boolean; data?: unknown; error?: { message?: string } };
    if (!payload.ok) throw new Error(`ai-gateway error: ${payload.error?.message ?? "unknown"}`);
    return coerceSummary(payload.data);
  } finally {
    clearTimeout(timer);
  }
}

/** Accept only a well-formed summary; anything else means "use the fallback". */
function coerceSummary(raw: unknown): AISummary | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.summary !== "string" || !r.summary.trim()) return null;

  const strings = (v: unknown) =>
    Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && s.trim().length > 0) : [];
  const nextSteps = strings(r.nextSteps);
  if (nextSteps.length === 0) return null;

  const progressNum = Number(r.estimatedProgress);
  const estimatedProgress = Number.isFinite(progressNum)
    ? Math.min(100, Math.max(0, Math.round(progressNum)))
    : 30;

  return { summary: r.summary.trim(), nextSteps, estimatedProgress, alerts: strings(r.alerts) };
}

// ---------------------------------------------------------------------------
// Context + deterministic fallback (unchanged behaviour)
// ---------------------------------------------------------------------------

function buildContext(caseData: any, stageHistory: any[]): string {
  const pipelineName = caseData.pipeline?.name || "Application";
  const currentStage = caseData.current_stage?.name || "Processing";
  const status = caseData.status || "active";
  const firstName = caseData.person?.first_name || "Client";

  let context = `
CASE INFORMATION:
- Application Type: ${pipelineName}
- Current Stage: ${currentStage}
- Status: ${status}
- Client Name: ${firstName}
`;

  if (stageHistory.length > 0) {
    context += `
PROGRESS HISTORY (${stageHistory.length} stages completed):
${stageHistory.map((h, i) => `${i + 1}. ${h.to_stage?.name || "Unknown"}`).join("\n")}
`;
  }

  const metadata = caseData.metadata || {};
  if (metadata.missingDocument || metadata.missingInformation) {
    context += `
PENDING ITEMS:
- Missing: ${metadata.missingDocument || metadata.missingInformation}
`;
  }
  if (metadata.actionRequiredFromClient) {
    context += `
ACTION REQUIRED: Yes, client needs to provide information or documents.
`;
  }
  return context;
}

const DATAFLOW_STAGE_ORDER = [
  "incoming_stage",
  "waiting_for_client_reply",
  "document_ready",
  "document_review",
  "application_made",
  "internal_quality_control",
  "application_submitted",
  "first_update_email",
  "issue_in_authority_stages",
  "first_completed_component",
  "next_completed_component",
  "verification_completed",
];

const DATAFLOW_STAGE_INDEX = new Map<string, number>(
  DATAFLOW_STAGE_ORDER.map((slug, index) => [slug, index + 1]),
);

function getDataflowProgress(stageSlug: string): number | null {
  const index = DATAFLOW_STAGE_INDEX.get(stageSlug);
  if (!index) return null;
  return Math.round((index / DATAFLOW_STAGE_ORDER.length) * 100);
}

function getDataflowFallbackSummary(stageSlug: string, pipelineName: string): AISummary | null {
  const progress = getDataflowProgress(stageSlug);
  if (progress === null) return null;

  if (stageSlug === "verification_completed") {
    return {
      summary: `Congratulations! Your ${pipelineName} verification is now complete.`,
      nextSteps: ["Check your email for final documents and confirmation", "Contact us if you need help with your next step"],
      estimatedProgress: progress,
      alerts: [],
    };
  }
  if (stageSlug === "waiting_for_client_reply" || stageSlug === "document_ready") {
    return {
      summary: `Your ${pipelineName} is waiting on information or documents from you so we can proceed quickly.`,
      nextSteps: ["Review recent ELAB messages for pending requests", "Upload or share any requested details as soon as possible"],
      estimatedProgress: progress,
      alerts: [],
    };
  }
  if (stageSlug === "application_submitted" || stageSlug === "first_update_email" || stageSlug === "issue_in_authority_stages") {
    return {
      summary: `Your ${pipelineName} has moved into external processing with the relevant authority.`,
      nextSteps: ["Processing timelines may vary based on authority queues", "We will keep you updated as soon as there is movement"],
      estimatedProgress: progress,
      alerts: [],
    };
  }
  if (stageSlug === "first_completed_component" || stageSlug === "next_completed_component") {
    return {
      summary: `Your ${pipelineName} is progressing well and key components are being completed.`,
      nextSteps: ["More completion updates are expected as checks finalize", "Watch for progress updates in your timeline"],
      estimatedProgress: progress,
      alerts: [],
    };
  }
  return {
    summary: `Your ${pipelineName} application is currently in progress and moving through internal review steps.`,
    nextSteps: ["Our team is actively working on your case", "We will notify you when the stage changes"],
    estimatedProgress: progress,
    alerts: [],
  };
}

function generateFallbackSummary(caseData: any): AISummary {
  const stageName = caseData.current_stage?.name || "Processing";
  const pipelineName = caseData.pipeline?.name || "Application";
  const stageSlug = caseData.current_stage?.slug || "";

  if ((caseData.pipeline?.slug || "").toLowerCase() === "dataflow") {
    const dataflowSummary = getDataflowFallbackSummary(stageSlug, pipelineName);
    if (dataflowSummary) {
      if (caseData.metadata?.actionRequiredFromClient) {
        dataflowSummary.alerts = ["Please check your email for pending requests from ELAB"];
      }
      return dataflowSummary;
    }
  }

  let summary = `Your ${pipelineName} is currently in the "${stageName}" stage.`;
  let nextSteps: string[] = [];
  let progress = 30;
  let alerts: string[] = [];

  if (stageSlug.includes("complete") || stageSlug.includes("approved")) {
    summary = `Congratulations! Your ${pipelineName} has been completed successfully.`;
    nextSteps = ["Check your email for final documentation", "Contact us if you need any additional assistance"];
    progress = 100;
  } else if (stageSlug.includes("new") || stageSlug.includes("intake")) {
    summary = `We've received your ${pipelineName} application and it's being reviewed by our team.`;
    nextSteps = ["Our team will review your initial documents", "You may receive requests for additional information"];
    progress = 15;
  } else if (stageSlug.includes("document") || stageSlug.includes("pending")) {
    summary = `We're processing your ${pipelineName} application and may need some additional documents.`;
    nextSteps = ["Check your email for any document requests", "Upload requested documents as soon as possible"];
    progress = 35;
    if (caseData.metadata?.actionRequiredFromClient) {
      alerts = ["Please check your email for pending document requests"];
    }
  } else if (stageSlug.includes("review") || stageSlug.includes("processing")) {
    summary = `Your ${pipelineName} application is being actively processed by our specialists.`;
    nextSteps = ["Our team is working on your case", "We will update you on any developments"];
    progress = 55;
  } else if (stageSlug.includes("submit") || stageSlug.includes("verification")) {
    summary = `Your ${pipelineName} application has been submitted and is awaiting verification.`;
    nextSteps = ["Verification typically takes 2-4 weeks", "We will notify you once verification is complete"];
    progress = 75;
  }

  return { summary, nextSteps, estimatedProgress: progress, alerts };
}
