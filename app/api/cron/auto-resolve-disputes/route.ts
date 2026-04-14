import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { autoResolveDispute } from "@/lib/advisor-lead-dispute-resolver";

const log = logger("cron:auto-resolve-disputes");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Hourly backfill cron for advisor lead disputes.
 *
 * The submission POST runs the classifier inline for the common
 * case; this cron is the belt to that suspenders, sweeping anything
 * stuck in `pending` status. Wrapped with withCronRunLog so the
 * admin automation dashboard can show "last run" + stats.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const triggeredBy: "cron" | "admin_manual" = req.headers.get("x-admin-manual")
    ? "admin_manual"
    : "cron";

  return withCronRunLog(
    "auto-resolve-disputes",
    async () => {
      const stats = {
        scanned: 0,
        refunded: 0,
        rejected: 0,
        escalated: 0,
        failed: 0,
      };

      const supabase = createAdminClient();
      const { data: pending, error } = await supabase
        .from("lead_disputes")
        .select("id")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) {
        log.error("Failed to fetch pending disputes", { error: error.message });
        throw new Error("fetch_failed: " + error.message);
      }

      stats.scanned = pending?.length || 0;

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

      if (stats.scanned > 0) log.info("Backfill cron completed", stats);

      return {
        response: NextResponse.json({ ok: true, ...stats }),
        stats,
      };
    },
    { triggeredBy },
  );
}
