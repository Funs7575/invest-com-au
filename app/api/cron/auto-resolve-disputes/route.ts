import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { autoResolveDispute } from "@/lib/advisor-lead-dispute-resolver";

const log = logger("cron:auto-resolve-disputes");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Hourly backfill cron for advisor lead disputes.
 *
 * The submission POST (/api/advisor-auth/disputes) runs the classifier
 * inline, so 99% of disputes get resolved immediately. This cron is the
 * belt to that suspenders — it sweeps any disputes still in `pending`
 * state (e.g. because the classifier threw, or was introduced after
 * the dispute was created, or because an admin manually unresolved a
 * dispute and wants it re-classified).
 *
 * Runs every hour. Idempotent — autoResolveDispute() short-circuits
 * on disputes that are already in a terminal state.
 *
 * Budget: process up to 200 disputes per run. The inline path handles
 * steady-state load, so 200/hour is 4,800/day which is more than
 * enough headroom for even a rapid backlog.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();

  // Fetch the oldest pending disputes first so we clear any backlog
  // chronologically. `status = 'pending'` is the only condition — we
  // deliberately re-run the classifier on rows that have an existing
  // auto_resolved_verdict='escalate' stamp so an admin who unpicks an
  // escalation and flips it back to pending gets a re-classification.
  const { data: pending, error } = await supabase
    .from("lead_disputes")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    log.error("Failed to fetch pending disputes", { error: error.message });
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const stats = {
    scanned: pending?.length || 0,
    refunded: 0,
    rejected: 0,
    escalated: 0,
    failed: 0,
  };

  for (const row of pending || []) {
    try {
      const result = await autoResolveDispute(row.id);
      if (result.verdict === "refund") stats.refunded++;
      else if (result.verdict === "reject") stats.rejected++;
      else stats.escalated++;
    } catch (err) {
      stats.failed++;
      log.error("Auto-resolve threw", {
        disputeId: row.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (stats.scanned > 0) {
    log.info("Backfill cron completed", stats);
  }

  return NextResponse.json({ ok: true, ...stats });
}
