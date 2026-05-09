/**
 * Advisor lead-credit packs — single source of truth.
 *
 * Until this module landed, the `PACKS` dictionary and the human-facing
 * pack catalogue were duplicated between
 *   - `app/api/advisor-auth/topup/route.ts` (Stripe pricing source)
 *   - `app/advisor-portal/BillingTab.tsx`   (BillingTab UI source)
 *
 * Drift between the two would make the price the advisor saw differ
 * from the price Stripe actually charged. CLAUDE.md "Single sources of
 * truth — don't duplicate" calls this out explicitly.
 *
 * Both consumers now import from here.
 */

export type CreditPackSlug = "starter" | "growth" | "scale" | "featured_monthly" | "expert_article";

export interface CreditPack {
  slug: CreditPackSlug;
  /** Pack-card heading. */
  name: string;
  /** Number of leads bundled (0 for non-lead packs like Featured / Article). */
  leads: number;
  /** Total cost in cents (AUD). */
  priceCents: number;
  /** Per-lead cost in cents — used by the topup webhook to set lead_price_cents. */
  perLeadCents: number;
  /** Pack-card subtitle. */
  description: string;
  /** Optional badge ("Most Popular", "Best Value"). */
  badge?: "Most Popular" | "Best Value";
  /** True for top-ups that add credit; false for one-off purchases (Featured, Article). */
  isCredit: boolean;
}

/** Lead-credit packs shown in the BillingTab grid. */
export const LEAD_CREDIT_PACKS: readonly CreditPack[] = [
  {
    slug: "starter",
    name: "Starter",
    leads: 5,
    priceCents: 19900,
    perLeadCents: 3980,
    description: "Perfect for testing",
    isCredit: true,
  },
  {
    slug: "growth",
    name: "Growth",
    leads: 12,
    priceCents: 44900,
    perLeadCents: 3742,
    description: "Best for most advisors",
    badge: "Most Popular",
    isCredit: true,
  },
  {
    slug: "scale",
    name: "Scale",
    leads: 25,
    priceCents: 79900,
    perLeadCents: 3196,
    description: "20% savings per lead",
    badge: "Best Value",
    isCredit: true,
  },
];

/** Add-on packs — featured placement + expert article — not credit. */
export const ADDON_PACKS: readonly CreditPack[] = [
  {
    slug: "featured_monthly",
    name: "Featured Advisor — 1 Month",
    leads: 0,
    priceCents: 14900,
    perLeadCents: 0,
    description: "Priority listing, featured badge, gold border for 30 days",
    isCredit: false,
  },
  {
    slug: "expert_article",
    name: "Expert Article Publication",
    leads: 0,
    priceCents: 29900,
    perLeadCents: 0,
    description: "SEO-optimised expert article published on invest.com.au",
    isCredit: false,
  },
];

const ALL_PACKS: ReadonlyMap<CreditPackSlug, CreditPack> = new Map(
  [...LEAD_CREDIT_PACKS, ...ADDON_PACKS].map((p) => [p.slug, p]),
);

export function getPack(slug: string | undefined | null): CreditPack | null {
  if (!slug) return null;
  return ALL_PACKS.get(slug as CreditPackSlug) ?? null;
}
