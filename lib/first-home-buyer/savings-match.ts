/**
 * First Home Buyer → high-interest savings handoff (W3.19 lever).
 *
 * Routes the First Home Buyer hub into the curated high-interest savings
 * directory so the cash portion of a deposit (the part that doesn't go into
 * super via FHSS) lands on ranked, FCS-guaranteed accounts instead of being
 * left in a low-rate transaction account.
 */

/**
 * Canonical best-page slug for the savings match. MUST stay in sync with a
 * real category in `lib/best-broker-categories.ts` — a test asserts this so a
 * renamed slug can't silently 404 the hub's "Compare all" link (the failure
 * mode the broker-handoff lever was built to kill).
 */
export const FHB_SAVINGS_CATEGORY_SLUG = "high-interest-savings";

/** Attribution tag so savings clicks from the FHB hub are distinguishable. */
export const FHB_SAVINGS_REF = "first-home-buyer";

/** Pre-attributed high-interest-savings directory URL for the FHB hub. */
export function firstHomeBuyerSavingsUrl(): string {
  const params = new URLSearchParams({ ref: FHB_SAVINGS_REF });
  return `/best/${FHB_SAVINGS_CATEGORY_SLUG}?${params.toString()}`;
}
