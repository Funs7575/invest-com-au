import { logger } from "@/lib/logger";

const log = logger("stripe-env-check");

// Centralised env-var integrity check for Stripe price + key wiring.
// Called by /api/pros/billing/subscribe and /pro/research checkout
// surfaces. Pays a single env-var lookup per request and never throws —
// returns a status object the caller can convert to a 503 with a clean
// "missing X, Y" list.
//
// Why: the most common misconfiguration we've seen across Stripe-using
// projects is a redeploy that brings in a new route/tier without the
// matching STRIPE_PRICE_ID_* env var set in Vercel. The user clicks
// "Upgrade", hits the route, sees 503, leaves. This helper makes the
// 503 informative + surfaces the gap in logs immediately.

const warned = new Set<string>();

export interface StripeEnvStatus {
  ok: boolean;
  missing: string[];
}

interface CheckOptions {
  /**
   * The specific env vars this surface depends on. Each route picks
   * the subset it actually needs — checkout for the starter tier
   * needs STRIPE_PRICE_ID_STARTER, not all three.
   */
  required: ReadonlyArray<string>;
}

export function checkStripeEnv(opts: CheckOptions): StripeEnvStatus {
  const baselineRequired = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
  const all = [...baselineRequired, ...opts.required];

  const missing = all.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    const key = missing.sort().join(",");
    if (!warned.has(key)) {
      warned.add(key);
      log.error(
        "Stripe env vars missing — checkout / webhook will fail. See docs/ops/stripe-env-checklist.md",
        { missing },
      );
    }
    return { ok: false, missing };
  }

  return { ok: true, missing: [] };
}
