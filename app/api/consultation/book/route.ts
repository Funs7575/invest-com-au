import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Read consultation_slug from request body
    let consultationSlug: string;
    try {
      const body = await request.json();
      if (body.consultation_slug && typeof body.consultation_slug === "string") {
        consultationSlug = body.consultation_slug;
      } else {
        return NextResponse.json(
          { error: "consultation_slug is required" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Look up consultation from DB
    const { data: consultation } = await admin
      .from("consultations")
      .select("*")
      .eq("slug", consultationSlug)
      .eq("status", "published")
      .maybeSingle();

    if (!consultation) {
      return NextResponse.json(
        { error: "Consultation not found" },
        { status: 404 }
      );
    }

    // Check if already booked (prevent double-buy)
    const { data: existingBooking } = await admin
      .from("consultation_bookings")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("consultation_id", consultation.id)
      .in("status", ["pending", "confirmed"])
      .limit(1)
      .maybeSingle();

    if (existingBooking) {
      return NextResponse.json(
        { error: "You already have a booking for this consultation" },
        { status: 400 }
      );
    }

    // Check if Pro subscriber → use discounted price
    const { data: activeSub } = await admin
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .limit(1)
      .maybeSingle();

    const isPro = !!activeSub;

    // Get Stripe price ID
    let priceId: string | null = null;
    if (isPro && consultation.stripe_pro_price_id) {
      priceId = consultation.stripe_pro_price_id;
    } else if (consultation.stripe_price_id) {
      priceId = consultation.stripe_price_id;
    }

    if (!priceId) {
      return NextResponse.json(
        { error: "Consultation pricing not configured" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      if (!user.email) {
        return NextResponse.json(
          { error: "Email address is required for checkout" },
          { status: 400 }
        );
      }

      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await admin
        .from("profiles")
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    // Create Checkout Session (one-time payment)
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/consultations/${consultationSlug}?booked=true`,
      cancel_url: `${siteUrl}/consultations/${consultationSlug}?checkout=cancelled`,
      metadata: {
        type: "consultation",
        consultation_slug: consultationSlug,
        supabase_user_id: user.id,
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Consultation book checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
