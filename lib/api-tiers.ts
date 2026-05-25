/**
 * API tier configuration for the Invest.com.au public Data API.
 *
 * Each tier carries:
 *  - `rateLimitPerMinute`   — requests/minute window (enforced by validateApiKey)
 *  - `rateLimitPerDay`      — requests/day  window (enforced by validateApiKey)
 *  - `allowedEndpoints`     — explicit allow-list (`["*"]` = all endpoints)
 *  - `label`                — human-readable name for UI/email
 *  - `priceId`              — Stripe Price ID (from env var; empty string = not yet configured)
 *  - `monthlyAud`           — display price in AUD (0 = free)
 *
 * Tier hierarchy: free < basic < pro < enterprise.
 *
 * AFSL note: this is software/data licensing — the same legal model as the
 * existing Pro consumer subscription. It is NOT a financial product, not
 * client money, and not product issuance.
 *
 * To set up billing in Stripe:
 *   1. Create two recurring prices in your Stripe dashboard.
 *   2. Set STRIPE_API_BASIC_PRICE_ID and STRIPE_API_PRO_PRICE_ID in Vercel env vars.
 *   3. Add the price IDs to the Stripe webhook's watched events so
 *      customer.subscription.{created,updated,deleted} fires for them.
 */

export type ApiTier = "free" | "basic" | "pro" | "enterprise";

export interface ApiTierConfig {
  tier: ApiTier;
  label: string;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  /** `["*"]` grants access to all v1 endpoints. */
  allowedEndpoints: string[];
  /** Stripe Price ID. Empty string = not configured (billing disabled for this tier). */
  priceId: string;
  /** Display price in AUD cents/month. 0 = free. */
  monthlyAudCents: number;
}

export const API_TIER_CONFIGS: Record<ApiTier, ApiTierConfig> = {
  free: {
    tier: "free",
    label: "Free",
    rateLimitPerMinute: 30,
    rateLimitPerDay: 1_000,
    allowedEndpoints: [
      "/api/v1/brokers",
      "/api/v1/brokers/:slug",
      "/api/v1/advisors",
      "/api/v1/advisors/:slug",
    ],
    priceId: "",
    monthlyAudCents: 0,
  },
  basic: {
    tier: "basic",
    label: "Basic",
    rateLimitPerMinute: 120,
    rateLimitPerDay: 10_000,
    allowedEndpoints: ["*"],
    priceId: process.env.STRIPE_API_BASIC_PRICE_ID ?? "",
    monthlyAudCents: 4900, // A$49/month
  },
  pro: {
    tier: "pro",
    label: "Pro",
    rateLimitPerMinute: 600,
    rateLimitPerDay: 100_000,
    allowedEndpoints: ["*"],
    priceId: process.env.STRIPE_API_PRO_PRICE_ID ?? "",
    monthlyAudCents: 14900, // A$149/month
  },
  enterprise: {
    tier: "enterprise",
    label: "Enterprise",
    rateLimitPerMinute: 6_000,
    rateLimitPerDay: 5_000_000,
    allowedEndpoints: ["*"],
    priceId: "", // enterprise is provisioned manually
    monthlyAudCents: 0,
  },
} as const;

/** Convenience: look up a tier config, falling back to free if unknown. */
export function getTierConfig(tier: string): ApiTierConfig {
  const t = tier as ApiTier;
  return API_TIER_CONFIGS[t] ?? API_TIER_CONFIGS.free;
}

/**
 * Resolve a Stripe Price ID back to the tier it belongs to.
 * Returns null if no tier claims that price (e.g. unrecognised or enterprise).
 */
export function tierFromPriceId(priceId: string): ApiTier | null {
  for (const cfg of Object.values(API_TIER_CONFIGS)) {
    if (cfg.priceId && cfg.priceId === priceId) return cfg.tier;
  }
  return null;
}

/**
 * Check whether `endpoint` is permitted for the given allowed-endpoints list.
 *
 * Rules:
 *  - `["*"]` permits every endpoint.
 *  - Otherwise the list is checked with exact or wildcard suffix match:
 *    e.g. `/api/v1/brokers/:slug` matches `/api/v1/brokers/commsec`.
 */
export function isEndpointAllowed(
  endpoint: string,
  allowedEndpoints: string[],
): boolean {
  if (allowedEndpoints.includes("*")) return true;
  for (const pattern of allowedEndpoints) {
    if (pattern === endpoint) return true;
    // `:slug` wildcard — strip the param segment and check the prefix
    if (pattern.includes(":")) {
      const prefix = pattern.slice(0, pattern.lastIndexOf("/"));
      if (endpoint.startsWith(prefix + "/")) return true;
    }
  }
  return false;
}
