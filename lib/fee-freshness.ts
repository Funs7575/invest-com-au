/**
 * Fee-freshness model.
 *
 * Converts a broker's `fee_verified_date` (last human verification) into
 * a four-state freshness tier we can render consistently across the
 * site and flag in admin dashboards.
 *
 *   fresh    — verified within FRESH_DAYS (default 30). Green.
 *   current  — verified within STALE_DAYS. Amber.
 *   stale    — verified outside STALE_DAYS (default 90). Red.
 *   unknown  — no fee_verified_date at all. Red.
 *
 * `fee_verified_date` beats `fee_last_checked`: bots can say "I looked
 * at the page" but only a human can say "these are the correct fees."
 * The reader-facing badge uses this tier so readers see real trust.
 */

export type FeeFreshnessTier = "fresh" | "current" | "stale" | "unknown";

const FRESH_DAYS = 30;
const STALE_DAYS = 90;

export interface FeeFreshness {
  tier: FeeFreshnessTier;
  /** Days since the fee was last human-verified; null if never verified. */
  ageDays: number | null;
  /** Short human label ready for display, e.g. "Fees verified 12 days ago". */
  label: string;
  /** Colour classes appropriate for the tier (text + bg + border + dot). */
  classes: {
    text: string;
    bg: string;
    border: string;
    dot: string;
  };
}

function classesFor(tier: FeeFreshnessTier) {
  if (tier === "fresh") {
    return {
      text: "text-emerald-800",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
    };
  }
  if (tier === "current") {
    return {
      text: "text-amber-800",
      bg: "bg-amber-50",
      border: "border-amber-200",
      dot: "bg-amber-500",
    };
  }
  return {
    text: "text-rose-800",
    bg: "bg-rose-50",
    border: "border-rose-200",
    dot: "bg-rose-500",
  };
}

export function computeFeeFreshness(
  verifiedDate: string | null | undefined,
  now: Date = new Date(),
): FeeFreshness {
  if (!verifiedDate) {
    return {
      tier: "unknown",
      ageDays: null,
      label: "Fees not yet verified",
      classes: classesFor("unknown"),
    };
  }
  const t = new Date(verifiedDate).getTime();
  if (Number.isNaN(t)) {
    return {
      tier: "unknown",
      ageDays: null,
      label: "Fees not yet verified",
      classes: classesFor("unknown"),
    };
  }
  const diffMs = now.getTime() - t;
  const ageDays = Math.max(0, Math.floor(diffMs / 86_400_000));

  let tier: FeeFreshnessTier;
  if (ageDays <= FRESH_DAYS) tier = "fresh";
  else if (ageDays <= STALE_DAYS) tier = "current";
  else tier = "stale";

  let label: string;
  if (ageDays === 0) label = "Fees verified today";
  else if (ageDays === 1) label = "Fees verified yesterday";
  else if (ageDays < 30) label = `Fees verified ${ageDays} days ago`;
  else {
    const months = Math.round(ageDays / 30);
    label =
      months === 1
        ? "Fees verified a month ago"
        : `Fees verified ${months} months ago`;
  }

  return { tier, ageDays, label, classes: classesFor(tier) };
}

/** Cut-off used by admin flags. Anything beyond this needs re-verification. */
export const FEE_STALE_DAYS = STALE_DAYS;
