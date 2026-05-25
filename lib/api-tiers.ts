/**
 * Single source of truth for the **Data API** billing tiers (D3).
 *
 * The v1 Financial-Planner API (`app/api/v1/*`) already enforces per-tier
 * rate limits via `api_keys.tier` + `rate_limit_per_minute/day` — see
 * `lib/api-auth.ts`. What was missing was the *billing*: a way for a key
 * owner to pay to move from `free` → `basic/pro/enterprise`. This module
 * owns the tier catalogue (limits, price, Stripe Price-ID env mapping, and
 * the reverse Price-ID → tier lookup the webhook needs).
 *
 * Historically the rate-limit numbers were hardcoded in two places
 * (`app/api/v1/docs/route.ts` and the api-key creation route). New code —
 * the billing page, the checkout route, and the webhook handler — reads
 * from here so the catalogue lives in one spot. (Wiring the two legacy
 * call sites onto this constant is a safe follow-up, intentionally left
 * out of this billing-focused change to avoid touching shared API routes.)
 *
 * Env vars (graceful: a tier with an unset Price ID is treated as
 * "contact sales" / not self-serve-purchasable — the checkout route
 * returns 400 rather than letting Stripe throw "No such price"):
 *   STRIPE_PRICE_ID_API_BASIC       — Basic tier monthly Price ID
 *   STRIPE_PRICE_ID_API_PRO         — Pro tier monthly Price ID
 *   STRIPE_PRICE_ID_API_ENTERPRISE  — Enterprise tier monthly Price ID
 */

/** All tiers, matching the `api_keys.tier` CHECK constraint. */
export const API_TIERS = ["free", "basic", "pro", "enterprise"] as const;

export type ApiTier = (typeof API_TIERS)[number];

/** Paid tiers — `free` is the default and is never purchased. */
export type PaidApiTier = Exclude<ApiTier, "free">;

export interface ApiTierConfig {
  tier: ApiTier;
  label: string;
  /** Monthly price in AUD dollars (0 for free). `null` ⇒ talk-to-sales. */
  priceMonthly: number | null;
  ratePerMinute: number;
  ratePerDay: number;
  /** Short marketing blurb for the plans page. */
  tagline: string;
  /** Bullet-point features for the plans page card. */
  features: string[];
}

/**
 * Tier catalogue. Rate limits mirror the values enforced in
 * `lib/api-auth.ts` / advertised in `/api/v1/docs`. Keep them in sync.
 */
export const API_TIER_CONFIG: Record<ApiTier, ApiTierConfig> = {
  free: {
    tier: "free",
    label: "Free",
    priceMonthly: 0,
    ratePerMinute: 30,
    ratePerDay: 1000,
    tagline: "Kick the tyres — verified broker data, no card required.",
    features: [
      "30 requests / minute",
      "1,000 requests / day",
      "All public broker, compare & docs endpoints",
      "Community support",
    ],
  },
  basic: {
    tier: "basic",
    label: "Basic",
    priceMonthly: 49,
    ratePerMinute: 60,
    ratePerDay: 5000,
    tagline: "For solo planners and small tools shipping to real clients.",
    features: [
      "60 requests / minute",
      "5,000 requests / day",
      "All public endpoints",
      "Email support",
    ],
  },
  pro: {
    tier: "pro",
    label: "Pro",
    priceMonthly: 199,
    ratePerMinute: 120,
    ratePerDay: 25000,
    tagline: "For fintech products and advice firms at scale.",
    features: [
      "120 requests / minute",
      "25,000 requests / day",
      "All public endpoints",
      "Priority email support",
    ],
  },
  enterprise: {
    tier: "enterprise",
    label: "Enterprise",
    // Enterprise stays "contact sales" — bespoke limits + agreement.
    priceMonthly: null,
    ratePerMinute: 300,
    ratePerDay: 100000,
    tagline: "Bulk exports, custom limits, and an SLA.",
    features: [
      "300 requests / minute",
      "100,000 requests / day",
      "Custom endpoints & bulk exports",
      "Dedicated support + SLA",
    ],
  },
};

/** Rate-limit pair persisted onto the `api_keys` row for a given tier. */
export function rateLimitsForTier(tier: ApiTier): {
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
} {
  const cfg = API_TIER_CONFIG[tier];
  return {
    rate_limit_per_minute: cfg.ratePerMinute,
    rate_limit_per_day: cfg.ratePerDay,
  };
}

/** Type guard: is `value` one of the known tiers. */
export function isApiTier(value: unknown): value is ApiTier {
  return typeof value === "string" && (API_TIERS as readonly string[]).includes(value);
}

/**
 * Is this tier self-serve-purchasable through Stripe Checkout right now?
 * A tier is purchasable only when it has a dollar price *and* its Stripe
 * Price ID env var is configured.
 */
export function isPurchasableTier(tier: ApiTier): tier is PaidApiTier {
  const cfg = API_TIER_CONFIG[tier];
  return cfg.priceMonthly != null && cfg.priceMonthly > 0 && getPriceIdForApiTier(tier) != null;
}

/**
 * Resolve the configured Stripe Price ID for a paid tier, or `null` if the
 * env var is unset. Callers must surface a 400/503 in the `null` case
 * rather than calling Stripe with an empty price.
 */
export function getPriceIdForApiTier(tier: ApiTier): string | null {
  switch (tier) {
    case "basic":
      return process.env.STRIPE_PRICE_ID_API_BASIC || null;
    case "pro":
      return process.env.STRIPE_PRICE_ID_API_PRO || null;
    case "enterprise":
      return process.env.STRIPE_PRICE_ID_API_ENTERPRISE || null;
    case "free":
      return null;
  }
}

/**
 * Reverse lookup used by the webhook handler: given a Stripe Price ID from
 * a subscription line item, return which API tier it represents. Returns
 * `null` when no env var matches — the handler then leaves the key's tier
 * untouched so a misconfigured env can't bump random keys to a paid tier.
 */
export function getApiTierForPriceId(priceId: string | null | undefined): PaidApiTier | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_API_BASIC) return "basic";
  if (priceId === process.env.STRIPE_PRICE_ID_API_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_ID_API_ENTERPRISE) return "enterprise";
  return null;
}
