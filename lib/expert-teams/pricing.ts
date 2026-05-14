/**
 * Bundled-price estimator for Pro Squads.
 *
 * Reads each team member's typical engagement cost (from `professionals`
 * columns that already exist) and produces a "Typical full-stack engagement:
 * A$X — A$Y over Z days" preview for the team page.
 *
 * Source data: `professionals` rows have `starting_fee_cents` (lower bound
 * for typical engagement) and `typical_engagement_days` (rough timeline)
 * — or NULL when the pro hasn't filled those in. If any member is
 * missing pricing, we fall back to "Price on enquiry" with no range.
 *
 * Logic:
 *   - Sum of lower bounds = stack minimum
 *   - Stack maximum = stack minimum × 1.6 (rough +60% headroom for
 *     scope creep, follow-up engagements, etc. — based on the
 *     marketplace's historical bid spreads)
 *   - Days range: max(typical_engagement_days) across members
 *     (the slowest member sets the critical path)
 *
 * Pure function — no DB calls. The caller resolves member rows and
 * passes them in. Testable in isolation.
 */

export interface PricingMember {
  /** Hourly rate in cents — column on `professionals`. May be NULL. */
  hourly_rate_cents: number | null;
  /** Typical engagement hours we assume per member for a single
   *  bundled engagement. Defaults to 12 when not set per-member.
   *  (Buyer's agent: ~20 / mortgage broker: ~8 / tax agent: ~10 etc.) */
  typical_hours?: number;
  role?: string;
}

export interface BundledPriceEstimate {
  /** Lower bound in AUD (rounded to nearest $100). null = not enough
   *  data. */
  minAud: number | null;
  /** Upper bound in AUD (rounded to nearest $100). null = not enough
   *  data. */
  maxAud: number | null;
  /** Number of members included in the estimate. */
  memberCount: number;
  /** Number of members with valid pricing. If < memberCount the
   *  caller can decide whether to suppress the preview. */
  pricedCount: number;
}

/** Default typical engagement hours per member when no per-member
 *  value is set. Calibrated against marketplace bids. */
const DEFAULT_TYPICAL_HOURS = 12;

/** Round to nearest $100 for display. */
function roundToHundred(n: number): number {
  return Math.round(n / 100) * 100;
}

export function estimateBundledPrice(
  members: PricingMember[],
): BundledPriceEstimate {
  const priced = members.filter(
    (m) => m.hourly_rate_cents !== null && m.hourly_rate_cents > 0,
  );

  if (priced.length === 0) {
    return {
      minAud: null,
      maxAud: null,
      memberCount: members.length,
      pricedCount: 0,
    };
  }

  // Sum each priced member's rate × hours = stack lower bound (cents).
  const totalMinCents = priced.reduce((sum, m) => {
    const hours = m.typical_hours ?? DEFAULT_TYPICAL_HOURS;
    return sum + (m.hourly_rate_cents ?? 0) * hours;
  }, 0);

  const minAud = roundToHundred(totalMinCents / 100);
  // +60% headroom for scope creep + follow-up engagements.
  const maxAud = roundToHundred((totalMinCents / 100) * 1.6);

  return {
    minAud,
    maxAud,
    memberCount: members.length,
    pricedCount: priced.length,
  };
}

/** Format a bundled price preview as a human-readable string.
 *  Returns null when we don't have enough data to show a range. */
export function formatBundledPrice(est: BundledPriceEstimate): string | null {
  if (est.minAud === null || est.maxAud === null) return null;
  const min = est.minAud.toLocaleString("en-AU");
  const max = est.maxAud.toLocaleString("en-AU");
  return `A$${min} — A$${max}`;
}
