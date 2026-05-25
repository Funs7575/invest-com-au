import Stripe from "stripe";

// Lazy singleton — only initialised when first called at runtime,
// never during Next.js build-time page-data collection.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      typescript: true,
    });
  }
  return _stripe;
}

export const PLANS = {
  monthly: {
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID || "",
    price: 9,
    interval: "month" as const,
    label: "$9/month",
    description: "Billed monthly",
  },
  yearly: {
    priceId: process.env.STRIPE_YEARLY_PRICE_ID || "",
    price: 89,
    interval: "year" as const,
    label: "$89/year",
    description: "Billed annually",
    savings: "Save 18%",
    monthlyEquivalent: "$7.42/month",
  },
  international_standard: {
    priceId: process.env.STRIPE_INTL_STANDARD_PRICE_ID || "",
    price: 12,
    interval: "month" as const,
    label: "$12/month",
    description: "Billed monthly — international",
  },
  international_premium: {
    priceId: process.env.STRIPE_INTL_PREMIUM_PRICE_ID || "",
    price: 119,
    interval: "year" as const,
    label: "$119/year",
    description: "Billed annually — international",
    savings: "Save 17%",
    monthlyEquivalent: "$9.92/month",
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/**
 * API data-access subscription plans (software/data licensing).
 * Prices set via env vars; see lib/api-tiers.ts for the tier config.
 *
 * Required env vars before enabling billing:
 *   STRIPE_API_BASIC_PRICE_ID   — Stripe Price ID for the Basic tier (A$49/mo)
 *   STRIPE_API_PRO_PRICE_ID     — Stripe Price ID for the Pro tier   (A$149/mo)
 */
export const API_PLANS = {
  api_basic: {
    priceId: process.env.STRIPE_API_BASIC_PRICE_ID || "",
    tier: "basic" as const,
    label: "API Basic",
    description: "120 req/min · 10,000 req/day · All endpoints",
    monthlyAud: 49,
  },
  api_pro: {
    priceId: process.env.STRIPE_API_PRO_PRICE_ID || "",
    tier: "pro" as const,
    label: "API Pro",
    description: "600 req/min · 100,000 req/day · All endpoints",
    monthlyAud: 149,
  },
} as const;

export type ApiPlanKey = keyof typeof API_PLANS;
