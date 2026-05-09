/**
 * Response-time reward multiplier for advisor lead pricing.
 *
 * PR-X2 from ~/.claude/plans/sleepy-growing-planet.md §4.2. Pairs with
 * the visitor-side "Fast reply (<1h)" badge shipped in PR #686 to create
 * a self-reinforcing flywheel:
 *
 *   Fast advisor → wins more leads (badge) → pays less per lead (this)
 *   Slow advisor → wins fewer leads → has less reason to stay slow
 *
 * Implementation choice: rolling avg vs per-lead.
 * The plan suggests "respond to next lead within 60 min, get next lead at
 * 25% off" — a per-lead reward. We approximate with the rolling
 * `avg_response_minutes` column (already populated by every advisor's
 * lead history) because:
 *   1. Per-lead reward requires tracking response time per lead and gating
 *      the NEXT lead's price on the prior — adds complexity for a small
 *      delta over time
 *   2. Rolling avg already exists, no schema change needed
 *   3. The economic effect is the same in steady state
 *
 * If founder later wants the strict per-lead variant, this helper can be
 * called with a "this-lead's response time" instead of the rolling avg.
 *
 * Stacks with the cross-border multiplier (PR-5) and tier multipliers:
 *
 *   priceCents = base × tier × crossBorder × responseTimeMultiplier
 *
 * Pure module — no DB / Stripe / cookie access.
 */

/** Threshold (minutes) below which the advisor qualifies for the discount. */
export const RESPONSE_TIME_REWARD_THRESHOLD_MIN = 60;

/** Discount multiplier — applied to the lead price when avg response < threshold. */
export const RESPONSE_TIME_REWARD_MULTIPLIER = 0.75; // 25% off

/**
 * Returns the price multiplier based on the advisor's avg response time.
 * Returns RESPONSE_TIME_REWARD_MULTIPLIER (0.75) when avg ≤ threshold,
 * else 1.0 (no discount). Null/undefined avg returns 1.0 — no reward
 * until the advisor has enough lead history to establish a track record.
 */
export function responseTimeMultiplier(
  avgResponseMinutes: number | null | undefined,
): number {
  if (avgResponseMinutes == null) return 1.0;
  if (avgResponseMinutes <= 0) return 1.0; // defensive — shouldn't happen
  return avgResponseMinutes <= RESPONSE_TIME_REWARD_THRESHOLD_MIN
    ? RESPONSE_TIME_REWARD_MULTIPLIER
    : 1.0;
}

/**
 * Returns true when the advisor qualifies for the response-time discount.
 * Convenience predicate for UI surfaces (e.g. "you're saving 25% per lead
 * because of your response time" badge).
 */
export function qualifiesForResponseTimeReward(
  avgResponseMinutes: number | null | undefined,
): boolean {
  return responseTimeMultiplier(avgResponseMinutes) < 1.0;
}
