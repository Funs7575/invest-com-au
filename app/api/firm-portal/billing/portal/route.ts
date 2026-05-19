// POST /api/firm-portal/billing/portal
//
// Creates a Stripe Customer Portal session for the firm-admin's Stripe
// customer (the "single firm payment method" per W4.23). Returns { url }
// for client redirect. Returns 404 if no firm member has a Stripe
// customer yet (the firm admin must subscribe / top-up first to mint
// one) and 503 if Stripe itself is unconfigured.
//
// Auth: requires advisor session + is_firm_admin. Returns 403 otherwise.
//
// Rate-limit: 20 / minute / IP.

import { NextRequest, NextResponse } from "next/server";

import { createBillingPortalUrl } from "@/lib/pro-subscription/billing";
import { getFirmBillingSummary, resolveFirmAdminContext } from "@/lib/firm-billing";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("firm-portal:billing-portal");

export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("firm_portal_billing_portal", ipKey(request), {
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

  const summary = await getFirmBillingSummary(context.firmId);
  if (!summary) {
    return NextResponse.json({ error: "Firm not found." }, { status: 404 });
  }
  if (!summary.paymentMethod) {
    return NextResponse.json(
      {
        error:
          "No firm payment method yet — top up at least one member to enable the firm portal.",
      },
      { status: 404 },
    );
  }

  try {
    const outcome = await createBillingPortalUrl(summary.paymentMethod.advisorId);
    if ("unavailable" in outcome) {
      const isNoCustomer = outcome.reason.includes("No billing account");
      return NextResponse.json(
        {
          error: isNoCustomer
            ? "No firm payment method yet — top up at least one member first."
            : "Stripe billing is not configured.",
        },
        { status: isNoCustomer ? 404 : 503 },
      );
    }
    return NextResponse.json({ url: outcome.url });
  } catch (err) {
    log.error("portal session failed", {
      advisorId,
      firmId: context.firmId,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Could not open firm billing portal." },
      { status: 500 },
    );
  }
}
