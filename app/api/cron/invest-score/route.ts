/**
 * GET /api/cron/invest-score
 *
 * Daily cron: compute The Invest Score and upsert it for today.
 *
 * The score is a 0–100 composite of four observable signals in our
 * database. It is framed as factual market-data — NOT a buy/sell signal
 * or personal financial advice.
 *
 * Cron group: daily-6 (runs alongside the savings-rate refresh so the
 * score always uses the freshest rate data).
 */
import { NextRequest, NextResponse } from "next/server";
 
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { computeInvestScore } from "@/lib/invest-score";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 30;

const log = logger("cron:invest-score");

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authResult = requireCronAuth(req);
  if (authResult) return authResult;

  return withCronRunLog<NextResponse>("invest-score", async () => {
    const supabase = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    // ── Signal 1: Average savings rate from most recent snapshot batch ──────
    const { data: latestBatch } = await supabase
      .from("savings_rate_snapshots")
      .select("rate_bps, captured_at")
      .order("captured_at", { ascending: false })
      .limit(1);

    const latestCapturedAt = latestBatch?.[0]?.captured_at ?? null;
    let avgSavingsRateBps: number | null = null;

    if (latestCapturedAt) {
      const { data: batchRates } = await supabase
        .from("savings_rate_snapshots")
        .select("rate_bps")
        .eq("captured_at", latestCapturedAt)
        .not("rate_bps", "is", null);

      if (batchRates && batchRates.length > 0) {
        const total = batchRates.reduce((sum, r) => sum + (r.rate_bps ?? 0), 0);
        avgSavingsRateBps = Math.round(total / batchRates.length);
      }
    }

    // ── Signal 2: Net rate change over last 30 days ─────────────────────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: rateChanges } = await supabase
      .from("rate_change_log")
      .select("change_bps")
      .gte("snapshot_captured_at", thirtyDaysAgo);

    const netRateChangeBps30d =
      rateChanges && rateChanges.length > 0
        ? rateChanges.reduce((sum, r) => sum + (r.change_bps ?? 0), 0)
        : null;

    // ── Signal 3: Advisor enquiry volume — last 7 days vs days 8–30 ─────────
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data: recent7d } = await supabase
      .from("advisor_metrics_daily")
      .select("enquiry_count")
      .gte("date", sevenDaysAgo);

    const { data: prior23d } = await supabase
      .from("advisor_metrics_daily")
      .select("enquiry_count")
      .gte("date", thirtyDaysAgo)
      .lt("date", sevenDaysAgo);

    const enquiriesLast7d = (recent7d ?? []).reduce((s, r) => s + (r.enquiry_count ?? 0), 0);
    const enquiriesDays8to30 = (prior23d ?? []).reduce((s, r) => s + (r.enquiry_count ?? 0), 0);

    // ── Signal 4: Active broker count ───────────────────────────────────────
    const { count: activeBrokerCount } = await supabase
      .from("brokers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    // ── Compute ─────────────────────────────────────────────────────────────
    const result = computeInvestScore({
      avgSavingsRateBps,
      netRateChangeBps30d,
      enquiriesLast7d,
      enquiriesDays8to30,
      activeBrokerCount: activeBrokerCount ?? 0,
    });

    log.info("invest-score computed", { date: today, ...result });

    // ── Upsert ──────────────────────────────────────────────────────────────
    const { error } = await supabase
      .from("invest_score_daily")
      .upsert(
        {
          date: today,
          score: result.score,
          label: result.label,
          components: result.components,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "date" },
      );

    if (error) {
      log.warn("invest-score upsert failed", { error });
      return {
        response: NextResponse.json({ ok: false, error: error.message }, { status: 500 }),
        stats: { score: result.score, label: result.label },
      };
    }

    return {
      response: NextResponse.json({
        ok: true,
        date: today,
        score: result.score,
        label: result.label,
        components: result.components,
      }),
      stats: { score: result.score, label: result.label },
    };
  });
}
