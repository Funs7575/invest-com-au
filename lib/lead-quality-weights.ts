// Pure math for the lead-quality-weights cron. Extracted from
// app/api/cron/lead-quality-weights/route.ts so the rebalancing logic
// has unit tests independent of the DB + cron auth path.
//
// FIN_NOTEBOOK Revenue infra reliability — a bad weights run silently
// miscalibrates the live scorer = worse advisor ROI = churn. Worth
// testing every guard rail.

export interface LeadSignals {
  // The columns the cron pulls from professional_leads.
  // `quality_signals` is a jsonb column whose keys are the canonical
  // signal names listed in the cron.
  quality_signals: Record<string, unknown> | null;
  converted_at: string | null;
}

export interface WeightRow {
  signal_name: string;
  weight: number;
  sample_size: number;
  hit_rate: number;
}

export interface ComputeOptions {
  /** Skip a signal whose sample is below this size (per-signal n).
   *  Default 20 — too few to trust the lift without overfitting. */
  minSampleSize?: number;
  /** Max contribution any single signal can make to the score.
   *  Default 50 — matches the live scorer's per-signal cap. */
  maxWeight?: number;
  /** Scale factor on (hit_rate / baseline). Default 20 — chosen so a
   *  signal at the baseline gets weight ≈ 20 (mid-range). */
  liftScale?: number;
}

export interface ComputedWeights {
  baselineHitRate: number;
  rows: WeightRow[];
  totalLeads: number;
  totalConverted: number;
}

/**
 * Compute lead-quality signal weights from a window of leads.
 *
 * Algorithm:
 *   1. baselineHitRate = converted / totalLeads
 *   2. For each named signal:
 *      a. Filter leads where signals[signal] is truthy.
 *      b. If sample < minSampleSize, skip (no row emitted).
 *      c. hit_rate = converted_with_signal / sample
 *      d. lift = hit_rate / baselineHitRate (1 when baseline is 0)
 *      e. weight = clamp(round(lift * liftScale), 0, maxWeight)
 *
 * Returns rows for every signal that cleared the sample-size gate.
 * Signals never seen in the data return no row.
 */
export function computeQualityWeights(
  leads: ReadonlyArray<LeadSignals>,
  signalNames: ReadonlyArray<string>,
  options: ComputeOptions = {},
): ComputedWeights {
  const minSampleSize = options.minSampleSize ?? 20;
  const maxWeight = options.maxWeight ?? 50;
  const liftScale = options.liftScale ?? 20;

  const totalLeads = leads.length;
  const totalConverted = leads.filter((l) => l.converted_at !== null).length;
  const baselineHitRate = totalLeads > 0 ? totalConverted / totalLeads : 0;

  const rows: WeightRow[] = [];

  for (const signal of signalNames) {
    const withSignal = leads.filter((l) => {
      const s = l.quality_signals;
      return s != null && signal in s && Boolean(s[signal]);
    });
    const sampleSize = withSignal.length;
    if (sampleSize < minSampleSize) continue;

    const convertedWithSignal = withSignal.filter((l) => l.converted_at !== null).length;
    const hitRate = convertedWithSignal / sampleSize;

    const lift = baselineHitRate > 0 ? hitRate / baselineHitRate : 1;
    const weight = Math.min(maxWeight, Math.max(0, Math.round(lift * liftScale)));

    rows.push({
      signal_name: signal,
      weight,
      sample_size: sampleSize,
      hit_rate: Math.round(hitRate * 10000) / 10000,
    });
  }

  return { baselineHitRate, rows, totalLeads, totalConverted };
}
