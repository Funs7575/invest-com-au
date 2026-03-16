import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { sendNewLeadNotification } from "@/lib/advisor-emails";
import { logger } from "@/lib/logger";

export const runtime = "edge";
export const maxDuration = 60;

const log = logger("cron-confirm-lead-notify");

/**
 * Cron: Auto-notify advisors for unconfirmed leads after 15 minutes.
 *
 * Runs every 10 minutes. Finds advisor leads where:
 * - advisor_notified_at IS NULL (not yet notified)
 * - created_at <= 15 minutes ago (hold window elapsed)
 * - professional_id IS NOT NULL (has a matched advisor)
 *
 * Sends the advisor notification and marks advisor_notified_at.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  // Find unnotified advisor leads older than 15 minutes
  const { data: leads } = await supabase
    .from("leads")
    .select("id, professional_id, user_name, user_email, user_phone, user_location_state, user_intent")
    .eq("lead_type", "advisor")
    .is("advisor_notified_at", null)
    .not("professional_id", "is", null)
    .lte("created_at", fifteenMinutesAgo)
    .limit(50);

  if (!leads || leads.length === 0) {
    return NextResponse.json({ notified: 0, timestamp: new Date().toISOString() });
  }

  const advisorIds = [...new Set(leads.map((l) => l.professional_id as number))];

  // Fetch all advisors in one query
  const { data: advisors } = await supabase
    .from("professionals")
    .select("id, name, email, type")
    .in("id", advisorIds);

  const advisorMap = new Map((advisors || []).map((a) => [a.id as number, a]));

  let notified = 0;
  const errors: { lead_id: number; error: string }[] = [];

  for (const lead of leads) {
    const advisor = advisorMap.get(lead.professional_id as number);
    if (!advisor || !advisor.email) {
      errors.push({ lead_id: lead.id, error: "Advisor not found or no email" });
      continue;
    }

    const intent = lead.user_intent as { need?: string; context?: string[] } | null;
    const need = intent?.need || "planning";
    const context = intent?.context || [];

    try {
      await sendNewLeadNotification(
        advisor.email as string,
        advisor.name as string,
        lead.user_name || "A potential client",
        lead.user_email,
        lead.user_phone || null,
        lead.user_location_state || null,
        need,
        context,
      );

      await supabase
        .from("leads")
        .update({ advisor_notified_at: new Date().toISOString() })
        .eq("id", lead.id);

      notified++;
    } catch (err) {
      log.error("Failed to notify advisor for lead", { lead_id: lead.id, error: String(err) });
      errors.push({ lead_id: lead.id, error: String(err) });
    }
  }

  log.info("Auto-notify cron complete", { notified, errors: errors.length });

  return NextResponse.json({
    notified,
    errors: errors.length,
    timestamp: new Date().toISOString(),
  });
}
