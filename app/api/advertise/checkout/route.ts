import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/url";
import { isValidEmail } from "@/lib/validate-email";

const log = logger("advertise-checkout");

const TIER_PRICES: Record<string, number> = {
  featured_partner: 2000_00, // cents
  category_sponsor: 500_00,
  deal_of_month: 300_00,
};

const TIER_LABELS: Record<string, string> = {
  featured_partner: "Featured Partner Sponsorship",
  category_sponsor: "Category Sponsor",
  deal_of_month: "Deal of the Month",
};

const VALID_DURATIONS = [1, 3, 6, 12];

const DURATION_DISCOUNTS: Record<number, number> = {
  1: 0,
  3: 0.1,
  6: 0.2,
  12: 0.3,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tier, category_slug, duration_months, company_name, contact_email } = body;

    // Validate tier
    if (!tier || !TIER_PRICES[tier]) {
      return NextResponse.json(
        { error: "Invalid sponsorship tier." },
        { status: 400 }
      );
    }

    // Validate duration
    if (!duration_months || !VALID_DURATIONS.includes(duration_months)) {
      return NextResponse.json(
        { error: "Invalid duration. Choose 1, 3, 6, or 12 months." },
        { status: 400 }
      );
    }

    // Validate company name
    if (!company_name || typeof company_name !== "string" || company_name.trim().length < 2) {
      return NextResponse.json(
        { error: "Company name is required." },
        { status: 400 }
      );
    }

    // Validate email
    if (!contact_email || !isValidEmail(contact_email)) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    // Category slug required for category_sponsor tier
    if (tier === "category_sponsor" && !category_slug) {
      return NextResponse.json(
        { error: "Please select a category for the Category Sponsor tier." },
        { status: 400 }
      );
    }

    // Calculate price
    const basePriceCents = TIER_PRICES[tier];
    const discount = DURATION_DISCOUNTS[duration_months] || 0;
    const discountedMonthlyCents = Math.round(basePriceCents * (1 - discount));
    const totalCents = discountedMonthlyCents * duration_months;

    // Build Stripe line item description
    const tierLabel = TIER_LABELS[tier] || tier;
    const description = category_slug
      ? `${tierLabel} — ${category_slug} category — ${duration_months} month${duration_months > 1 ? "s" : ""}`
      : `${tierLabel} — ${duration_months} month${duration_months > 1 ? "s" : ""}`;

    // Store pending order in Supabase
    const admin = createAdminClient();
    const { data: order, error: dbError } = await admin
      .from("sponsorship_orders")
      .insert({
        tier,
        category_slug: category_slug || null,
        duration_months,
        company_name: company_name.trim(),
        contact_email: contact_email.trim().toLowerCase(),
        amount_cents: totalCents,
        status: "pending",
      })
      .select("id")
      .single();

    if (dbError) {
      log.error("Failed to create sponsorship order", { error: dbError.message });
      return NextResponse.json(
        { error: "Failed to create order. Please try again." },
        { status: 500 }
      );
    }

    // Create Stripe checkout session (one-time payment)
    const siteUrl = getSiteUrl();
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: contact_email.trim().toLowerCase(),
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: tierLabel,
              description,
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        sponsorship_order_id: String(order.id),
        tier,
        category_slug: category_slug || "",
        duration_months: String(duration_months),
        company_name: company_name.trim(),
      },
      success_url: `${siteUrl}/advertise/packages?checkout=success&order=${order.id}`,
      cancel_url: `${siteUrl}/advertise/packages?checkout=cancelled`,
    });

    // Update order with Stripe session ID
    await admin
      .from("sponsorship_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    log.info("Sponsorship checkout created", {
      orderId: order.id,
      tier,
      duration: duration_months,
      totalCents,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    log.error("Advertise checkout error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
