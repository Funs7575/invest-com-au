import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isFlagEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/url";
import { isRateLimited } from "@/lib/rate-limit";

const log = logger("listing-checkout");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Permissive by design — the per-field guards below produce the precise,
// field-specific 400 messages the clients/tests rely on (listing_id /
// plan_id / contact_email). Fields are accepted as unknown so the schema
// never rejects ahead of those guards (e.g. listing_id: "three" must reach
// the "must be a number" guard, not a generic schema error), while the body
// is still consumed through a schema for the validation contract.
const BodySchema = z
  .object({
    listing_id: z.unknown(),
    plan_id: z.unknown(),
    contact_email: z.unknown(),
  })
  .partial()
  .passthrough();

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`listings_checkout:${ip}`, 5, 60)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    // Launch-ops kill switch: flip `stripe_checkout` off in
    // /admin/automation/flags to pause new Stripe checkout sessions
    // (webhook backlog, dispute spike, pricing bug). See
    // docs/ops/launch-ops-plan.md §4.
    if (!(await isFlagEnabled("stripe_checkout"))) {
      return NextResponse.json({ error: "temporarily_unavailable" }, { status: 503 });
    }

    let raw: unknown;

    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const parsed = BodySchema.safeParse(raw);
    const body: z.infer<typeof BodySchema> = parsed.success ? parsed.data : {};

    // Validate required fields
    if (!body.listing_id || typeof body.listing_id !== "number") {
      return NextResponse.json(
        { error: "listing_id is required and must be a number." },
        { status: 400 }
      );
    }

    if (!body.plan_id || typeof body.plan_id !== "number") {
      return NextResponse.json(
        { error: "plan_id is required and must be a number." },
        { status: 400 }
      );
    }

    if (
      !body.contact_email ||
      typeof body.contact_email !== "string" ||
      !EMAIL_REGEX.test(body.contact_email.trim())
    ) {
      return NextResponse.json(
        { error: "A valid contact_email is required." },
        { status: 400 }
      );
    }

    const contactEmail = body.contact_email.trim().toLowerCase();
    const admin = createAdminClient();

    // Look up listing plan
    const { data: plan, error: planError } = await admin
      .from("listing_plans")
      .select("id, plan_name, price_cents_monthly, features, active")
      .eq("id", body.plan_id)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Listing plan not found." },
        { status: 404 }
      );
    }

    if (!plan.active) {
      return NextResponse.json(
        { error: "This plan is no longer available." },
        { status: 410 }
      );
    }

    // Verify listing exists
    const { data: listing, error: listingError } = await admin
      .from("investment_listings")
      .select("id, title, status")
      .eq("id", body.listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 }
      );
    }

    // Get or create Stripe customer by email
    const stripe = getStripe();
    const existingCustomers = await stripe.customers.list({
      email: contactEmail,
      limit: 1,
    });

    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: contactEmail,
        metadata: { source: "listing_checkout" },
      });
      customerId = customer.id;
    }

    // Create Checkout Session (one-time payment)
    const siteUrl = getSiteUrl();

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: plan.price_cents_monthly,
            product_data: {
              name: `${plan.plan_name} Listing Plan`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "listing_payment",
        listing_id: String(body.listing_id),
        plan_id: String(body.plan_id),
        contact_email: contactEmail,
      },
      success_url: `${siteUrl}/invest/list?payment=success`,
      cancel_url: `${siteUrl}/invest/list?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    log.error("Listing checkout error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
