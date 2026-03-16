import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { sendNewLeadNotification } from "@/lib/advisor-emails";
import { logger } from "@/lib/logger";

export const runtime = "edge";

const log = logger("confirm-lead");

/**
 * POST /api/submit-lead/confirm
 *
 * Called when the user clicks "Confirm my interest" on the match result screen.
 * Marks the lead as advisor-notified and sends the advisor their notification email.
 *
 * Body: { lead_id: number, user_email: string }
 */
export async function POST(request: NextRequest) {
  let body: { lead_id?: number; user_email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { lead_id, user_email } = body;
  if (!lead_id || !user_email) {
    return NextResponse.json({ error: "lead_id and user_email required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const normalizedEmail = user_email.toLowerCase().trim();

  // Look up the lead — validate ownership by email
  const { data: lead } = await supabase
    .from("leads")
    .select("id, professional_id, user_name, user_phone, user_location_state, user_intent, advisor_notified_at")
    .eq("id", lead_id)
    .eq("user_email", normalizedEmail)
    .eq("lead_type", "advisor")
    .maybeSingle();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Already notified — idempotent OK
  if (lead.advisor_notified_at) {
    return NextResponse.json({ success: true, already_notified: true });
  }

  // Fetch matched advisor details
  if (!lead.professional_id) {
    return NextResponse.json({ error: "No advisor matched to this lead" }, { status: 400 });
  }

  const { data: advisor } = await supabase
    .from("professionals")
    .select("id, name, email, type, firm_name")
    .eq("id", lead.professional_id)
    .maybeSingle();

  if (!advisor || !advisor.email) {
    return NextResponse.json({ error: "Advisor not found or has no email" }, { status: 404 });
  }

  // Mark notified
  await supabase
    .from("leads")
    .update({ advisor_notified_at: new Date().toISOString() })
    .eq("id", lead_id);

  // Send advisor notification
  const intent = lead.user_intent as { need?: string; context?: string[] } | null;
  const need = intent?.need || "planning";
  const context = intent?.context || [];

  await sendNewLeadNotification(
    advisor.email as string,
    advisor.name as string,
    lead.user_name || "A potential client",
    normalizedEmail,
    lead.user_phone || null,
    lead.user_location_state || null,
    need,
    context,
  );

  log.info("Lead confirmed — advisor notified", { lead_id, advisor_id: advisor.id });

  return NextResponse.json({ success: true });
}
