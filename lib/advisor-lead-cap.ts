/**
 * Advisor monthly lead-cap maths — pure, no DB access.
 *
 * The tier catalogue (lib/advisor-tiers.ts) gives Free and Growth a
 * `maxLeadsPerMonth`; Pro and Elite are uncapped. This module turns
 * "tier + leads received this calendar month" into a cap status the
 * portal can render factually (current usage, the cap, and which tier
 * removes/raises it).
 *
 * IMPORTANT — honesty constraint: the cap is part of the tier
 * catalogue but is NOT enforced by lead allocation today. Copy built
 * from this status must describe plan inclusions ("X of the Y
 * leads/month included in Free") and never claim that routing stops
 * at the cap.
 *
 * Consumed by /api/advisor-auth/lead-cap and unit-tested in
 * __tests__/lib/advisor-lead-cap.test.ts.
 */

import { getTier, TIERS, type AdvisorTier, type TierSpec } from "@/lib/advisor-tiers";

/** Usage ratio at which the portal starts showing the upgrade prompt. */
export const LEAD_CAP_WARN_RATIO = 0.8;

export type LeadCapLevel = "ok" | "approaching" | "at_cap" | "over_cap";

export interface LeadCapStatus {
  /** Normalised tier id the status was computed for. */
  tier: AdvisorTier;
  /** Monthly cap for the tier; null = uncapped. */
  cap: number | null;
  /** Leads received this calendar month (clamped to >= 0). */
  used: number;
  /** Leads left under the cap; null when uncapped. Never negative. */
  remaining: number | null;
  /** used / cap, rounded to 2dp; null when uncapped. */
  ratio: number | null;
  level: LeadCapLevel;
  /**
   * The cheapest tier whose cap is higher than (or removes) the
   * current one — what the upsell offers. Null when already uncapped.
   */
  nextTier: TierSpec | null;
}

/** Unknown / legacy tier strings (e.g. "silver", "gold") fall back to free. */
export function normaliseTier(tier: string | null | undefined): AdvisorTier {
  const known = getTier(tier ?? "");
  return known ? known.id : "free";
}

/**
 * Cheapest tier with a strictly higher (or no) lead cap than `tier`.
 * free(15) → growth(60); growth(60) → pro(uncapped); pro/elite → null.
 */
export function nextTierFor(tier: AdvisorTier): TierSpec | null {
  const current = getTier(tier);
  if (!current || current.maxLeadsPerMonth === null) return null;
  for (const candidate of TIERS) {
    if (candidate.id === current.id) continue;
    if (candidate.monthlyPriceCents < current.monthlyPriceCents) continue;
    if (
      candidate.maxLeadsPerMonth === null ||
      candidate.maxLeadsPerMonth > current.maxLeadsPerMonth
    ) {
      return candidate;
    }
  }
  return null;
}

/**
 * Compute the cap status for a tier + this-month usage count.
 *
 * Thresholds:
 *   - uncapped tier            → ok
 *   - used >  cap              → over_cap
 *   - used == cap              → at_cap
 *   - used/cap >= 0.8          → approaching
 *   - otherwise                → ok
 */
export function getLeadCapStatus(
  tier: string | null | undefined,
  leadsThisMonth: number,
): LeadCapStatus {
  const tierId = normaliseTier(tier);
  const spec = getTier(tierId);
  const cap = spec?.maxLeadsPerMonth ?? null;
  const used = Math.max(0, Math.floor(Number.isFinite(leadsThisMonth) ? leadsThisMonth : 0));

  if (cap === null) {
    return { tier: tierId, cap: null, used, remaining: null, ratio: null, level: "ok", nextTier: null };
  }

  const ratio = cap > 0 ? Math.round((used / cap) * 100) / 100 : 1;
  let level: LeadCapLevel = "ok";
  if (used > cap) level = "over_cap";
  else if (used === cap) level = "at_cap";
  else if (used / cap >= LEAD_CAP_WARN_RATIO) level = "approaching";

  return {
    tier: tierId,
    cap,
    used,
    remaining: Math.max(0, cap - used),
    ratio,
    level,
    nextTier: nextTierFor(tierId),
  };
}

/** True when the portal should surface the upgrade prompt. */
export function shouldShowCapUpsell(status: LeadCapStatus): boolean {
  return status.level === "approaching" || status.level === "at_cap" || status.level === "over_cap";
}
