/**
 * POST /api/firm-portal/branded-profile/portal
 *
 * Opens a Stripe Customer Portal session for the firm's branded-profile
 * billing customer so the firm-admin can update the card or cancel.
 * Returns `{ url }` for client redirect. 404 when no branding customer
 * exists yet (subscribe first); 503 when Stripe is unconfigured.
 *
 * Auth: requires an advisor session AND is_firm_admin.
 * Rate-limit: 20 / minute / IP.
 */

import { NextRequest, NextResponse } from "next/server";

import { createBrandedProfilePortalUrl } from "@/lib/firm-branded-profile";
import { resolveFirmAdminContext } from "@/lib/firm-billing";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("firm-portal:branded-portal");

export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("firm_branded_portal", ipKey(request), {
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

  try {
    const outcome = await createBrandedProfilePortalUrl(context.firmId);
    if ("unavailable" in outcome) {
      const noCustomer = outcome.reason.includes("No branding billing");
      return NextResponse.json(
        {
          error: noCustomer
            ? "No branded-profile subscription yet — subscribe first."
            : "Stripe billing is not configured.",
        },
        { status: noCustomer ? 404 : 503 },
      );
    }
    return NextResponse.json({ url: outcome.url });
  } catch (err) {
    log.error("branded portal session failed", {
      advisorId,
      firmId: context.firmId,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Could not open the billing portal." },
      { status: 500 },
    );
  }
}
