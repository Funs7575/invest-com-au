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
