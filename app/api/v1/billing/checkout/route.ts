/**
 * POST /api/v1/billing/checkout
 *
 * Creates a Stripe Checkout Session so an API key holder can self-serve
 * upgrade from free → basic or pro.
 *
 * Authentication: API key (Bearer ica_xxx) identifies the key to upgrade.
 * The owner's email is used as the Stripe customer email; a new Stripe
 * customer is created if one doesn't already exist for this email.
 *
 * The session metadata carries `type: "api_key_subscription"` plus the
 * `api_key_id` so the webhook handler can upgrade the correct row.
 *
 * AFSL note: this bills for software/data API access only — the same
 * legal model as the existing Pro consumer subscription. Not a financial
 * product, not client money, not product issuance.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY
 *   STRIPE_API_BASIC_PRICE_ID   (A$49/mo)
 *   STRIPE_API_PRO_PRICE_ID     (A$149/mo)
 *   NEXT_PUBLIC_SITE_URL        (success/cancel redirect base)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { getStripe, API_PLANS } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey, API_CORS_HEADERS } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/url";
import { getTierConfig } from "@/lib/api-tiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api-v1-billing-checkout");

const Body = z.object({
  plan: z.enum(["api_basic", "api_pro"]),
});

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
}

export const POST = withValidatedBody(Body, async (request: NextRequest, body) => {
  // ── Auth: require a valid API key ──
  const auth = await validateApiKey(request);
  if (!auth.valid || !auth.apiKey) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 401, headers: API_CORS_HEADERS },
    );
  }

  const apiKey = auth.apiKey;
  const planConfig = API_PLANS[body.plan];

  if (!planConfig.priceId) {
    log.error("API billing price not configured", { plan: body.plan });
    return NextResponse.json(
      { error: `Billing for plan "${body.plan}" is not configured yet. Contact api@invest.com.au.` },
      { status: 503, headers: API_CORS_HEADERS },
    );
  }

  // Prevent downgrading via this route (use cancel + re-subscribe instead)
  const currentTierConfig = getTierConfig(apiKey.tier);
  const targetTierConfig = getTierConfig(planConfig.tier);
  if (
    currentTierConfig.monthlyAudCents > 0 &&
    targetTierConfig.monthlyAudCents <= currentTierConfig.monthlyAudCents &&
    apiKey.tier !== "free"
  ) {
    return NextResponse.json(
      {
        error: `You are already on the ${currentTierConfig.label} tier. To change plans, contact api@invest.com.au.`,
      },
      { status: 400, headers: API_CORS_HEADERS },
    );
  }

  const supabase = createAdminClient();

  // ── Get or create Stripe customer keyed by owner_email ──
  // We store the customer ID on the api_keys row (all keys for the same
  // email share a customer so the billing portal shows all their keys).
  let stripeCustomerId: string | null = (apiKey as unknown as Record<string, unknown>)
    .stripe_customer_id as string | null ?? null;

  if (!stripeCustomerId) {
    // Check whether another key for the same email already has a customer
    const { data: existingKey } = await supabase
      .from("api_keys")
      .select("stripe_customer_id")
      .eq("owner_email", apiKey.owner_email)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    stripeCustomerId = (existingKey as { stripe_customer_id?: string } | null)
      ?.stripe_customer_id ?? null;
  }

  if (!stripeCustomerId) {
    const customer = await getStripe().customers.create(
      {
        email: apiKey.owner_email,
        name: apiKey.owner_name ?? apiKey.company_name ?? undefined,
        metadata: {
          api_key_id: apiKey.id,
          owner_email: apiKey.owner_email,
        },
      },
      { idempotencyKey: `api_customer_${apiKey.owner_email}` },
    );
    stripeCustomerId = customer.id;

    // Persist the customer id on all keys for this email
    await supabase
      .from("api_keys")
      .update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() })
      .eq("owner_email", apiKey.owner_email)
      .is("stripe_customer_id", null);
  }

  // ── Create Checkout Session ──
  const siteUrl = getSiteUrl();
  const bucket = Math.floor(Date.now() / (10 * 60 * 1000)); // 10-min idempotency window

  const session = await getStripe().checkout.sessions.create(
    {
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: `${siteUrl}/api-docs?billing=success&plan=${body.plan}`,
      cancel_url: `${siteUrl}/api-docs?billing=cancelled`,
      subscription_data: {
        metadata: {
          type: "api_key_subscription",
          api_key_id: apiKey.id,
          tier: planConfig.tier,
          owner_email: apiKey.owner_email,
        },
      },
      metadata: {
        type: "api_key_subscription",
        api_key_id: apiKey.id,
        tier: planConfig.tier,
      },
      allow_promotion_codes: true,
    },
    {
      idempotencyKey: `api_checkout_${apiKey.id}_${body.plan}_${bucket}`,
    },
  );

  log.info("API billing checkout created", {
    apiKeyId: apiKey.id,
    plan: body.plan,
    sessionId: session.id,
  });

  return NextResponse.json({ url: session.url }, { headers: API_CORS_HEADERS });
});
