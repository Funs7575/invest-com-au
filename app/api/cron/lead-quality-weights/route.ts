import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";

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
export async function GET(req: NextRequest) {
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

  const totalLeads = leads.length;
  const totalConverted = leads.filter((l) => l.converted_at !== null).length;
  const baselineHitRate = totalConverted / totalLeads;

  // Signals to evaluate — must match the keys set in /api/advisor-enquiry
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

  // Determine the next model version (monotonic)
  const { data: lastWeight } = await supabase
    .from("lead_quality_weights")
    .select("model_version")
    .order("model_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = ((lastWeight?.model_version as number) || 0) + 1;

  const weightRows: Array<{
    signal_name: string;
    weight: number;
    sample_size: number;
    hit_rate: number;
    computed_at: string;
    model_version: number;
  }> = [];

  const nowIso = new Date().toISOString();

  for (const signal of signalNames) {
    const withSignal = leads.filter((l) => {
      const signals = l.quality_signals as Record<string, unknown> | null;
      return signals && signal in signals && signals[signal];
    });
    const sampleSize = withSignal.length;
    if (sampleSize < 20) {
      // Too few to trust a weight — skip rather than overfit
      continue;
    }
    const convertedWithSignal = withSignal.filter((l) => l.converted_at !== null).length;
    const hitRate = convertedWithSignal / sampleSize;

    // Weight = hit rate lift over baseline, scaled to the live scorer range
    const lift = baselineHitRate > 0 ? hitRate / baselineHitRate : 1;
    // Clamp to 0-50 (the maximum contribution of a single signal)
    const weight = Math.min(50, Math.max(0, Math.round(lift * 20)));

    weightRows.push({
      signal_name: signal,
      weight,
      sample_size: sampleSize,
      hit_rate: Math.round(hitRate * 10000) / 10000,
      computed_at: nowIso,
      model_version: nextVersion,
    });
  }

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
