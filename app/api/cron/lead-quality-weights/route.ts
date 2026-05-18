import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { computeQualityWeights } from "@/lib/lead-quality-weights";

const log = logger("cron:lead-quality-weights");

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Nightly cron that recomputes lead quality signal weights based on
 * observed conversion outcomes over the last 90 days.
 *
 * Current state: `quality_score` is rule-based with fixed weights
 * hardcoded in /api/advisor-enquiry. This cron learns which signals
 * actually predict conversion (`converted_at` set) and writes the
 * new weights to `lead_quality_weights` keyed on model_version.
 *
 * The live scorer can read the latest model_version to use the
 * updated weights — but for v1 this cron just LOGS the weights
 * it would apply, so you can review before flipping the live
 * scorer to read from the table. Zero risk of a bad model update
 * tanking your lead pricing overnight.
 *
 * Signals tracked:
 *   - has_phone
 *   - has_message
 *   - specific_page
 *   - utm_source
 *   - pages_visited
 *   - quiz_completed
 *   - calculator_used
 *   - qualification_data_present
 *
 * For each signal we compute:
 *   - Sample size (how many leads had this signal in the window)
 *   - Hit rate (what % of those leads converted)
 *   - Weight (hit rate relative to the baseline conversion rate)
 *
 * Weight formula: signal_weight = hit_rate / baseline_hit_rate * 30
 * — clamped to the 0–100 range used by the live scorer.
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Pull every lead from the last 90 days with its signals + outcome
  const { data: leads, error } = await supabase
    .from("professional_leads")
    .select("id, quality_signals, converted_at")
    .gte("created_at", ninetyDaysAgo)
    .limit(20_000);

  if (error) {
    log.error("Failed to fetch leads", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  if (!leads || leads.length < 100) {
    log.info("Not enough leads to compute weights", { count: leads?.length });
    return NextResponse.json({ ok: true, insufficient_sample: true, count: leads?.length || 0 });
  }

  // Signal names must match the keys set in /api/advisor-enquiry's
  // quality_signals jsonb write.
  const signalNames = [
    "has_phone",
    "has_message",
    "specific_page",
    "utm",
    "pages_visited",
    "quiz_completed",
    "calculator_used",
    "qualification",
  ];

  // Pure-math layer lives in lib/lead-quality-weights.ts — tested
  // independently in __tests__/lib/lead-quality-weights.test.ts.
  const computed = computeQualityWeights(
    leads.map((l) => ({
      quality_signals: l.quality_signals as Record<string, unknown> | null,
      converted_at: l.converted_at as string | null,
    })),
    signalNames,
  );
  const { totalLeads, baselineHitRate, rows } = computed;

  // Determine the next model version (monotonic)
  const { data: lastWeight } = await supabase
    .from("lead_quality_weights")
    .select("model_version")
    .order("model_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = ((lastWeight?.model_version as number) || 0) + 1;

  const nowIso = new Date().toISOString();
  const weightRows = rows.map((r) => ({
    ...r,
    computed_at: nowIso,
    model_version: nextVersion,
  }));

  if (weightRows.length === 0) {
    log.info("No signals had enough sample size", { totalLeads });
    return NextResponse.json({ ok: true, no_signals: true });
  }

  const { error: insertErr } = await supabase
    .from("lead_quality_weights")
    .insert(weightRows);

  if (insertErr) {
    log.error("Failed to insert weights", { error: insertErr.message });
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }

  log.info("Lead quality weights recomputed", {
    model_version: nextVersion,
    signal_count: weightRows.length,
    total_leads: totalLeads,
    baseline_conversion: Math.round(baselineHitRate * 10000) / 10000,
  });

  return NextResponse.json({
    ok: true,
    model_version: nextVersion,
    signals_computed: weightRows.length,
    total_leads: totalLeads,
    baseline_conversion: baselineHitRate,
    weights: weightRows,
  });
}

export const GET = wrapCronHandler("lead-quality-weights", handler);
