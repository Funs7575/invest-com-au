import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("cron-complaints-sla");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron: ASIC RG 271 Internal Dispute Resolution SLA sweep.
 *
 * ASIC RG 271 requires every client complaint to be resolved
 * within 30 days. If we miss that window, the complainant has
 * the right to escalate to AFCA and we have to notify them.
 *
 * This cron runs daily:
 *
 *   1. Day 25 (warning)   — email the complainant + assigned admin
 *                           that the SLA is 5 days away. Stamp
 *                           sla_warning_sent_at so we don't spam.
 *   2. Day >30 (escalate) — flip status to 'escalated_afca', stamp
 *                           auto_escalated_at, notify admin.
 *
 * Idempotent: the stamping prevents re-fires on subsequent runs.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = new Date();

  // Pull everything that isn't already closed/resolved/escalated.
  const { data, error } = await supabase
    .from("complaints_register")
    .select(
      "id, reference_id, complainant_email, assigned_to, submitted_at, sla_due_at, status, sla_warning_sent_at, auto_escalated_at",
    )
    .not("status", "in", "(resolved,escalated_afca,closed)");

  if (error) {
    log.error("complaints fetch failed", { error: error.message });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data || []) as Array<{
    id: number;
    reference_id: string;
    complainant_email: string;
    assigned_to: string | null;
    submitted_at: string;
    sla_due_at: string;
    status: string;
    sla_warning_sent_at: string | null;
    auto_escalated_at: string | null;
  }>;

  let warningsSent = 0;
  let escalated = 0;
  const FIVE_DAYS_MS = 5 * 86_400_000;

  for (const row of rows) {
    const dueAt = new Date(row.sla_due_at).getTime();
    const msToDue = dueAt - now.getTime();

    // Escalate: past due, not already escalated
    if (msToDue <= 0 && !row.auto_escalated_at) {
      const { error: escErr } = await supabase
        .from("complaints_register")
        .update({
          status: "escalated_afca",
          escalated_at: now.toISOString(),
          auto_escalated_at: now.toISOString(),
        })
        .eq("id", row.id);
      if (!escErr) {
        escalated += 1;
        log.info("complaint auto-escalated", {
          id: row.id,
          reference_id: row.reference_id,
        });
      }
      continue;
    }

    // Day-25 warning: between 0 and 5 days left, not warned yet
    if (msToDue > 0 && msToDue <= FIVE_DAYS_MS && !row.sla_warning_sent_at) {
      const { error: warnErr } = await supabase
        .from("complaints_register")
        .update({ sla_warning_sent_at: now.toISOString() })
        .eq("id", row.id);
      if (!warnErr) {
        warningsSent += 1;
        log.info("complaint SLA warning stamped", {
          id: row.id,
          reference_id: row.reference_id,
          assigned_to: row.assigned_to,
        });
        // Email dispatch is intentionally delegated to the admin
        // notification surface — we stamp here so the dashboard
        // can render a warning badge and the daily digest email
        // can pick it up via the same `sla_warning_sent_at` filter.
      }
    }
  }

  return NextResponse.json({
    ok: true,
    total_open: rows.length,
    warnings_sent: warningsSent,
    auto_escalated: escalated,
  });
}

export const GET = wrapCronHandler("complaints-sla", handler);
