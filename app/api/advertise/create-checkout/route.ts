import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";
import { z } from "zod";

const CreateCheckoutBody = z.object({
  pricing_id: z.number().int().positive(),
  broker_slug: z.string().regex(/^[a-z0-9-]{2,80}$/),
  starts_at: z.string().min(1),
  email: z.string().email(),
  contact_name: z.string().optional(),
});

const log = logger("advertise-checkout");

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/advertise/create-checkout
 *
 * Creates a Stripe Checkout Session for a sponsored placement
 * booking. The request is unauthenticated by design — the buyer is
 * likely on the public /advertise/featured-placement page. Attribution
 * and contact details go into the Stripe metadata + the eventual
 * sponsored_placement_bookings row, not a user session.
 *
 * Body:
 *   { pricing_id: number, broker_slug: string, starts_at: ISO-date,
 *     email: string, broker_name: string }
 *
 * Response:
 *   { url: string } — redirect the browser to this Stripe-hosted
 *   checkout page. On success Stripe calls our webhook which creates
 *   the booking row.
 *
 * Validation:
 *   - pricing row must exist and be active
 *   - starts_at must be >= today and within 6 months
 *   - broker must be known by slug
 *   - capacity is CHECKED (not locked) at checkout creation — the
 *     final insert-into-bookings is guarded by a DB constraint in
 *     the webhook path.
 */
export async function POST(req: NextRequest) {
  if (!(await isAllowed("advertise_checkout", ipKey(req), { max: 5, refillPerSec: 0.05 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateCheckoutBody.safeParse(rawBody);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const fieldMsgs: Record<string, string> = {
      pricing_id: "Invalid pricing_id",
      broker_slug: "Invalid broker_slug",
      email: "Invalid email",
      starts_at: "Invalid starts_at",
    };
    return NextResponse.json(
      { error: fieldMsgs[String(field)] ?? "Invalid request body" },
      { status: 400 },
    );
  }
  const {
    pricing_id: pricingId,
    broker_slug: brokerSlug,
    starts_at: startsAt,
    email,
    contact_name: contactName,
  } = parsed.data;

  const startMs = Date.parse(startsAt);
  if (Number.isNaN(startMs)) {
    return NextResponse.json({ error: "Invalid starts_at" }, { status: 400 });
  }
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const maxMs = todayMs + 180 * 24 * 60 * 60 * 1000;
  if (startMs < todayMs - 24 * 60 * 60 * 1000 || startMs > maxMs) {
    return NextResponse.json(
      { error: "Start date must be within the next 6 months" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: pricing } = await supabase
    .from("sponsored_placement_pricing")
    .select("id, tier, duration_days, amount_cents, currency, stripe_price_id, max_concurrent, description, active")
    .eq("id", pricingId)
    .eq("active", true)
    .maybeSingle();
  if (!pricing) {
    return NextResponse.json({ error: "Pricing tier not found" }, { status: 404 });
  }

  const { data: broker } = await supabase
    .from("brokers")
    .select("id, name, slug")
    .eq("slug", brokerSlug)
    .maybeSingle();
  if (!broker) {
    return NextResponse.json({ error: "Broker not found" }, { status: 404 });
  }

  const endsAt = new Date(
    startMs + pricing.duration_days * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Capacity check: count active + scheduled bookings for this tier
  // that overlap the requested window. Non-blocking sanity check —
  // the final guard lives in the webhook.
  const { data: overlapping } = await supabase
    .from("sponsored_placement_bookings")
    .select("id")
    .eq("tier", pricing.tier)
    .in("status", ["scheduled", "active"])
    .lte("starts_at", endsAt)
    .gte("ends_at", new Date(startMs).toISOString());

  if ((overlapping?.length ?? 0) >= pricing.max_concurrent) {
    return NextResponse.json(
      {
        error: `That tier is fully booked for the chosen window. Try a different start date or tier.`,
      },
      { status: 409 },
    );
  }

  const stripe = getStripe();

  const siteUrl = getSiteUrl();
  // Prefer a pre-created Stripe price id. Fall back to an inline
  // price_data so the seed pricing works out of the box even before
  // an ops engineer has created matching prices in Stripe.
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
    pricing.stripe_price_id
      ? [{ price: pricing.stripe_price_id, quantity: 1 }]
      : [
          {
            quantity: 1,
            price_data: {
              currency: (pricing.currency || "AUD").toLowerCase(),
              unit_amount: pricing.amount_cents,
              product_data: {
                name: `${prettyTier(pricing.tier)} — ${pricing.duration_days} days — ${broker.name}`,
                description:
                  pricing.description ??
                  `Sponsored placement for ${broker.name} on invest.com.au.`,
              },
            },
          },
        ];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items,
      success_url: `${siteUrl}/advertise/featured-placement/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/advertise/featured-placement?cancelled=1`,
      allow_promotion_codes: true,
      // Everything needed to reconstruct the booking is on metadata so
      // the webhook can create the DB row even if the browser never
      // hits the success page.
      metadata: {
        kind: "sponsored_placement",
        pricing_id: String(pricing.id),
        broker_id: String(broker.id),
        broker_slug: broker.slug,
        broker_name: broker.name,
        tier: pricing.tier,
        duration_days: String(pricing.duration_days),
        starts_at: new Date(startMs).toISOString(),
        ends_at: endsAt,
        contact_email: email,
        contact_name: contactName || "",
      },
      invoice_creation: { enabled: true },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    log.error("checkout_session_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to start checkout" },
      { status: 500 },
    );
  }
}

function prettyTier(t: string): string {
  return t
    .split("_")
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}
