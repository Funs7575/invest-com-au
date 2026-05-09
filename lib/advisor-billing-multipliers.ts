/**
 * Premium pricing multipliers for cross-border specialties.
 *
 * FIN_NOTEBOOK 2026-05-01 entry #24 Phase A: cross-border lead LTV is
 * 5–15× a domestic share-broker lead ($5-20k professional fees over 18
 * months across pension transfer + non-resident mortgage + FX + FIRB
 * lawyer + ongoing planner + insurance + recurring tax). Pricing
 * captures a fraction of that LTV so the marketplace economics reflect
 * the value flowing through.
 *
 * 1.75× was chosen because:
 *   - Conservative versus the 5–15× LTV asymmetry — leaves room for
 *     advisors to capture margin
 *   - Stacks cleanly with existing tier multipliers (international 3×,
 *     qualified 2×, standard 1×) without making any combination feel
 *     extortionate
 *   - Matches FIN_NOTEBOOK's stated target
 *
 * Pure module — no DB / Stripe / cookie access. Callers pass the
 * advisor's `specialties` array.
 */

/**
 * The 4 cross-border specialties that justify premium pricing
 * (ASIC RG 246-friendly: pricing reflects effort + risk profile +
 * regulatory complexity, not personal advice quality).
 */
export const CROSS_BORDER_SPECIALTIES: ReadonlyArray<string> = [
  "UK Pension Transfer",
  "FATCA-Aware US Expat Planning",
  "DASP Processing",
  "FIRB Property (Non-Resident)",
];

/**
 * Multiplier applied on top of base + tier multipliers when the
 * advisor sells a lead in a cross-border specialty. Returns 1.0
 * (no premium) for non-cross-border leads.
 */
export const CROSS_BORDER_PRICE_MULTIPLIER = 1.75;

/**
 * Returns true if any of the advisor's specialties is a cross-border
 * specialty. Empty / null / undefined inputs return false.
 */
export function isCrossBorderSpecialty(
  specialties: ReadonlyArray<string> | string[] | null | undefined,
): boolean {
  if (!specialties || specialties.length === 0) return false;
  const set = new Set(CROSS_BORDER_SPECIALTIES);
  return specialties.some((s) => set.has(s));
}

/**
 * Multiplier to apply to the per-lead price. Returns
 * CROSS_BORDER_PRICE_MULTIPLIER when any cross-border specialty is
 * present, else 1.0.
 *
 * Designed to STACK with existing tier multipliers — the caller does:
 *
 *   priceCents = basePriceCents * tierMultiplier * crossBorderLeadMultiplier(specialties)
 */
export function crossBorderLeadMultiplier(
  specialties: ReadonlyArray<string> | string[] | null | undefined,
): number {
  return isCrossBorderSpecialty(specialties) ? CROSS_BORDER_PRICE_MULTIPLIER : 1.0;
}

/**
 * Calculate the final per-lead price for an advisor selling this lead.
 * Composes: base × tier × cross-border premium.
 *
 * `tierMultiplier` is what advisor-enquiry already calculates from
 * leadTier (international 3, qualified 2, standard 1). This function
 * just adds the cross-border premium on top, returning a rounded cents
 * integer.
 */
export function calculateLeadPriceCents(
  basePriceCents: number,
  tierMultiplier: number,
  specialties: ReadonlyArray<string> | string[] | null | undefined,
): number {
  const crossBorder = crossBorderLeadMultiplier(specialties);
  return Math.round(basePriceCents * tierMultiplier * crossBorder);
}

