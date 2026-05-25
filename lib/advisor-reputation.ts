/**
 * lib/advisor-reputation.ts
 *
 * Advisor Reputation Score — a public-facing, factual composite score
 * derived exclusively from review-volume and verification signals.
 *
 * PURPOSE: Give consumers a quick snapshot of the review-side of an advisor's
 *   reputation: how many reviews they have, what fraction are engagement-
 *   verified, and what their average star rating is.
 *
 * AFSL SAFETY NOTE: This score is FACTUAL ONLY.
 *   - It does NOT express an opinion on suitability, returns, or quality of
 *     advice for any particular consumer.
 *   - It does NOT recommend one advisor over another.
 *   - It does NOT constitute financial advice or personal advice.
 *   - The GENERAL_ADVICE_WARNING from lib/compliance.ts must be shown
 *     wherever this score appears in the UI.
 *
 * DESIGN: Pure function (no I/O, no database calls). Can be unit-tested
 *   in isolation. Input is a small aggregate derived from approved reviews.
 *   Output is a fully-typed result with sub-scores, a 0–100 overall score,
 *   and a human-readable label.
 *
 * METHODOLOGY (named-constant weights below):
 *   - Engagement-verified review count:  40% of overall
 *   - Total approved review count:        30% of overall
 *   - Average star rating (1–5):          20% of overall
 *   - Verified percentage (verified÷total): 10% of overall
 *
 * All dimension scores are normalised to 0–100 before weighting.
 */

/* ─── Named weight constants (must sum to 1.0) ─── */

/** Weight applied to the verified-review volume dimension. */
export const REPUTATION_WEIGHT_VERIFIED_COUNT = 0.40;
/** Weight applied to the total-review volume dimension. */
export const REPUTATION_WEIGHT_TOTAL_COUNT = 0.30;
/** Weight applied to the average star rating dimension. */
export const REPUTATION_WEIGHT_AVG_RATING = 0.20;
/** Weight applied to the verified-percentage dimension. */
export const REPUTATION_WEIGHT_VERIFIED_PCT = 0.10;

// Sanity: 0.40 + 0.30 + 0.20 + 0.10 = 1.00

/* ─── Types ─── */

/**
 * Input: aggregated review signals for a single advisor.
 * All numeric counts should be non-negative integers (or null/undefined when
 * no reviews exist — the scorer treats undefined/null as 0).
 */
export interface AdvisorReputationInput {
  /** Total number of approved (publicly visible) reviews. */
  total_reviews: number | null | undefined;
  /** Number of approved reviews where verified_engagement = true. */
  verified_reviews: number | null | undefined;
  /** Average star rating across all approved reviews (1.0–5.0). Null if no reviews. */
  avg_rating: number | null | undefined;
}

/** A named dimension within the reputation score. */
export interface ReputationDimension {
  key: "verified_count" | "total_count" | "avg_rating" | "verified_pct";
  label: string;
  /** 0–100 sub-score for this dimension. */
  score: number;
  /** 0–1 weight applied in the overall calculation. */
  weight: number;
  /** Plain-English rationale shown in the UI. */
  rationale: string;
}

/** Full output of `computeAdvisorReputation`. */
export interface AdvisorReputationScore {
  /** Overall Reputation Score, 0–100, rounded to nearest integer. */
  overall: number;
  /** Human-readable band label. */
  label: string;
  /** Tailwind text-colour class for the label (no leading `text-` prefix needed — returned in full). */
  labelColor: string;
  /** Per-dimension breakdown. */
  dimensions: ReputationDimension[];
  /** Total approved reviews (convenience copy). */
  totalReviews: number;
  /** Engagement-verified review count (convenience copy). */
  verifiedReviews: number;
  /** Verified percentage, 0–100, rounded to integer. */
  verifiedPct: number;
  /** Average star rating, or null if no reviews. */
  avgRating: number | null;
}

/* ─── Dimension scorers ─── */

/**
 * Dimension 1 — Engagement-verified review count (40%)
 *
 * A "verified" review is one where the reviewer had a recorded platform
 * engagement (lead or booking) with this advisor.
 *
 *   ≥ 10 verified → 100
 *   ≥  5 verified →  80
 *   ≥  3 verified →  60
 *   ≥  1 verified →  30
 *   0 verified    →   0
 */
function scoreVerifiedCount(verified: number): ReputationDimension {
  let score: number;
  let rationale: string;

  if (verified >= 10) {
    score = 100;
    rationale = `${verified} engagement-verified reviews.`;
  } else if (verified >= 5) {
    score = 80;
    rationale = `${verified} engagement-verified reviews.`;
  } else if (verified >= 3) {
    score = 60;
    rationale = `${verified} engagement-verified reviews.`;
  } else if (verified >= 1) {
    score = 30;
    rationale = `${verified} engagement-verified review${verified === 1 ? "" : "s"}.`;
  } else {
    score = 0;
    rationale = "No engagement-verified reviews yet.";
  }

  return {
    key: "verified_count",
    label: "Verified Review Count",
    score,
    weight: REPUTATION_WEIGHT_VERIFIED_COUNT,
    rationale,
  };
}

/**
 * Dimension 2 — Total approved review count (30%)
 *
 *   ≥ 20 reviews → 100
 *   ≥ 10 reviews →  80
 *   ≥  5 reviews →  60
 *   ≥  2 reviews →  40
 *   ≥  1 review  →  20
 *   0 reviews    →   0
 */
function scoreTotalCount(total: number): ReputationDimension {
  let score: number;
  let rationale: string;

  if (total >= 20) {
    score = 100;
    rationale = `${total} approved reviews published.`;
  } else if (total >= 10) {
    score = 80;
    rationale = `${total} approved reviews published.`;
  } else if (total >= 5) {
    score = 60;
    rationale = `${total} approved reviews published.`;
  } else if (total >= 2) {
    score = 40;
    rationale = `${total} approved reviews published.`;
  } else if (total >= 1) {
    score = 20;
    rationale = "1 approved review published.";
  } else {
    score = 0;
    rationale = "No approved reviews yet.";
  }

  return {
    key: "total_count",
    label: "Total Review Volume",
    score,
    weight: REPUTATION_WEIGHT_TOTAL_COUNT,
    rationale,
  };
}

/**
 * Dimension 3 — Average star rating (20%)
 *
 * Maps the star rating [3.0, 5.0] → [0, 100] linearly.
 * Ratings below 3.0 yield 0. No reviews → 0.
 *
 * Rationale: on this platform very low average ratings are statistically
 * uncommon because one-off reviewers with genuinely poor experiences tend
 * not to leave a review. A floor at 3.0 makes the mapping practically useful.
 */
function scoreAvgRating(avgRating: number | null, total: number): ReputationDimension {
  let score: number;
  let rationale: string;

  if (avgRating == null || total === 0) {
    score = 0;
    rationale = "No reviews to compute an average rating from.";
  } else {
    score = Math.max(0, Math.min(100, ((avgRating - 3.0) / 2.0) * 100));
    score = Math.round(score);
    rationale = `${avgRating.toFixed(1)}/5.0 average rating across ${total} review${total === 1 ? "" : "s"}.`;
  }

  return {
    key: "avg_rating",
    label: "Average Star Rating",
    score,
    weight: REPUTATION_WEIGHT_AVG_RATING,
    rationale,
  };
}

/**
 * Dimension 4 — Verified percentage (10%)
 *
 * Maps verified÷total [0, 1] → [0, 100].
 * At least 1 review must exist for this to be non-zero.
 *
 *   100% verified → 100
 *   75%  verified →  75  (linear)
 *   0%   verified →   0
 *   no reviews    →   0
 */
function scoreVerifiedPct(verified: number, total: number): ReputationDimension {
  let score: number;
  let rationale: string;

  if (total === 0) {
    score = 0;
    rationale = "No reviews yet — percentage cannot be calculated.";
  } else {
    const pct = verified / total;
    score = Math.round(pct * 100);
    rationale = `${score}% of reviews are engagement-verified (${verified} of ${total}).`;
  }

  return {
    key: "verified_pct",
    label: "Verified Review Rate",
    score,
    weight: REPUTATION_WEIGHT_VERIFIED_PCT,
    rationale,
  };
}

/* ─── Label helpers ─── */

/**
 * Returns a human-readable label for the given overall reputation score.
 */
export function reputationLabel(score: number): string {
  if (score >= 75) return "Excellent";
  if (score >= 55) return "Good";
  if (score >= 35) return "Developing";
  return "New";
}

/**
 * Returns the Tailwind text-colour class for the given score band.
 */
export function reputationLabelColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 55) return "text-teal-600";
  if (score >= 35) return "text-amber-600";
  return "text-slate-500";
}

/* ─── Main export ─── */

/**
 * Compute the Advisor Reputation Score.
 *
 * Pure function — no I/O, no side effects.
 *
 * @param input  Aggregated review signals for one advisor.
 */
export function computeAdvisorReputation(
  input: AdvisorReputationInput,
): AdvisorReputationScore {
  const total = Math.max(0, typeof input.total_reviews === "number" ? input.total_reviews : 0);
  const verified = Math.max(
    0,
    typeof input.verified_reviews === "number" ? input.verified_reviews : 0,
  );
  // verified cannot exceed total
  const clampedVerified = Math.min(verified, total);
  const avgRating =
    typeof input.avg_rating === "number" && total > 0 ? input.avg_rating : null;

  const dimensions: ReputationDimension[] = [
    scoreVerifiedCount(clampedVerified),
    scoreTotalCount(total),
    scoreAvgRating(avgRating, total),
    scoreVerifiedPct(clampedVerified, total),
  ];

  // Weighted average — weights already sum to 1.0
  const overall = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0),
  );

  const verifiedPct = total === 0 ? 0 : Math.round((clampedVerified / total) * 100);

  return {
    overall,
    label: reputationLabel(overall),
    labelColor: reputationLabelColor(overall),
    dimensions,
    totalReviews: total,
    verifiedReviews: clampedVerified,
    verifiedPct,
    avgRating,
  };
}
