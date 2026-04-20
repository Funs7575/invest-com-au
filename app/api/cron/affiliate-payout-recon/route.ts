import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

const log = logger("cron:affiliate-payout-recon");

export const maxDuration = 60;

/**
 * Affiliate payout reconciliation cron.
 *
 * Runs monthly (via the monthly-1-X dispatcher). Walks every
 * affiliate_payout_reports row that does NOT yet have a matching
 * affiliate_payout_variance row, computes actual tracked clicks from
 * affiliate_clicks for the same (broker_slug, period_start..period_end),
 * and writes a variance row. Flags any variance >=10% for editor
 * review on /admin/affiliate-dashboard.
 *
 * Flagging thresholds:
 *   tracked > reported + 10%  → we tracked more than we got paid for
 *                               (potential missing commission)
 *   reported > tracked + 10%  → they report more than we tracked
 *                               (possible UTM loss, or legit — still log)
 */

const FLAG_THRESHOLD_PCT = 10;

/**
 * Pure variance calculation — exported so it can be unit-tested
 * without supabase mocks. Returns the integer click delta, the
 * percentage delta (2dp rounded by the caller), and whether the
 * variance exceeds the configured flag threshold.
 *
 * Percentage convention:
 *   - reported > 0: (tracked - reported) / reported * 100
 *   - reported == 0 && tracked > 0: 100 (every tracked click is variance)
 *   - both zero: 0 (nothing to reconcile)
 *
 * The Math.abs comparison makes the threshold symmetric — we flag
 * equally when we tracked MORE than reported (missing commission) and
 * when we tracked LESS (UTM loss / affiliate-network overcount).
 */
export function calculatePayoutVariance(
  tracked: number,
  reported: number,
): { delta: number; deltaPct: number; shouldFlag: boolean } {
  const delta = tracked - reported;
  const deltaPct =
    reported > 0 ? (delta / reported) * 100 : tracked > 0 ? 100 : 0;
  const shouldFlag = Math.abs(deltaPct) >= FLAG_THRESHOLD_PCT;
  return { delta, deltaPct, shouldFlag };
}

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();

  // Find unreconciled reports
  const { data: reports } = await supabase
    .from("affiliate_payout_reports")
    .select("id, broker_slug, period_start, period_end, reported_clicks, reported_revenue_cents")
    .order("uploaded_at", { ascending: false })
    .limit(200);

  if (!reports || reports.length === 0) {
    return NextResponse.json({ ok: true, reconciled: 0 });
  }

  const existingVarianceIds = new Set<number>();
  {
    const { data: existing } = await supabase
      .from("affiliate_payout_variance")
      .select("report_id");
    for (const row of existing ?? []) {
      if (row.report_id) existingVarianceIds.add(row.report_id as number);
    }
  }

  const todo = reports.filter((r) => !existingVarianceIds.has(r.id));
  if (todo.length === 0) {
    return NextResponse.json({ ok: true, reconciled: 0, skipped: reports.length });
  }

  let reconciled = 0;
  let flagged = 0;

  for (const r of todo) {
    const { count: trackedClicks } = await supabase
      .from("affiliate_clicks")
      .select("*", { count: "exact", head: true })
      .eq("broker_slug", r.broker_slug)
      .gte("clicked_at", r.period_start)
      .lte("clicked_at", r.period_end);

    const tracked = trackedClicks ?? 0;
    const reported = r.reported_clicks;
    const { delta, deltaPct, shouldFlag } = calculatePayoutVariance(
      tracked,
      reported,
    );

    const { error } = await supabase.from("affiliate_payout_variance").insert({
      report_id: r.id,
      broker_slug: r.broker_slug,
      period_start: r.period_start,
      period_end: r.period_end,
      tracked_clicks: tracked,
      reported_clicks: reported,
      click_delta: delta,
      click_delta_pct: Number(deltaPct.toFixed(2)),
      revenue_cents: r.reported_revenue_cents,
      flagged: shouldFlag,
    });

    if (error) {
      log.error("variance_insert_failed", {
        broker: r.broker_slug,
        period: `${r.period_start}..${r.period_end}`,
        err: error.message,
      });
      continue;
    }

    reconciled++;
    if (shouldFlag) flagged++;
  }

  return NextResponse.json({ ok: true, reconciled, flagged });
}
