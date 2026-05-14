/**
 * Pro Squad verification badge tiers.
 *
 * Pure function — no DB calls. The caller passes in member count, disc-
 * iplines (unique advisor types across members), and the team's outcome
 * scoreboard (from N4). Returns the tier the team has earned plus the
 * label, tone, and "what's next" upgrade hint.
 *
 * Tier rubric:
 *   - **Gold**   = 5+ active members AND 3+ unique disciplines AND
 *                  80%+ completion rate (≥3 outcomes)
 *   - **Silver** = 3+ active members AND 2+ unique disciplines
 *   - **Bronze** = 1+ active verified member (the default verified squad)
 *
 * The tiers are intentionally easy to walk up — competing teams should
 * see clear "what we need to add to level up" guidance.
 */

export type SquadTier = "bronze" | "silver" | "gold";

export interface SquadTierInput {
  memberCount: number;
  uniqueDisciplineCount: number;
  completionRatePct: number | null;
  outcomesSubmitted: number;
}

export interface SquadTierBadge {
  tier: SquadTier;
  label: string;
  tone: "amber" | "slate" | "yellow";
  /** What the team needs to do to reach the next tier (null if already gold). */
  nextStep: string | null;
}

export function computeSquadTier(input: SquadTierInput): SquadTierBadge {
  // ── Gold gate ──
  const isGold =
    input.memberCount >= 5 &&
    input.uniqueDisciplineCount >= 3 &&
    input.completionRatePct !== null &&
    input.completionRatePct >= 80 &&
    input.outcomesSubmitted >= 3;
  if (isGold) {
    return {
      tier: "gold",
      label: "Gold Pro Squad",
      tone: "yellow",
      nextStep: null,
    };
  }

  // ── Silver gate ──
  const isSilver = input.memberCount >= 3 && input.uniqueDisciplineCount >= 2;
  if (isSilver) {
    const remainingForGold: string[] = [];
    if (input.memberCount < 5) remainingForGold.push(`${5 - input.memberCount} more verified members`);
    if (input.completionRatePct === null || input.outcomesSubmitted < 3) {
      remainingForGold.push("3+ submitted client outcomes");
    } else if (input.completionRatePct < 80) {
      remainingForGold.push(`completion rate ≥80% (currently ${input.completionRatePct}%)`);
    }
    return {
      tier: "silver",
      label: "Silver Pro Squad",
      tone: "slate",
      nextStep:
        remainingForGold.length > 0
          ? `To reach Gold: ${remainingForGold.join(" + ")}`
          : null,
    };
  }

  // ── Bronze default ──
  const remainingForSilver: string[] = [];
  if (input.memberCount < 3)
    remainingForSilver.push(`${3 - input.memberCount} more verified members`);
  if (input.uniqueDisciplineCount < 2)
    remainingForSilver.push(`${2 - input.uniqueDisciplineCount} more discipline(s)`);
  return {
    tier: "bronze",
    label: "Bronze Pro Squad",
    tone: "amber",
    nextStep:
      remainingForSilver.length > 0
        ? `To reach Silver: ${remainingForSilver.join(" + ")}`
        : null,
  };
}

/** Single source of truth for sort order — Gold > Silver > Bronze. */
export const TIER_SORT_ORDER: Record<SquadTier, number> = {
  gold: 3,
  silver: 2,
  bronze: 1,
};
