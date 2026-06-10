/**
 * lib/marketplace/quality-score.ts
 *
 * Quality multiplier for the hybrid marketplace auction.
 *
 * The 2026-04-30 revenue-strategy decision (FIN_NOTEBOOK) approved a hybrid
 * auction: editorial filter + bid + QUALITY MULTIPLIER. The editorial filter
 * (admin campaign review → pending_review/approved) and the bid ranking
 * (allocation.ts) shipped; this module is the third leg.
 *
 * Why quality affects RANK but never PRICE:
 *   - Billing stays at the campaign's stated rate_cents (recordCpcClick reads
 *     the DB rate). Quality only re-orders candidates, the standard ad-rank
 *     model. This avoids any billing-path change and keeps invoices exactly
 *     equal to what the broker agreed to pay.
 *   - RG 246 posture: low-quality products can't simply outbid their way to
 *     the top (adverse-selection guard), and the multiplier is symmetric and
 *     mechanical (CTR/CR relative to the cohort) — no editorial thumb on the
 *     scale beyond the existing review gate.
 *
 * Cold-start fairness: campaigns without enough data get a neutral 1.0 —
 * new brokers are never penalised for having no history.
 *
 * Pure functions, no I/O. The allocation engine feeds 30-day
 * campaign_daily_stats aggregates in and re-ranks on the way out.
 */

/** Minimum 30d impressions before CTR is considered statistically meaningful. */
export const MIN_IMPRESSIONS_FOR_CTR = 200;
/** Minimum 30d clicks before conversion rate is considered meaningful. */
export const MIN_CLICKS_FOR_CR = 20;
/** Multiplier bounds — a campaign can lose or gain at most 50% of its bid rank. */
export const QUALITY_MULTIPLIER_MIN = 0.5;
export const QUALITY_MULTIPLIER_MAX = 1.5;
/** Blend weights when both CTR and CR signals are available. */
export const CTR_WEIGHT = 0.6;
export const CR_WEIGHT = 0.4;

export interface CampaignQualityInputs {
  campaign_id: number;
  impressions_30d: number;
  clicks_30d: number;
  conversions_30d: number;
}

export interface CampaignQualityScore {
  campaign_id: number;
  /** Click-through rate over 30d, or null when below MIN_IMPRESSIONS_FOR_CTR. */
  ctr: number | null;
  /** Conversion rate over 30d, or null when below MIN_CLICKS_FOR_CR. */
  cr: number | null;
  /** Bounded multiplier applied to rate_cents for ranking. 1.0 = neutral. */
  multiplier: number;
  reason: "insufficient_data" | "scored";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Compute cohort-relative quality multipliers for a set of candidate
 * campaigns competing for the same placement.
 *
 * A campaign's CTR/CR is compared to the cohort average of the candidates
 * that have meaningful data — performing at the cohort average yields a
 * neutral 1.0, twice the average trends toward the max, half the average
 * toward the min. Campaigns without enough data are neutral.
 */
export function computeQualityScores(
  candidates: CampaignQualityInputs[],
): Map<number, CampaignQualityScore> {
  const scores = new Map<number, CampaignQualityScore>();

  // Pass 1 — per-campaign raw rates (null = insufficient data).
  const raw = candidates.map((c) => {
    const ctr =
      c.impressions_30d >= MIN_IMPRESSIONS_FOR_CTR
        ? c.clicks_30d / c.impressions_30d
        : null;
    const cr =
      c.clicks_30d >= MIN_CLICKS_FOR_CR ? c.conversions_30d / c.clicks_30d : null;
    return { campaign_id: c.campaign_id, ctr, cr };
  });

  // Pass 2 — cohort averages over campaigns that have the signal.
  const ctrValues = raw.filter((r) => r.ctr !== null).map((r) => r.ctr as number);
  const crValues = raw.filter((r) => r.cr !== null).map((r) => r.cr as number);
  const avgCtr =
    ctrValues.length > 0 ? ctrValues.reduce((a, b) => a + b, 0) / ctrValues.length : 0;
  const avgCr =
    crValues.length > 0 ? crValues.reduce((a, b) => a + b, 0) / crValues.length : 0;

  // Pass 3 — relative performance, blended and clamped.
  for (const r of raw) {
    if (r.ctr === null && r.cr === null) {
      scores.set(r.campaign_id, {
        campaign_id: r.campaign_id,
        ctr: null,
        cr: null,
        multiplier: 1.0,
        reason: "insufficient_data",
      });
      continue;
    }

    // Relative-to-cohort ratios. A zero cohort average (e.g. nobody has any
    // clicks yet) carries no ranking information — treat as neutral.
    const relCtr = r.ctr !== null && avgCtr > 0 ? r.ctr / avgCtr : null;
    const relCr = r.cr !== null && avgCr > 0 ? r.cr / avgCr : null;

    let blended: number;
    if (relCtr !== null && relCr !== null) {
      blended = CTR_WEIGHT * relCtr + CR_WEIGHT * relCr;
    } else if (relCtr !== null) {
      blended = relCtr;
    } else if (relCr !== null) {
      blended = relCr;
    } else {
      blended = 1.0;
    }

    scores.set(r.campaign_id, {
      campaign_id: r.campaign_id,
      ctr: r.ctr,
      cr: r.cr,
      multiplier: clamp(blended, QUALITY_MULTIPLIER_MIN, QUALITY_MULTIPLIER_MAX),
      reason: "scored",
    });
  }

  return scores;
}

/**
 * Effective rank rate: the campaign's stated rate weighted by quality.
 * Used ONLY for ordering — billing always uses the stated rate_cents.
 */
export function effectiveRateCents(rateCents: number, multiplier: number): number {
  return Math.round(rateCents * multiplier);
}
