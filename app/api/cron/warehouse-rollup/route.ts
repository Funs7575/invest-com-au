import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";

const log = logger("cron:warehouse-rollup");

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Daily warehouse rollup.
 *
 * Materialises exec-level business metrics into
 * `warehouse_daily_facts` so the BI dashboard doesn't have to
 * join + aggregate raw tables every page load.
 *
 * Metrics computed per day:
 *   - advisors_signed_up
 *   - advisors_active
 *   - quiz_leads_captured
 *   - advisor_enquiries
 *   - broker_affiliate_clicks
 *   - newsletter_signups
 *   - nps_responses
 *   - nps_avg_score
 *   - disputes_opened
 *   - disputes_auto_refunded
 *   - total_refunded_cents
 *
 * The cron is idempotent — it upserts on (day, metric, dim1, dim2)
 * so re-running overwrites instead of duplicating.
 *
 * Processes the last 3 days on every run to catch late-arriving
 * data (e.g. late webhook events).
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const stats = { days: 0, metrics_written: 0, failed: 0 };

  const today = new Date();
  const days: string[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(today);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  for (const day of days) {
    stats.days++;
    try {
      await computeDayMetrics(supabase, day, stats);
    } catch (err) {
      stats.failed++;
      log.error("warehouse rollup per-day failure", {
        day,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("warehouse rollup completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function computeDayMetrics(
  supabase: AdminClient,
  day: string,
  stats: { metrics_written: number },
): Promise<void> {
  const start = `${day}T00:00:00Z`;
  const end = new Date(new Date(start).getTime() + 24 * 60 * 60 * 1000).toISOString();
  const computedAt = new Date().toISOString();

  const rows: Array<{
    day: string;
    metric_name: string;
    metric_value: number;
    dimension_1?: string | null;
    dimension_2?: string | null;
    computed_at: string;
  }> = [];

  // advisors_signed_up
  {
    const { count } = await supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start)
      .lt("created_at", end);
    rows.push({
      day,
      metric_name: "advisors_signed_up",
      metric_value: count || 0,
      computed_at: computedAt,
    });
  }
  // advisors_active (snapshot — every day gets today's count)
  {
    const { count } = await supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    rows.push({
      day,
      metric_name: "advisors_active_snapshot",
      metric_value: count || 0,
      computed_at: computedAt,
    });
  }

  // quiz_leads_captured
  {
    const { count } = await supabase
      .from("quiz_leads")
      .select("id", { count: "exact", head: true })
      .gte("captured_at", start)
      .lt("captured_at", end);
    rows.push({
      day,
      metric_name: "quiz_leads_captured",
      metric_value: count || 0,
      computed_at: computedAt,
    });
  }

  // advisor_enquiries (via professional_leads)
  {
    const { count } = await supabase
      .from("professional_leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start)
      .lt("created_at", end);
    rows.push({
      day,
      metric_name: "advisor_enquiries",
      metric_value: count || 0,
      computed_at: computedAt,
    });
  }

  // broker_affiliate_clicks
  {
    const { count } = await supabase
      .from("affiliate_clicks")
      .select("id", { count: "exact", head: true })
      .gte("clicked_at", start)
      .lt("clicked_at", end);
    rows.push({
      day,
      metric_name: "broker_affiliate_clicks",
      metric_value: count || 0,
      computed_at: computedAt,
    });
  }

  // newsletter_signups
  {
    const { count } = await supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .gte("subscribed_at", start)
      .lt("subscribed_at", end);
    rows.push({
      day,
      metric_name: "newsletter_signups",
      metric_value: count || 0,
      computed_at: computedAt,
    });
  }

  // nps_responses + nps_avg
  {
    const { data } = await supabase
      .from("nps_responses")
      .select("score")
      .gte("created_at", start)
      .lt("created_at", end);
    const scores = (data || []).map((r) => Number(r.score)).filter(Number.isFinite);
    rows.push({
      day,
      metric_name: "nps_responses",
      metric_value: scores.length,
      computed_at: computedAt,
    });
    if (scores.length > 0) {
      rows.push({
        day,
        metric_name: "nps_avg_score",
        metric_value: scores.reduce((a, b) => a + b, 0) / scores.length,
        computed_at: computedAt,
      });
    }
  }

  // disputes_opened + disputes_auto_refunded + total_refunded_cents
  {
    const { data } = await supabase
      .from("lead_disputes")
      .select("auto_resolved_verdict, refunded_cents")
      .gte("created_at", start)
      .lt("created_at", end);
    const disputes = data || [];
    rows.push({
      day,
      metric_name: "disputes_opened",
      metric_value: disputes.length,
      computed_at: computedAt,
    });
    rows.push({
      day,
      metric_name: "disputes_auto_refunded",
      metric_value: disputes.filter((d) => d.auto_resolved_verdict === "refund").length,
      computed_at: computedAt,
    });
    rows.push({
      day,
      metric_name: "total_refunded_cents",
      metric_value: disputes.reduce(
        (s, d) => s + ((d.refunded_cents as number | null) || 0),
        0,
      ),
      computed_at: computedAt,
    });
  }

  // Upsert all rows for the day
  const { error } = await supabase
    .from("warehouse_daily_facts")
    .upsert(rows, { onConflict: "day,metric_name,dimension_1,dimension_2" });
  if (error) throw new Error(error.message);
  stats.metrics_written += rows.length;
}

export const GET = wrapCronHandler("warehouse-rollup", handler);
