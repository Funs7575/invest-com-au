/**
 * Self-serve sponsorship tier catalogue — single source of truth.
 *
 * These are the tiers that `/advertise/packages` sells and that
 * `/api/advertise/checkout` charges via Stripe. The `/advertise`
 * marketing landing page reads from here too so prices don't drift.
 *
 * DO NOT confuse with `lib/sponsorship.ts` `TIER_PRICING` — that
 * governs a separate legacy ranking system (featured_partner /
 * editors_pick / deal_of_month) used for placement scoring. This
 * file is about self-serve ad purchase.
 */

export type SelfServeTierId =
  | "featured_partner"
  | "category_sponsor"
  | "deal_of_month";

export interface SelfServeTier {
  id: SelfServeTierId;
  name: string;
  /** Monthly price in AUD dollars (not cents). */
  basePrice: number;
  description: string;
  /** Rough impressions estimate shown on marketing copy. */
  impressions: string;
  /** Whether this tier gets the "Most Popular" highlight. */
  highlight?: boolean;
  /** Bullet-point feature list. */
  includes: string[];
}

export const SELF_SERVE_TIERS: SelfServeTier[] = [
  {
    id: "featured_partner",
    name: "Featured Partner",
    basePrice: 2000,
    description:
      "Maximum visibility across the entire site. Your brand appears first on compare pages, quiz results, and category listings with a Featured Partner badge.",
    impressions: "~80,000/mo",
    highlight: true,
    includes: [
      "Top position across all placements",
      "Featured Partner badge sitewide",
      "Priority in quiz results",
      "Dedicated account manager",
      "Monthly performance reports",
    ],
  },
  {
    id: "category_sponsor",
    name: "Category Sponsor",
    basePrice: 500,
    description:
      "Own a single category vertical (e.g. Best for Beginners, CHESS-Sponsored). Your brand appears as the sponsored pick on one category page with a Sponsor badge.",
    impressions: "~8,000/mo per category",
    includes: [
      "Top position on one category page",
      "Category Sponsor badge",
      "Category-level analytics",
      "Choose your category during checkout",
    ],
  },
  {
    id: "deal_of_month",
    name: "Deal of the Month",
    basePrice: 300,
    description:
      "Promote a time-bound offer in the Current Deals carousel and email newsletter. Best for sign-up bonuses or limited-time rate boosts.",
    impressions: "~20,000/mo",
    includes: [
      "Deals carousel placement",
      "Deal of the Month badge",
      "Newsletter inclusion",
      "Social media mention",
    ],
  },
];

/** Monthly prices in cents — the shape Stripe and the checkout route want. */
export const SELF_SERVE_TIER_PRICES_CENTS: Record<SelfServeTierId, number> =
  Object.fromEntries(
    SELF_SERVE_TIERS.map((t) => [t.id, t.basePrice * 100]),
  ) as Record<SelfServeTierId, number>;

export interface SelfServeDuration {
  months: number;
  label: string;
  /** Fractional discount, e.g. 0.1 = 10% off. */
  discount: number;
}

export const SELF_SERVE_DURATIONS: SelfServeDuration[] = [
  { months: 1, label: "1 month", discount: 0 },
  { months: 3, label: "3 months", discount: 0.1 },
  { months: 6, label: "6 months", discount: 0.2 },
  { months: 12, label: "12 months", discount: 0.3 },
];

export const VALID_SELF_SERVE_DURATIONS = SELF_SERVE_DURATIONS.map(
  (d) => d.months,
);

export const SELF_SERVE_DURATION_DISCOUNTS: Record<number, number> =
  Object.fromEntries(
    SELF_SERVE_DURATIONS.map((d) => [d.months, d.discount]),
  );

/**
 * Total checkout amount in cents for a tier + duration. Returns 0 for
 * an unknown tier/duration so callers can fall through to validation.
 */
export function calculateCheckoutCents(
  tierId: SelfServeTierId,
  months: number,
): number {
  const monthlyCents = SELF_SERVE_TIER_PRICES_CENTS[tierId];
  const discount = SELF_SERVE_DURATION_DISCOUNTS[months];
  if (monthlyCents == null || discount == null) return 0;
  return Math.round(monthlyCents * months * (1 - discount));
}

export function getSelfServeTier(id: string): SelfServeTier | undefined {
  return SELF_SERVE_TIERS.find((t) => t.id === id);
}
