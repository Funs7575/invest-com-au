/**
 * Advisor tier catalogue + upgrade math.
 *
 * The advisor portal upgrade flow reads from this file so the
 * tier prices, features, and lead-fee multipliers stay in one
 * place. Admins can override via feature flags + the existing
 * `classifier_config` table; this is the default catalogue.
 *
 * Pure — no DB access. The /api/advisor-auth/tier-upgrade route
 * owns the Stripe checkout + DB write.
 */

export type AdvisorTier = "free" | "growth" | "pro" | "elite";

export interface TierSpec {
  id: AdvisorTier;
  label: string;
  monthlyPriceCents: number; // AUD
  annualPriceCents: number; // AUD — save ~20% on annual
  leadFeeMultiplier: number; // applied to the base lead price
  features: string[];
  sponsoredBoost: number; // 0-20 — blends into ranker
  maxLeadsPerMonth: number | null; // null = uncapped
}

export const TIERS: TierSpec[] = [
  {
    id: "free",
    label: "Free",
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    leadFeeMultiplier: 1.0,
    features: [
      "Listed in the advisor directory",
      "Verified AFSL badge",
      "Weekly performance email",
      "Self-service profile + photo",
    ],
    sponsoredBoost: 0,
    maxLeadsPerMonth: 15,
  },
  {
    id: "growth",
    label: "Growth",
    monthlyPriceCents: 4900,
    annualPriceCents: 47000, // ~20% off 12 months
    leadFeeMultiplier: 0.9,
    features: [
      "Everything in Free",
      "Priority in search results (+5 rank)",
      "Up to 60 leads per month",
      "Health scorecard + weekly coaching tips",
      "10% discount on every lead",
    ],
    sponsoredBoost: 5,
    maxLeadsPerMonth: 60,
  },
  {
    id: "pro",
    label: "Pro",
    monthlyPriceCents: 14900,
    annualPriceCents: 143000,
    leadFeeMultiplier: 0.8,
    features: [
      "Everything in Growth",
      "Prominent ranker boost (+12)",
      "Uncapped leads",
      "Dedicated lead dispute fast-track",
      "20% discount on every lead",
      "Video pinned on profile",
    ],
    sponsoredBoost: 12,
    maxLeadsPerMonth: null,
  },
  {
    id: "elite",
    label: "Elite",
    monthlyPriceCents: 49900,
    annualPriceCents: 479000,
    leadFeeMultiplier: 0.7,
    features: [
      "Everything in Pro",
      "Top placement with 'Featured' badge (+20)",
      "Custom onboarding + quarterly strategy call",
      "Exclusive lead routing for high-value enquiries",
      "30% discount on every lead",
      "White-glove support",
    ],
    sponsoredBoost: 20,
    maxLeadsPerMonth: null,
  },
];

export function getTier(id: string): TierSpec | null {
  return TIERS.find((t) => t.id === id) || null;
}

/**
 * Pure proration calculator — given a user on plan A switching
 * to plan B with N days remaining in the current billing cycle,
 * returns the cents owed today. Negative means we owe the user
 * a credit (downgrade).
 */
export function prorateUpgradeCents(
  fromTier: AdvisorTier,
  toTier: AdvisorTier,
  daysRemaining: number,
  cycleDays: number = 30,
  billing: "monthly" | "annual" = "monthly",
): number {
  if (cycleDays <= 0) return 0;
  const from = getTier(fromTier);
  const to = getTier(toTier);
  if (!from || !to) return 0;

  const priceKey = billing === "annual" ? "annualPriceCents" : "monthlyPriceCents";
  const fromPrice = from[priceKey];
  const toPrice = to[priceKey];

  const unusedFromCredit = Math.round((fromPrice * daysRemaining) / cycleDays);
  const proratedToCharge = Math.round((toPrice * daysRemaining) / cycleDays);
  return proratedToCharge - unusedFromCredit;
}

/**
 * Compare two tiers — return true if `to` is an upgrade from `from`.
 */
export function isUpgrade(fromTier: AdvisorTier, toTier: AdvisorTier): boolean {
  const order: AdvisorTier[] = ["free", "growth", "pro", "elite"];
  return order.indexOf(toTier) > order.indexOf(fromTier);
}
