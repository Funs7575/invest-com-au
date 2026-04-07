import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/url";

const log = logger("listing-renew");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RenewBody {
  listing_id: number;
  plan_id: number;
  contact_email: string;
}

/**
 * POST /api/listings/renew
 * Creates a Stripe Checkout session for renewing a listing.
 * On webhook completion the listing's expires_at is extended by the plan duration.
 */
export async function POST(request: NextRequest) {
  try {
    let body: Partial<RenewBody>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    // Validate required fields
    if (!body.listing_id || typeof body.listing_id !== "number") {
      return NextResponse.json(
        { error: "listing_id is required and must be a number." },
        { status: 400 },
      );
    }

    if (!body.plan_id || typeof body.plan_id !== "number") {
      return NextResponse.json(
        { error: "plan_id is required and must be a number." },
        { status: 400 },
      );
    }

    if (
      !body.contact_email ||
      typeof body.contact_email !== "string" ||
      !EMAIL_REGEX.test(body.contact_email.trim())
    ) {
      return NextResponse.json(
        { error: "A valid contact_email is required." },
        { status: 400 },
      );
    }

    const contactEmail = body.contact_email.trim().toLowerCase();
    const admin = createAdminClient();

    // Verify listing exists and contact_email matches
    const { data: listing, error: listingError } = await admin
      .from("investment_listings")
      .select("id, title, contact_email, status, expires_at")
      .eq("id", body.listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 },
      );
    }

    if (listing.contact_email?.toLowerCase() !== contactEmail) {
      return NextResponse.json(
        { error: "You are not authorised to renew this listing." },
        { status: 403 },
      );
    }

    // Look up the listing plan
    const { data: plan, error: planError } = await admin
      .from("listing_plans")
      .select("id, plan_name, price_cents_monthly, duration_days, active")
      .eq("id", body.plan_id)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Listing plan not found." },
        { status: 404 },
      );
    }

    if (!plan.active) {
      return NextResponse.json(
        { error: "This plan is no longer available." },
        { status: 410 },
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
        metadata: { source: "listing_renewal" },
      });
      customerId = customer.id;
    }

    // Create Checkout Session (one-time payment for renewal)
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
              name: `Listing Renewal — ${plan.plan_name}`,
              description: `Renew "${listing.title}" for ${plan.duration_days ?? 30} days`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "listing_renewal",
        listing_id: String(body.listing_id),
        plan_id: String(body.plan_id),
        contact_email: contactEmail,
        duration_days: String(plan.duration_days ?? 30),
        current_expires_at: listing.expires_at ?? "",
      },
      success_url: `${siteUrl}/invest/list?renewal=success`,
      cancel_url: `${siteUrl}/invest/list?renewal=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    log.error("Listing renewal error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 },
    );
  }
}
