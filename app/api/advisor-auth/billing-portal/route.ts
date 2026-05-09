/**
 * POST /api/advisor-auth/billing-portal
 *
 * Creates a Stripe Customer Portal session for the authenticated
 * advisor and returns the URL. The advisor uses this to:
 *   - update their payment method on file
 *   - download invoices
 *   - manage / cancel their subscription tier
 *
 * Mirrors `app/api/stripe/create-portal/route.ts` but reads
 * `professionals.stripe_customer_id` (not the consumer-side
 * `profiles.stripe_customer_id`). Auth via requireAdvisorSession.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { isRateLimited } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";

const log = logger("advisor-billing-portal");

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (await isRateLimited(`advisor_portal:${ip}`, 5, 60)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("stripe_customer_id")
    .eq("id", advisorId)
    .maybeSingle();

  if (!pro?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No Stripe customer on file — make a top-up first." },
      { status: 404 },
    );
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      { error: "Payment system not configured." },
      { status: 503 },
    );
  }

  const siteUrl = getSiteUrl();

  try {
    const session = await stripe.billingPortal.sessions.create(
      {
        customer: pro.stripe_customer_id as string,
        return_url: `${siteUrl}/advisor-portal?tab=billing`,
      },
      {
        // Idempotency: same advisor + minute window = same session.
        idempotencyKey: `advisor_portal_${advisorId}_${Math.floor(Date.now() / 60000)}`,
      },
    );
    return NextResponse.json({ url: session.url });
  } catch (err) {
    log.error("Billing portal session create failed", {
      error: err instanceof Error ? err.message : String(err),
      advisorId,
    });
    return NextResponse.json(
      { error: "Failed to open billing portal." },
      { status: 500 },
    );
  }
}
