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

    // Read course_slug from request body (default to investing-101 for backward compat)
    let courseSlug = "investing-101";
    try {
      const body = await request.json();
      if (body.course_slug && typeof body.course_slug === "string") {
        courseSlug = body.course_slug;
      }
    } catch {
      // Empty body — use default
    }

    const admin = createAdminClient();

    // Look up course from DB
    const { data: course } = await admin
      .from("courses")
      .select("*")
      .eq("slug", courseSlug)
      .maybeSingle();

    if (!course || course.status !== "published") {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Check if already purchased (prevent double-buy)
    const { data: existingPurchase } = await admin
      .from("course_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_slug", courseSlug)
      .limit(1)
      .maybeSingle();

    if (existingPurchase) {
      return NextResponse.json(
        { error: "You already own this course" },
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

    // Get stripe price ID from DB, fallback to env vars for investing-101
    let priceId: string | null = null;
    if (isPro && course.stripe_pro_price_id) {
      priceId = course.stripe_pro_price_id;
    } else if (course.stripe_price_id) {
      priceId = course.stripe_price_id;
    }

    // Fallback for investing-101 during transition
    if (!priceId && courseSlug === "investing-101") {
      priceId = isPro
        ? process.env.STRIPE_COURSE_PRO_PRICE_ID || null
        : process.env.STRIPE_COURSE_PRICE_ID || null;
    }

    if (!priceId) {
      return NextResponse.json(
        { error: "Course pricing not configured" },
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

    // Create Checkout Session (one-time payment, NOT subscription)
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/courses/${courseSlug}?purchased=true`,
      cancel_url: `${siteUrl}/courses/${courseSlug}?checkout=cancelled`,
      metadata: {
        type: "course",
        course_slug: courseSlug,
        supabase_user_id: user.id,
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Course purchase checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
