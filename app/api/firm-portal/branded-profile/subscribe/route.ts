/**
 * POST /api/firm-portal/branded-profile/subscribe
 *
 * Starts a Stripe Checkout session (mode=subscription) for a firm's
 * branded-profile tier (enhanced /firm/[slug]). Returns `{ url }` for the
 * client to redirect into. The resulting customer.subscription.* webhooks
 * flip advisor_firms.branded_profile_active (see
 * lib/stripe-webhook/handlers/firm-subscription.ts).
 *
 * Auth: requires an advisor session AND is_firm_admin (resolveFirmAdminContext).
 * Rate-limit: 20 / minute / IP.
 * Returns 503 when STRIPE_FIRM_BRANDED_PRICE_ID is not configured.
 */

import { NextRequest, NextResponse } from "next/server";

import {
  createBrandedProfileCheckout,
  BRANDED_PROFILE_PRICE_ENV,
} from "@/lib/firm-branded-profile";
import { resolveFirmAdminContext } from "@/lib/firm-billing";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { checkStripeEnv } from "@/lib/stripe-env-check";
import { logger } from "@/lib/logger";

const log = logger("firm-portal:branded-subscribe");

export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("firm_branded_subscribe", ipKey(request), {
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

  const context = await resolveFirmAdminContext(advisorId);
  if (!context) {
    return NextResponse.json(
      { error: "Firm admin access required." },
      { status: 403 },
    );
  }

  // Surface the missing env var up-front so first-time setup doesn't
  // stutter through 503 → set var → redeploy → 503 again.
  const envStatus = checkStripeEnv({ required: [BRANDED_PROFILE_PRICE_ENV] });
  if (!envStatus.ok) {
    return NextResponse.json(
      {
        error: "Branded-profile billing is not configured.",
        missing: envStatus.missing,
      },
      { status: 503 },
    );
  }

  try {
    const outcome = await createBrandedProfileCheckout({
      firmId: context.firmId,
    });
    if ("unavailable" in outcome) {
      // "already active" is a 409 (manage via portal); config gaps are 503.
      const alreadyActive = outcome.reason
        .toLowerCase()
        .includes("already active");
      return NextResponse.json(
        {
          error: alreadyActive
            ? "Your branded profile is already active. Manage it from the billing portal."
            : "Branded-profile billing is not configured.",
        },
        { status: alreadyActive ? 409 : 503 },
      );
    }
    return NextResponse.json({ url: outcome.url });
  } catch (err) {
    log.error("branded subscribe failed", {
      advisorId,
      firmId: context.firmId,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Could not start checkout." },
      { status: 500 },
    );
  }
}
