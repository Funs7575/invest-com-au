import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  autoResolveDispute,
  notifyAdminEscalated,
} from "@/lib/advisor-lead-dispute-resolver";
import type { DisputeReason } from "@/lib/advisor-lead-disputes";

const log = logger("advisor-auth:disputes");

/**
 * Valid standardised reason_code values. The enum matches the DB
 * CHECK constraint added in 20260413_advisor_lead_dispute_auto_resolve.
 * Clients are encouraged to send a reason_code in addition to the
 * free-text reason so the classifier has a reliable dispatch key.
 */
const VALID_REASON_CODES: DisputeReason[] = [
  "spam_or_fake",
  "wrong_specialty",
  "out_of_area",
  "unreachable",
  "duplicate",
  "under_minimum",
  "other",
];

async function getAdvisorId(request: NextRequest): Promise<number | null> {
  const supabase = await createClient();
  const admin = createAdminClient();
  
  // Try Supabase Auth first
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: advisor } = await admin
      .from("professionals")
      .select("id")
      .eq("auth_user_id", user.id)
      .in("status", ["active", "pending"])
      .maybeSingle();
    if (advisor) return advisor.id;
  }
  
  // Fallback: legacy cookie session
  const sessionToken = request.cookies.get("advisor_session")?.value;
  if (!sessionToken) return null;
  const { data } = await admin
    .from("advisor_sessions")
    .select("professional_id, expires_at")
    .eq("session_token", sessionToken)
    .single();
  if (!data || new Date(data.expires_at) < new Date()) return null;
  return data.professional_id;
}

// Create a dispute
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (await isRateLimited(`dispute:${ip}`, 5, 300)) {
    return NextResponse.json({ error: "Too many dispute requests. Please try again later." }, { status: 429 });
  }

  const advisorId = await getAdvisorId(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { leadId, reason, details, reason_code: rawReasonCode } = body as {
    leadId?: number;
    reason?: string;
    details?: string;
    reason_code?: string;
  };
  if (!leadId || !reason) return NextResponse.json({ error: "Lead ID and reason required" }, { status: 400 });

  // Validate the optional standardised reason_code. Unknown values
  // are rejected at the API boundary so the classifier always sees a
  // clean enum (or null, in which case the resolver parses from the
  // free-text reason).
  const reasonCode: DisputeReason | null =
    rawReasonCode && VALID_REASON_CODES.includes(rawReasonCode as DisputeReason)
      ? (rawReasonCode as DisputeReason)
      : null;
  if (rawReasonCode && !reasonCode) {
    return NextResponse.json(
      { error: `Invalid reason_code. Must be one of: ${VALID_REASON_CODES.join(", ")}` },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Verify lead belongs to this advisor
  const { data: lead } = await supabase
    .from("professional_leads")
    .select("id, professional_id, created_at, billed")
    .eq("id", leadId)
    .eq("professional_id", advisorId)
    .single();

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Enforce 14-day dispute window
  const leadAge = Date.now() - new Date(lead.created_at).getTime();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  if (leadAge > fourteenDays) {
    return NextResponse.json({
      error: "Dispute window has closed. Leads can only be disputed within 14 days of delivery."
    }, { status: 400 });
  }

  // Only allow disputes on billed leads
  if (!lead.billed) {
    return NextResponse.json({
      error: "This lead was not billed (free trial lead) and cannot be disputed."
    }, { status: 400 });
  }

  // Check no existing dispute
  const { data: existingDispute } = await supabase
    .from("lead_disputes")
    .select("id")
    .eq("lead_id", leadId)
    .single();

  if (existingDispute) return NextResponse.json({ error: "This lead already has a dispute" }, { status: 409 });

  // Find associated billing record
  const { data: billingRecord } = await supabase
    .from("advisor_billing")
    .select("id")
    .eq("lead_id", leadId)
    .single();

  const { data: insertedDispute, error } = await supabase
    .from("lead_disputes")
    .insert({
      lead_id: leadId,
      professional_id: advisorId,
      reason,
      reason_code: reasonCode,
      details: details || null,
      billing_id: billingRecord?.id || null,
    })
    .select("id")
    .single();

  if (error || !insertedDispute) {
    return NextResponse.json({ error: "Failed to create dispute" }, { status: 500 });
  }

  // ── Inline auto-resolution ────────────────────────────────────
  // Run the classifier against the dispute we just created. High-
  // confidence verdicts get applied immediately (refund or reject)
  // so the advisor sees instant resolution. Low/medium-confidence
  // verdicts escalate to human review — stamped with the classifier
  // context so the admin has a head-start.
  //
  // autoResolveDispute is idempotent, so the backfill cron
  // /api/cron/auto-resolve-disputes can re-run on any row we leave
  // in `pending` state without causing double refunds.
  const result = await autoResolveDispute(insertedDispute.id);

  // Escalated disputes still need the admin email — just with extra
  // classifier signals so the admin can see what rules ran and why
  // the classifier punted.
  if (result.verdict === "escalate") {
    const { data: advisor } = await supabase
      .from("professionals")
      .select("name")
      .eq("id", advisorId)
      .single();
    const { data: leadData } = await supabase
      .from("professional_leads")
      .select("user_name")
      .eq("id", leadId)
      .single();
    notifyAdminEscalated(
      insertedDispute.id,
      advisor?.name || "An advisor",
      leadData?.user_name || "Unknown",
      reason,
      details || null,
      result.reasons,
    ).catch((err) =>
      log.error("[disputes] admin escalation email failed", {
        err: err instanceof Error ? err.message : String(err),
      }),
    );
  }

  return NextResponse.json({
    success: true,
    dispute_id: insertedDispute.id,
    auto_resolved: result.verdict !== "escalate",
    verdict: result.verdict,
    refunded_cents: result.refundedCents,
  });
}

// Get disputes for authenticated advisor
export async function GET(request: NextRequest) {
  const advisorId = await getAdvisorId(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = await createClient();
  const { data: disputes } = await supabase
    .from("lead_disputes")
    .select("*, professional_leads(user_name, user_email, created_at)")
    .eq("professional_id", advisorId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ disputes: disputes || [] });
}
