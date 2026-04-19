import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

const log = logger("review-incentive");

/**
 * GET /api/review-incentive
 * Check if current user is eligible for review incentive.
 * Returns eligible brokers and reward details.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Check existing incentive reviews by this user
  const { data: existingReviews } = await admin
    .from("incentive_reviews")
    .select("broker_slug")
    .eq("user_id", user.id);

  const reviewedSlugs = new Set((existingReviews || []).map((r) => r.broker_slug));

  // Get all active brokers
  const { data: brokers } = await admin
    .from("brokers")
    .select("slug, name")
    .eq("status", "active")
    .order("rating", { ascending: false });

  // Filter to brokers not yet reviewed
  const brokersToReview = (brokers || [])
    .filter((b) => !reviewedSlugs.has(b.slug))
    .map((b) => b.slug);

  // Check if user already has active Pro subscription
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  const hasPro = !!subscription;

  return NextResponse.json({
    eligible: brokersToReview.length > 0,
    has_pro: hasPro,
    brokers_to_review: brokersToReview,
    brokers_reviewed: Array.from(reviewedSlugs),
    reward: "1 month Pro",
  });
}

/**
 * POST /api/review-incentive
 * Submit an incentivized review. Validates all fields.
 * Body: { broker_slug, rating, title, body, pros, cons }
 */
export async function POST(req: NextRequest) {
  if (!(await isAllowed("review_incentive_post", ipKey(req), { max: 15, refillPerSec: 0.1 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate required fields
  const brokerSlug = typeof input.broker_slug === "string" ? input.broker_slug.trim() : "";
  const rating = typeof input.rating === "number" ? input.rating : 0;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const pros = Array.isArray(input.pros)
    ? input.pros.filter((p): p is string => typeof p === "string" && p.trim().length > 0).map((p) => p.trim())
    : [];
  const cons = Array.isArray(input.cons)
    ? input.cons.filter((c): c is string => typeof c === "string" && c.trim().length > 0).map((c) => c.trim())
    : [];

  if (!brokerSlug || !/^[a-z0-9-]+$/.test(brokerSlug)) {
    return NextResponse.json({ error: "Invalid broker slug" }, { status: 400 });
  }

  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return NextResponse.json({ error: "Rating must be an integer between 1 and 5" }, { status: 400 });
  }

  if (!title || title.length < 5 || title.length > 200) {
    return NextResponse.json({ error: "Title must be between 5 and 200 characters" }, { status: 400 });
  }

  if (!body || body.length < 100) {
    return NextResponse.json({
      error: `Review body must be at least 100 characters (currently ${body.length})`,
    }, { status: 400 });
  }

  if (body.length > 5000) {
    return NextResponse.json({ error: "Review body must be under 5000 characters" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify broker exists and is active
  const { data: broker } = await admin
    .from("brokers")
    .select("slug, name")
    .eq("slug", brokerSlug)
    .eq("status", "active")
    .maybeSingle();

  if (!broker) {
    return NextResponse.json({ error: "Broker not found or inactive" }, { status: 404 });
  }

  // Check if user already reviewed this broker
  const { data: existing } = await admin
    .from("incentive_reviews")
    .select("id")
    .eq("user_id", user.id)
    .eq("broker_slug", brokerSlug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You have already reviewed this broker" }, { status: 409 });
  }

  // Insert the review
  const { error: insertError } = await admin
    .from("incentive_reviews")
    .insert({
      user_id: user.id,
      broker_slug: brokerSlug,
      rating,
      title,
      body,
      pros,
      cons,
      incentive_claimed: true,
      status: "pending",
    });

  if (insertError) {
    log.error("Failed to insert incentive review", { error: insertError.message });
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }

  // Grant Pro access if user doesn't have an active subscription
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("id, status, current_period_end")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  let proGranted = false;

  if (!subscription) {
    // Create a new complimentary subscription (1 month)
    const now = new Date();
    const oneMonthLater = new Date(now);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    const { error: subError } = await admin
      .from("subscriptions")
      .insert({
        user_id: user.id,
        status: "active",
        plan_interval: "month",
        current_period_start: now.toISOString(),
        current_period_end: oneMonthLater.toISOString(),
        cancel_at_period_end: true, // auto-expire after 1 month
        stripe_subscription_id: `review_incentive_${user.id}_${Date.now()}`,
      });

    if (subError) {
      log.error("Failed to grant Pro access", { error: subError.message });
      // Don't fail the review submission — just log
    } else {
      proGranted = true;
      log.info("Pro access granted via review incentive", { userId: user.id, broker: brokerSlug });
    }
  } else if (subscription.current_period_end) {
    // Extend existing subscription by 1 month
    const currentEnd = new Date(subscription.current_period_end);
    const extended = new Date(currentEnd);
    extended.setMonth(extended.getMonth() + 1);

    await admin
      .from("subscriptions")
      .update({ current_period_end: extended.toISOString() })
      .eq("id", subscription.id);

    proGranted = true;
    log.info("Pro access extended via review incentive", { userId: user.id, broker: brokerSlug });
  }

  return NextResponse.json({
    success: true,
    pro_granted: proGranted,
    message: "Your review has been submitted and is pending approval. Pro access will be activated within 24 hours.",
  });
}
