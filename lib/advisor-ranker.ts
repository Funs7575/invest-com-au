/**
 * Advisor ranker that blends curated signals with learned
 * lead-quality weights.
 *
 * Previously, `/find-advisor/[location]` sorted advisors by
 * `rating` alone. That ignored everything we know about what
 * actually correlates with conversion — response time, profile
 * completeness, pending dispute rate, recent lead volume etc —
 * AND it ignored the `lead_quality_weights` the nightly cron
 * computes.
 *
 * The ranker consumes:
 *
 *   1. Advisor features (rating, review_count, response_hours,
 *      profile_completeness, specialties_match, pending_disputes,
 *      verified, auto_pause_reason)
 *   2. The latest model_version row from `lead_quality_weights`
 *      which gives us a weight per "signal" — applied to the
 *      advisor whose profile has that signal present
 *
 * Output is a normalised score in [0, 100] that the caller sorts
 * descending. The ranker never mutates input rows.
 *
 * Safety:
 *
 *   - Inactive / paused advisors get score 0 and are sorted last
 *   - Advisors with an open AFSL expiry issue get a large penalty
 *     (but not 0, so admins can still find them in reviews)
 *   - If no weights table exists (fresh install), we fall back to
 *     a curated default weight map so the ranker still works
 *
 * The library is pure — the caller passes in pre-fetched weights
 * so unit tests don't need a Supabase stub.
 */

export interface AdvisorForRanking {
  id: number;
  rating: number | null;
  review_count: number | null;
  verified: boolean | null;
  status: string;
  auto_pause_reason: string | null;
  profile_quality_gate: string | null;
  profile_gate_step: number | null;
  // Optional, hydrated from professionals row where available
  median_response_hours?: number | null;
  recent_lead_count?: number | null;
  recent_dispute_count?: number | null;
  is_sponsored?: boolean | null;
  sponsored_boost?: number | null; // 0-20 extra points
}

export interface QualityWeight {
  signal_name: string;
  weight: number; // 0-50 per signal, as produced by the cron
}

export interface RankerOptions {
  /** Boost rank by match with user's quiz answers. 0 = ignore. */
  specialtyMatchBoost?: number;
  /** Additional penalty for advisors with any open compliance issue */
  compliancePenalty?: number;
}

/**
 * Default weight map used when lead_quality_weights is empty.
 * These correspond to the signals we know correlate with advisor
 * quality across the platform today.
 */
const DEFAULT_SIGNAL_WEIGHTS: Record<string, number> = {
  rating_high: 30, // rating ≥ 4.5
  reviews_many: 20, // review_count ≥ 10
  verified_badge: 15, // ASIC-verified
  response_fast: 25, // median_response_hours ≤ 2
  disputes_low: 15, // recent_dispute_count ≤ 1
  profile_complete: 10, // profile_quality_gate = 'passed'
};

export function scoreAdvisor(
  advisor: AdvisorForRanking,
  weights: QualityWeight[],
  options: RankerOptions = {},
): number {
  // Hard exclusions
  if (advisor.status !== "active") return 0;
  if (advisor.auto_pause_reason === "afsl_ceased") return 0;

  // Build an effective weight map: learned weights first, fall back
  // to defaults for any signal the learner hasn't observed yet
  const effective: Record<string, number> = { ...DEFAULT_SIGNAL_WEIGHTS };
  for (const w of weights) {
    effective[w.signal_name] = w.weight;
  }

  let score = 0;
  const maxContribution = Object.values(effective).reduce((a, b) => a + b, 0);

  // rating_high
  if ((advisor.rating || 0) >= 4.5) score += effective.rating_high || 0;
  else if ((advisor.rating || 0) >= 4.0) score += (effective.rating_high || 0) * 0.6;

  // reviews_many
  if ((advisor.review_count || 0) >= 10) score += effective.reviews_many || 0;
  else if ((advisor.review_count || 0) >= 3) score += (effective.reviews_many || 0) * 0.5;

  // verified_badge
  if (advisor.verified) score += effective.verified_badge || 0;

  // response_fast
  if (advisor.median_response_hours != null) {
    if (advisor.median_response_hours <= 2) score += effective.response_fast || 0;
    else if (advisor.median_response_hours <= 6)
      score += (effective.response_fast || 0) * 0.6;
    else if (advisor.median_response_hours <= 24)
      score += (effective.response_fast || 0) * 0.3;
  }

  // disputes_low
  if (advisor.recent_dispute_count != null) {
    if (advisor.recent_dispute_count === 0) score += effective.disputes_low || 0;
    else if (advisor.recent_dispute_count === 1)
      score += (effective.disputes_low || 0) * 0.5;
  }

  // profile_complete
  if (advisor.profile_quality_gate === "passed") score += effective.profile_complete || 0;
  else if (advisor.profile_gate_step && advisor.profile_gate_step >= 3)
    score += (effective.profile_complete || 0) * 0.3;

  // Compliance penalty — advisor paused for sla_miss etc. still
  // shows up but ranked lower
  if (advisor.auto_pause_reason) {
    score -= options.compliancePenalty ?? 20;
  }

  // Specialty match — caller passes this via options for context
  score += options.specialtyMatchBoost || 0;

  // Sponsored boost — paid placement, capped by ranker config
  const sponsoredBoost = Math.min(
    20,
    Math.max(0, advisor.is_sponsored ? advisor.sponsored_boost || 10 : 0),
  );
  score += sponsoredBoost;

  // Normalise to [0, 100] using the weight total + boosts
  const maxPossible = maxContribution + 20 /* sponsored cap */ + (options.specialtyMatchBoost || 0);
  const normalised = Math.max(0, Math.min(100, Math.round((score / maxPossible) * 100)));
  return normalised;
}

/**
 * Rank a list of advisors descending by computed score. Ties are
 * broken by rating then review_count for stability.
 */
export function rankAdvisors<T extends AdvisorForRanking>(
  advisors: T[],
  weights: QualityWeight[],
  options: RankerOptions = {},
): Array<T & { _rankScore: number }> {
  return advisors
    .map((a) => ({ ...a, _rankScore: scoreAdvisor(a, weights, options) }))
    .sort((a, b) => {
      if (b._rankScore !== a._rankScore) return b._rankScore - a._rankScore;
      if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
      return (b.review_count || 0) - (a.review_count || 0);
    });
}

// ─── Supabase reader for the latest model_version ─────────────────
import type { SupabaseClient } from "@supabase/supabase-js";

const WEIGHT_CACHE_MS = 5 * 60 * 1000; // 5 minutes
let cached: { value: QualityWeight[]; at: number } | null = null;

/**
 * Pull the latest lead_quality_weights from the DB. Cached in
 * process for 5 minutes so a hot page doesn't hammer the DB.
 *
 * If the table is empty or errors, returns an empty array and the
 * scorer falls through to the hardcoded defaults. This is an
 * explicit safety net — a misconfigured weights table should
 * degrade gracefully rather than break advisor search entirely.
 */
export async function getLatestQualityWeights(
  supabase: SupabaseClient,
): Promise<QualityWeight[]> {
  const now = Date.now();
  if (cached && now - cached.at < WEIGHT_CACHE_MS) return cached.value;

  try {
    // Most recent model_version
    const { data: latest } = await supabase
      .from("lead_quality_weights")
      .select("model_version")
      .order("model_version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest?.model_version) {
      cached = { value: [], at: now };
      return [];
    }

    const { data: rows } = await supabase
      .from("lead_quality_weights")
      .select("signal_name, weight")
      .eq("model_version", latest.model_version);

    const weights: QualityWeight[] = (rows || []).map((r) => ({
      signal_name: r.signal_name as string,
      weight: Number(r.weight) || 0,
    }));

    cached = { value: weights, at: now };
    return weights;
  } catch {
    cached = { value: [], at: now };
    return [];
  }
}

export function invalidateQualityWeightsCache(): void {
  cached = null;
}
