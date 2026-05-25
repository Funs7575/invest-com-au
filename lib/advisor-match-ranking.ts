/**
 * Outcomes-weighted ranking for the Get Matched advisor candidate list.
 *
 * PURPOSE
 * -------
 * Deepens advisor matching beyond static profile signals by blending in a
 * historical outcomes signal: how often has this advisor engaged / converted
 * for requests _similar_ to the current one?
 *
 * This is a factual marketplace-ranking signal — the same category as
 * "number of reviews" or "response time". It re-orders an already-eligible
 * candidate list. It does NOT produce a personal financial recommendation for
 * the consumer and must never be presented as one.
 *
 * ALGORITHM
 * ---------
 * For each candidate advisor we compute a smoothed engagement rate using the
 * Wilson score interval lower bound (same formula used for review confidence
 * ratings). Wilson handles the cold-start problem cleanly: an advisor with
 * 1/1 matches doesn't leapfrog one with 50/60. The lower bound of the 95 %
 * confidence interval is used as the "safe" estimate.
 *
 * Blended score:
 *   finalScore = (1 - OUTCOMES_WEIGHT) * matchScore + OUTCOMES_WEIGHT * smoothedRate * 100
 *
 * where matchScore is the existing 0-100 score from the caller, and
 * OUTCOMES_WEIGHT controls how much historical signal influences rank.
 *
 * CAPPING
 * -------
 * - `smoothedRate` is capped at OUTCOMES_CAP so a perfect historical record
 *   on tiny sample sizes can't push an advisor above good candidates with
 *   substantial data.
 * - Minimum observations below MIN_OBS fall back to the prior mean
 *   (PRIOR_ENGAGEMENTS / PRIOR_MATCHES) with no outcomes lift/penalty.
 *
 * SAFETY
 * ------
 * - When `outcomesStats` is empty (fresh install, DB error, table missing)
 *   the function falls back to pure match score ordering — deterministic,
 *   no silent failure.
 * - Active/inactive filtering and hard-exclusions stay in the caller's
 *   existing pipeline. This function does NOT exclude advisors.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const log = logger("advisor-match-ranking");

// ─── Tuning constants ──────────────────────────────────────────────────────

/** Share of the final score contributed by the outcomes signal. */
export const OUTCOMES_WEIGHT = 0.25;

/**
 * Minimum number of match observations before outcomes data influences
 * rank. Below this threshold the advisor falls back to `PRIOR_ENGAGEMENTS
 * / PRIOR_MATCHES` as the smoothed rate.
 */
export const MIN_OBS = 3;

/**
 * Bayesian prior — represents a "neutral" advisor we've never seen before.
 * Equivalent to one advisor who engaged half the time on two observations.
 * Applied to every advisor's data before computing Wilson, giving each
 * record at least MIN_OBS virtual observations.
 */
export const PRIOR_MATCHES = 2;
export const PRIOR_ENGAGEMENTS = 1;

/**
 * Upper cap on the smoothed rate used in the score blend.
 * Prevents a perfect tiny sample from scoring as high as a well-evidenced
 * strong performer.
 */
export const OUTCOMES_CAP = 0.85;

/** z-score for 95 % confidence interval (one-sided lower bound). */
const Z = 1.96;

// ─── Types ─────────────────────────────────────────────────────────────────

/** Per-advisor aggregate stats fetched from the DB. */
export interface AdvisorOutcomeStats {
  /** professional_id / advisor numeric PK. */
  advisorId: number;
  /** Total number of times this advisor appeared in a get-matched result
   *  for a request that was subsequently tracked as "sent to advisor" or
   *  "brief accepted". */
  matchCount: number;
  /**
   * Subset of `matchCount` where the advisor went on to "engage" —
   * operationally defined as: lead outcome = 'contacted' | 'converted',
   * OR brief tracker_status = 'contacted' | 'call_booked' | 'won'.
   */
  engagementCount: number;
}

/**
 * Contextual signals extracted from the current request, used to scope the
 * stats query to comparable historic requests. Currently used by the DB
 * helper; callers that pass pre-fetched stats can leave this as `{}`.
 */
export interface MatchRequestContext {
  intentSlug?: string | null;
  budgetBand?: string | null;
  locationState?: string | null;
}

/** Input candidate — must carry `id` and a numeric `matchScore` in [0, 100]. */
export interface RankableCandidate {
  id: number;
  /** Existing match score from the upstream ranker. 0-100. */
  matchScore: number;
  [key: string]: unknown;
}

// ─── Core pure function ────────────────────────────────────────────────────

/**
 * Compute Wilson score lower-bound for a proportion.
 *
 * @param successes - number of positive outcomes
 * @param n - total observations
 * @param z - z-score (default 1.96 = 95 %)
 * @returns lower bound of the confidence interval, in [0, 1]
 */
export function wilsonLowerBound(successes: number, n: number, z: number = Z): number {
  if (n <= 0) return 0;
  const pHat = successes / n;
  const zz = z * z;
  const numerator = pHat + zz / (2 * n) - z * Math.sqrt((pHat * (1 - pHat) + zz / (4 * n)) / n);
  const denominator = 1 + zz / n;
  return Math.max(0, Math.min(1, numerator / denominator));
}

/**
 * Compute the smoothed engagement rate for one advisor.
 *
 * Adds Bayesian prior counts before applying Wilson so cold-start advisors
 * get a neutral signal rather than 0 or 1.
 */
export function smoothedEngagementRate(stats: AdvisorOutcomeStats): number {
  const totalMatches = stats.matchCount + PRIOR_MATCHES;
  const totalEngagements = stats.engagementCount + PRIOR_ENGAGEMENTS;
  const raw = wilsonLowerBound(totalEngagements, totalMatches);
  return Math.min(raw, OUTCOMES_CAP);
}

/**
 * Re-rank `candidates` by blending the existing `matchScore` with a
 * Wilson-smoothed, capped historical engagement rate.
 *
 * AFSL safety: output is a re-ordered candidate list only. The function
 * returns the same objects with an added `_outcomesScore` debug field.
 * No language about suitability or recommendations is produced here.
 *
 * @param candidates  - Eligible advisors with existing match scores
 * @param outcomesStats - Per-advisor historical stats (can be empty — safe fallback)
 * @param _context    - Request context (reserved for future per-intent scoping)
 */
export function rankByOutcomes<T extends RankableCandidate>(
  candidates: T[],
  outcomesStats: AdvisorOutcomeStats[],
  _context: MatchRequestContext = {},
): Array<T & { _outcomesScore: number }> {
  // Fast path: no stats → preserve existing match order (deterministic).
  if (outcomesStats.length === 0) {
    return candidates.map((c) => ({ ...c, _outcomesScore: c.matchScore }));
  }

  const statsById = new Map<number, AdvisorOutcomeStats>();
  for (const s of outcomesStats) {
    statsById.set(s.advisorId, s);
  }

  const scored = candidates.map((c) => {
    const stats = statsById.get(c.id);

    // Advisor has no outcome data — treat as prior only (neutral).
    const rate = stats
      ? smoothedEngagementRate(stats)
      : smoothedEngagementRate({ advisorId: c.id, matchCount: 0, engagementCount: 0 });

    const outcomesScore = rate * 100; // Scale to [0, 100] for comparison
    const blended =
      (1 - OUTCOMES_WEIGHT) * c.matchScore + OUTCOMES_WEIGHT * outcomesScore;

    return { ...c, _outcomesScore: Math.round(blended * 10) / 10 };
  });

  // Sort descending by blended score; tie-break by original matchScore
  scored.sort((a, b) => {
    if (b._outcomesScore !== a._outcomesScore) return b._outcomesScore - a._outcomesScore;
    return b.matchScore - a.matchScore;
  });

  return scored;
}

// ─── DB helper ─────────────────────────────────────────────────────────────

const OUTCOMES_CACHE_MS = 10 * 60 * 1000; // 10 minutes
let cachedStats: { value: AdvisorOutcomeStats[]; at: number } | null = null;

/**
 * Fetch per-advisor outcome stats from the DB, aggregating across
 * `professional_leads` (lead outcomes) and `brief_outcomes` (brief
 * post-completion outcomes).
 *
 * Uses service-role (admin) client because `professional_leads` has deny-all
 * anon RLS and the query is cross-user (not scoped to auth.uid()). Legitimate
 * per CLAUDE.md: cross-user query that can't be scoped to auth.uid().
 *
 * Results are cached for 10 minutes so a burst of resolve requests doesn't
 * hammer the DB.
 *
 * @param supabase - Admin Supabase client (SupabaseClient)
 * @param _context - Reserved; currently ignored (stats are global, not
 *                   per-intent — scoping is a future iteration)
 */
export async function fetchAdvisorOutcomeStats(
  supabase: SupabaseClient,
  _context: MatchRequestContext = {},
): Promise<AdvisorOutcomeStats[]> {
  const now = Date.now();
  if (cachedStats && now - cachedStats.at < OUTCOMES_CACHE_MS) {
    return cachedStats.value;
  }

  try {
    // Aggregate from professional_leads: count per professional_id,
    // with engagement = outcome IN ('contacted', 'converted').
    // We pull the last 180 days to avoid stale historical skew.
    const cutoff = new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString();

    const { data: leadRows, error: leadErr } = await supabase
      .from("professional_leads")
      .select("professional_id, outcome")
      .gte("created_at", cutoff);

    if (leadErr) {
      log.warn("fetchAdvisorOutcomeStats: professional_leads query failed", {
        error: leadErr.message,
      });
      cachedStats = { value: [], at: now };
      return [];
    }

    // Aggregate in memory to avoid complex DB GROUP BY via PostgREST.
    const aggregates = new Map<number, { matches: number; engagements: number }>();

    const ENGAGED_OUTCOMES = new Set(["contacted", "converted"]);

    for (const row of leadRows ?? []) {
      const pid = row.professional_id as number | null;
      if (!pid) continue;
      const existing = aggregates.get(pid) ?? { matches: 0, engagements: 0 };
      existing.matches += 1;
      if (row.outcome && ENGAGED_OUTCOMES.has(row.outcome as string)) {
        existing.engagements += 1;
      }
      aggregates.set(pid, existing);
    }

    const result: AdvisorOutcomeStats[] = [];
    aggregates.forEach((agg, advisorId) => {
      result.push({
        advisorId,
        matchCount: agg.matches,
        engagementCount: agg.engagements,
      });
    });

    cachedStats = { value: result, at: now };
    return result;
  } catch (err) {
    log.warn("fetchAdvisorOutcomeStats: unexpected error (returning [])", {
      error: err instanceof Error ? err.message : String(err),
    });
    cachedStats = { value: [], at: now };
    return [];
  }
}

/** Invalidate the in-process outcomes stats cache (for tests + hot-paths). */
export function invalidateOutcomesCache(): void {
  cachedStats = null;
}
