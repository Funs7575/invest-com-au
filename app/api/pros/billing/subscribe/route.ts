/**
 * POST /api/pros/billing/subscribe
 *
 * Starts a Stripe Checkout session to subscribe the calling pro to one of
 * the three paid tiers (starter / growth / scale). Returns `{ url }` for
 * the client to `window.location.href` into. The Checkout session has
 * `mode=subscription` so the resulting `customer.subscription.created`
 * + `checkout.session.completed` webhooks flip the tier.
 *
 * Rate-limit: 20 / minute / IP (the pro side of /pros/billing is itself
 * session-gated so this is mostly anti-runaway protection).
 *
 * Returns 503 when STRIPE_PRICE_ID_<TIER> is not configured — production
 * should set those env vars before flipping the pro_subscriptions_billing
 * flag.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createCheckoutSession } from "@/lib/pro-subscription/billing";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("pro-subscription:billing");

const Body = z.object({
  tier: z.enum(["starter", "growth", "scale"]),
});

export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("pros_billing_subscribe", ipKey(request), {
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

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = Body.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }

  try {
    const outcome = await createCheckoutSession({
      professionalId: advisorId,
      tier: parsed.data.tier,
    });
    if ("unavailable" in outcome) {
      return NextResponse.json(
        { error: "Subscription billing is not configured." },
        { status: 503 },
      );
    }
    return NextResponse.json({ url: outcome.url });
  } catch (err) {
    log.error("subscribe failed", {
      advisorId,
      tier: parsed.data.tier,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Could not start checkout." },
      { status: 500 },
    );
  }
}
