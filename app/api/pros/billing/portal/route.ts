/**
 * POST /api/pros/billing/portal
 *
 * Creates a Stripe Customer Portal session for the calling pro to manage
 * or cancel their subscription. Returns `{ url }` for client redirect.
 *
 * Returns 404 when the pro has no Stripe customer yet (i.e. they have
 * never completed a Checkout) and 503 when Stripe itself is unconfigured.
 *
 * Rate-limit: 20 / minute / IP.
 */

import { NextRequest, NextResponse } from "next/server";

import { createBillingPortalUrl } from "@/lib/pro-subscription/billing";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("pro-subscription:billing");

export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("pros_billing_portal", ipKey(request), {
      max: 20,
      refillPerSec: 0.3,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const outcome = await createBillingPortalUrl(advisorId);
    if ("unavailable" in outcome) {
      // Two reasons: no Stripe configured (503) or no customer yet (404).
      // Surface "no billing account" as 404 so the UI can prompt the pro
      // to subscribe first; everything else is 503.
      const isNoCustomer = outcome.reason.includes("No billing account");
      return NextResponse.json(
        {
          error: isNoCustomer
            ? "No billing account yet — subscribe first to manage your plan."
            : "Subscription billing is not configured.",
        },
        { status: isNoCustomer ? 404 : 503 },
      );
    }
    return NextResponse.json({ url: outcome.url });
  } catch (err) {
    log.error("portal session failed", {
      advisorId,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Could not open billing portal." },
      { status: 500 },
    );
  }
}
