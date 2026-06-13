/**
 * Open to Offers — pitch pricing.
 *
 * A pitch costs the adviser a FLAT B2B credit fee (lead routing — never a % of
 * any advice fee, never consumer->adviser money). We price it through the SAME
 * dynamic-pricing machinery the lead/brief path uses (lib/dynamic-pricing.ts)
 * so surge / quality / advisor-type rules apply consistently: a base pitch cost
 * in cents → `resolveLeadPrice` applies the highest-priority matching rule →
 * convert to whole credits (1 credit = A$1.00, matching lib/briefs/credits.ts).
 *
 * Pure-ish: `pitchCreditsFromCents` is a pure converter; `estimatePitchCredits`
 * does the DB-backed dynamic-pricing read (cached in dynamic-pricing.ts).
 */

import { resolveLeadPrice, type PricingContext } from "@/lib/dynamic-pricing";
import { CENTS_PER_CREDIT } from "@/lib/briefs/credits";
import { dbTypeForNeed } from "@/lib/quiz-advisor-types";
import type { ProspectSnapshot, ProspectBudgetBand } from "./types";

/**
 * Base pitch cost in cents before dynamic rules. A pitch is a warmer, opt-in
 * lead than a cold brief, so it sits a notch above the brief floor (2 credits)
 * by default. Dynamic-pricing rules (and the DB floor/cap) move it from here.
 */
export const BASE_PITCH_COST_CENTS = 3 * CENTS_PER_CREDIT;

/** Map a budget band to a coarse lead-quality score for the pricing context. */
function budgetQualityScore(band: ProspectBudgetBand | null): number | null {
  switch (band) {
    case "whale":
      return 95;
    case "large":
      return 80;
    case "medium":
      return 60;
    case "small":
      return 40;
    default:
      return null;
  }
}

/** Convert a price in cents to a whole number of credits (min 1). */
export function pitchCreditsFromCents(priceCents: number): number {
  return Math.max(1, Math.round(priceCents / CENTS_PER_CREDIT));
}

/**
 * Estimate the credit cost for an adviser to pitch a given prospect. Reads the
 * dynamic-pricing rules (cached). Never throws — falls back to the base cost.
 */
export async function estimatePitchCredits(
  snapshot: ProspectSnapshot,
  opts: { hourLocal?: number | null; advisorAgeDays?: number | null } = {},
): Promise<number> {
  const context: PricingContext = {
    advisorType: snapshot.advisorType ? dbTypeForNeed(snapshot.advisorType) || null : null,
    vertical: snapshot.vertical,
    leadQualityScore: budgetQualityScore(snapshot.budgetBand),
    hourLocal: opts.hourLocal ?? null,
    advisorAgeDays: opts.advisorAgeDays ?? null,
  };
  const result = await resolveLeadPrice(BASE_PITCH_COST_CENTS, context);
  return pitchCreditsFromCents(result.finalPriceCents);
}
