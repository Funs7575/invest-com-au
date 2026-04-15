import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("cron-revenue-reconciliation");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron: Revenue reconciliation.
 *
 * Runs daily at 04:00 AEST. For each revenue source:
 *   1. Aggregate yesterday's expected revenue from the source of
 *      truth (affiliate_clicks → conversion value; stripe_payouts
 *      → payout amounts).
 *   2. Aggregate the reported revenue from financial_audit_log.
 *   3. Compute variance. If |variance_pct| > 5% or absolute
 *      variance > $50, flag an alert (stamped alerted=true,
 *      alert_sent_to=ops email) and log.warn.
 *   4. Upsert a row into revenue_reconciliation_runs so the audit
 *      trail persists.
 *
 * The cron is deliberately tolerant of missing source data — a
 * missing affiliate_clicks row just logs expected_cents=0 rather
 * than crashing, so reconciliation still runs in early-stage
 * partners who haven't turned on conversion tracking yet.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000);
  const runDate = yesterday.toISOString().slice(0, 10);
  const dayStart = `${runDate}T00:00:00Z`;
  const dayEnd = `${runDate}T23:59:59Z`;

  const results: Array<{
    source: string;
    expected_cents: number;
    reported_cents: number;
    variance_cents: number;
    variance_pct: number;
    alerted: boolean;
  }> = [];

  // ── Source 1: affiliate clicks → expected conversion revenue ──
  let affiliateExpected = 0;
  try {
    const { data: clicks } = await supabase
      .from("affiliate_clicks")
      .select("estimated_value_cents")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);
    affiliateExpected = ((clicks as { estimated_value_cents: number | null }[] | null) || [])
      .reduce((sum, c) => sum + (c.estimated_value_cents || 0), 0);
  } catch (err) {
    log.warn("affiliate_clicks query failed", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  // Reported revenue from financial_audit_log for that day
  let affiliateReported = 0;
  try {
    const { data: audits } = await supabase
      .from("financial_audit_log")
      .select("amount_cents, resource_type")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd)
      .eq("action", "credit");
    affiliateReported = ((audits as { amount_cents: number | null; resource_type: string }[] | null) || [])
      .filter((a) => /affiliate|broker/.test(a.resource_type))
      .reduce((sum, a) => sum + (a.amount_cents || 0), 0);
  } catch (err) {
    log.warn("financial_audit_log query failed", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  const affiliateVariance = affiliateReported - affiliateExpected;
  const affiliateVariancePct =
    affiliateExpected > 0
      ? Math.round((affiliateVariance / affiliateExpected) * 1000) / 10
      : 0;
  const affiliateAlert =
    Math.abs(affiliateVariancePct) > 5 || Math.abs(affiliateVariance) > 5000;

  await supabase.from("revenue_reconciliation_runs").upsert(
    {
      run_date: runDate,
      source: "affiliate_clicks",
      expected_cents: affiliateExpected,
      reported_cents: affiliateReported,
      variance_cents: affiliateVariance,
      variance_pct: affiliateVariancePct,
      alerted: affiliateAlert,
      alert_sent_to: affiliateAlert ? "ops@invest.com.au" : null,
    },
    { onConflict: "run_date,source" },
  );
  results.push({
    source: "affiliate_clicks",
    expected_cents: affiliateExpected,
    reported_cents: affiliateReported,
    variance_cents: affiliateVariance,
    variance_pct: affiliateVariancePct,
    alerted: affiliateAlert,
  });
  if (affiliateAlert) {
    log.warn("affiliate revenue variance breach", {
      runDate,
      affiliateExpected,
      affiliateReported,
      affiliateVariance,
      affiliateVariancePct,
    });
  }

  // ── Source 2: Stripe payouts → reported subscription revenue ──
  // Same shape. We only compute if stripe_payouts table exists + has rows.
  let stripeExpected = 0;
  let stripeReported = 0;
  try {
    const { data: payouts } = await supabase
      .from("stripe_payouts")
      .select("amount_cents")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);
    stripeExpected = ((payouts as { amount_cents: number | null }[] | null) || [])
      .reduce((sum, p) => sum + (p.amount_cents || 0), 0);

    const { data: audits } = await supabase
      .from("financial_audit_log")
      .select("amount_cents, resource_type")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd)
      .eq("action", "credit");
    stripeReported = ((audits as { amount_cents: number | null; resource_type: string }[] | null) || [])
      .filter((a) => /subscription|stripe/.test(a.resource_type))
      .reduce((sum, a) => sum + (a.amount_cents || 0), 0);
  } catch {
    /* stripe_payouts may not exist — leave zero */
  }

  if (stripeExpected > 0 || stripeReported > 0) {
    const variance = stripeReported - stripeExpected;
    const variancePct =
      stripeExpected > 0
        ? Math.round((variance / stripeExpected) * 1000) / 10
        : 0;
    const alert = Math.abs(variancePct) > 5 || Math.abs(variance) > 5000;

    await supabase.from("revenue_reconciliation_runs").upsert(
      {
        run_date: runDate,
        source: "stripe_payouts",
        expected_cents: stripeExpected,
        reported_cents: stripeReported,
        variance_cents: variance,
        variance_pct: variancePct,
        alerted: alert,
        alert_sent_to: alert ? "ops@invest.com.au" : null,
      },
      { onConflict: "run_date,source" },
    );
    results.push({
      source: "stripe_payouts",
      expected_cents: stripeExpected,
      reported_cents: stripeReported,
      variance_cents: variance,
      variance_pct: variancePct,
      alerted: alert,
    });
    if (alert) {
      log.warn("stripe revenue variance breach", {
        runDate,
        stripeExpected,
        stripeReported,
        variance,
        variancePct,
      });
    }
  }

  return NextResponse.json({ ok: true, run_date: runDate, results });
}

export const GET = wrapCronHandler("revenue-reconciliation", handler);
