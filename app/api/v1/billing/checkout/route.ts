import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
// service-role legitimate: `api_keys` has a service_role-only RLS policy ("Service manage api keys" — no authenticated-role policy), and the row is keyed by `owner_email` not `auth.uid()`, so it can't be reached with the session client. We authenticate the user first via createClient() and only ever touch the row whose owner_email equals the verified user.email. Covered by CLAUDE.md "Two Supabase clients" service-role allow-list (service_role-only policy + cross-key lookup).
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/url";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import {
  API_TIER_CONFIG,
  getPriceIdForApiTier,
  isPurchasableTier,
} from "@/lib/api-tiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api-billing-checkout");

/**
 * POST /api/v1/billing/checkout
 *
 * Start a Stripe Checkout subscription for a Data-API tier upgrade.
 *
 * The caller must be a logged-in user and must own the API key they are
 * upgrading: ownership is proven by matching `api_keys.owner_email` to the
 * authenticated user's email. The chosen tier's Stripe Price ID must be
 * configured (env `STRIPE_PRICE_ID_API_<TIER>`); otherwise we return 400
 * rather than letting Stripe throw a confusing "No such price".
 *
 * On success the subscription's metadata carries everything the webhook
 * handler (`lib/stripe-webhook/handlers/api-key-subscription.ts`) needs to
 * flip `api_keys.tier` once payment completes:
 *   - api_key_subscription = "1"  (discriminator)
 *   - api_key_id                  (the row to upgrade)
 *   - api_tier                    (target tier; reverse-derivable from the
 *                                  price id too, kept for resilience)
 */
const Body = z.object({
  /** Which paid tier to subscribe to. `free`/`enterprise` are rejected. */
  tier: z.enum(["basic", "pro"]),
  /** The `ica_xxxx` prefix identifying which of the caller's keys to upgrade. */
  key_prefix: z
    .string()
    .trim()
    .min(8, "key_prefix must be the full 8-character ica_ prefix")
    .max(8, "key_prefix must be the full 8-character ica_ prefix")
    .regex(/^ica_/, "key_prefix must start with ica_"),
});

export const POST = withValidatedBody(Body, async (_req, body) => {
  try {
    // ── 1. Authenticate ──
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!user.email) {
      return NextResponse.json(
        { error: "Your account needs an email address to subscribe" },
        { status: 400 },
      );
    }
    const ownerEmail = user.email.trim().toLowerCase();

    // ── 2. Tier must be self-serve purchasable (price id configured) ──
    // Read the label before the guard: isPurchasableTier narrows body.tier to
    // `never` in the false branch (its predicate covers every paid tier), yet
    // that branch is reachable at runtime when the tier's Price-ID env is unset.
    const requestedTierLabel = API_TIER_CONFIG[body.tier].label;
    if (!isPurchasableTier(body.tier)) {
      return NextResponse.json(
        {
          error: `The ${requestedTierLabel} tier isn't available for self-serve checkout yet. Contact api@invest.com.au.`,
        },
        { status: 400 },
      );
    }
    const priceId = getPriceIdForApiTier(body.tier);
    if (!priceId) {
      // isPurchasableTier already guards this, but narrow for the type checker.
      return NextResponse.json(
        { error: "Plan not configured" },
        { status: 400 },
      );
    }

    // ── 3. Resolve + verify ownership of the API key ──
    const admin = createAdminClient();
    const { data: apiKey, error: keyError } = await admin
      .from("api_keys")
      .select("id, owner_email, tier, is_active")
      .eq("key_prefix", body.key_prefix)
      .eq("owner_email", ownerEmail)
      .maybeSingle();

    if (keyError) {
      log.error("API key lookup failed", { error: keyError.message });
      return NextResponse.json(
        { error: "Could not verify API key" },
        { status: 500 },
      );
    }
    if (!apiKey) {
      // Don't disclose whether the prefix exists for another owner.
      return NextResponse.json(
        {
          error:
            "No API key with that prefix is registered to your account. Create one at /api/v1/api-keys first.",
        },
        { status: 404 },
      );
    }
    if (!apiKey.is_active) {
      return NextResponse.json(
        { error: "That API key is deactivated and can't be upgraded." },
        { status: 400 },
      );
    }

    // ── 4. Get or create the Stripe customer (mirrors create-checkout) ──
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await getStripe().customers.create(
        {
          email: user.email,
          metadata: { supabase_user_id: user.id },
        },
        { idempotencyKey: `customer_${user.id}` },
      );
      await admin
        .from("profiles")
        .update({
          stripe_customer_id: customer.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .is("stripe_customer_id", null);
      // Re-read so two racing requests converge on the same customer.
      const { data: refreshed } = await admin
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .single();
      customerId = refreshed?.stripe_customer_id ?? customer.id;
    }

    // ── 5. Create the subscription Checkout session ──
    //
    // 10-minute idempotency bucket: rapid double-clicks on the same
    // user+key+tier converge on one Checkout URL, while a deliberate retry
    // after a cancel gets a fresh one. Mirrors app/api/stripe/create-checkout.
    const siteUrl = getSiteUrl();
    const bucket = Math.floor(Date.now() / (10 * 60 * 1000));
    const metadata = {
      api_key_subscription: "1",
      api_key_id: apiKey.id,
      api_tier: body.tier,
      owner_email: ownerEmail,
    } as const;

    const session = await getStripe().checkout.sessions.create(
      {
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${siteUrl}/developers/api/billing?checkout=success`,
        cancel_url: `${siteUrl}/developers/api/billing?checkout=cancelled`,
        // Stamp the same metadata on the subscription so the
        // customer.subscription.{updated,deleted} events can resolve the
        // key without re-reading the checkout session.
        subscription_data: { metadata },
        metadata,
        allow_promotion_codes: true,
      },
      {
        idempotencyKey: `api_subscribe_${apiKey.id}_${body.tier}_${bucket}`,
      },
    );

    if (!session.url) {
      log.error("Checkout session created without URL", {
        sessionId: session.id,
      });
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 },
      );
    }

    log.info("API billing checkout session created", {
      keyId: apiKey.id,
      tier: body.tier,
      sessionId: session.id,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    log.error("Create API billing checkout error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
});
