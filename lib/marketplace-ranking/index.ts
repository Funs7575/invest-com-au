/**
 * Marketplace ranking — score and sort providers on /advisors and /teams
 * using an admin-tunable weighted sum of normalised signals.
 *
 * Signals (each normalised to 0..1):
 *   - verified              1 if `verified=true`, else 0
 *   - outcome_score         `outcome_score / 100` (verified outcome aggregate)
 *   - response_latency_inv  1 - clamp(latency_hours / 48, 0, 1) — faster = higher
 *   - subscription_tier     `getPriorityWeightBps(tier) / 10000` (0..1)
 *   - rating                `rating / 5`
 *
 * Weights live in `marketplace_ranking_weights` (admin-editable). Default
 * weights are used when the table is empty or unreachable so existing
 * /advisors ranking stays deterministic.
 *
 * This module is pure-ish: signal extraction and scoring are pure
 * functions; only the weight loader hits the DB.
 */

// eslint-disable-next-line no-restricted-imports -- weight table is anon-readable but admin client is used for server-rendered listing pages where the auth client isn't available.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  getPriorityWeightBps,
  type ProSubscriptionTier,
} from "@/lib/pro-subscription";

const log = logger("marketplace-ranking");

export type RankingSurface = "advisors" | "teams";
export type RankingSignal =
  | "verified"
  | "outcome_score"
  | "response_latency_inv"
  | "subscription_tier"
  | "rating"
  | "credit_headroom";

export type RankingWeights = Partial<Record<RankingSignal, number>>;

export interface RankableProvider {
  id: number;
  verified?: boolean | null;
  outcome_score?: number | null;
  response_latency_hours?: number | null;
  subscription_tier?: ProSubscriptionTier | null;
  rating?: number | null;
}

const DEFAULT_WEIGHTS: Record<RankingSurface, RankingWeights> = {
  advisors: {
    verified: 10000,
    outcome_score: 8000,
    response_latency_inv: 4000,
    subscription_tier: 5000,
    rating: 3000,
  },
  teams: {
    verified: 10000,
    outcome_score: 8000,
    subscription_tier: 5000,
    rating: 3000,
  },
};

/**
 * Load active weights for a surface. Falls back to defaults on any error
 * so /advisors and /teams keep ranking deterministically.
 */
export async function loadRankingWeights(
  surface: RankingSurface,
): Promise<RankingWeights> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("marketplace_ranking_weights")
      .select("signal, weight_bps")
      .eq("surface", surface)
      .eq("enabled", true);
    if (!data || data.length === 0) {
      return DEFAULT_WEIGHTS[surface];
    }
    const out: RankingWeights = {};
    for (const row of data as { signal: string; weight_bps: number }[]) {
      out[row.signal as RankingSignal] = row.weight_bps;
    }
    return out;
  } catch (err) {
    log.warn("loadRankingWeights failed, using defaults", {
      surface,
      err: err instanceof Error ? err.message : String(err),
    });
    return DEFAULT_WEIGHTS[surface];
  }
}

/**
 * Pure scoring function. Returns a non-negative number; higher = better.
 */
export function scoreProvider(
  provider: RankableProvider,
  weights: RankingWeights,
): number {
  let score = 0;

  if (weights.verified) {
    score += (provider.verified ? 1 : 0) * (weights.verified / 10_000);
  }
  if (weights.outcome_score && provider.outcome_score != null) {
    score +=
      clamp01(provider.outcome_score / 100) * (weights.outcome_score / 10_000);
  }
  if (weights.response_latency_inv && provider.response_latency_hours != null) {
    const inv = 1 - clamp01(provider.response_latency_hours / 48);
    score += inv * (weights.response_latency_inv / 10_000);
  }
  if (weights.subscription_tier && provider.subscription_tier) {
    const tierBps = getPriorityWeightBps(provider.subscription_tier);
    score += (tierBps / 10_000) * (weights.subscription_tier / 10_000);
  }
  if (weights.rating && provider.rating != null) {
    score += clamp01(provider.rating / 5) * (weights.rating / 10_000);
  }

  return score;
}

export function sortByScore<T extends RankableProvider>(
  providers: T[],
  weights: RankingWeights,
): T[] {
  return [...providers].sort((a, b) => scoreProvider(b, weights) - scoreProvider(a, weights));
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
