import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

const log = logger("review-incentive");

const ReviewBody = z.object({
  broker_slug: z.string().regex(/^[a-z0-9-]+$/),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(5, "Title must be between 5 and 200 characters").max(200, "Title must be between 5 and 200 characters"),
  body: z.string().min(100).max(5000, "Review body must be under 5000 characters"),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
});

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

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const inputResult = ReviewBody.safeParse(rawBody);
  if (!inputResult.success) {
    const issue = inputResult.error.issues[0];
    const field = issue?.path[0] as string | undefined;
    if (field === "broker_slug") {
      return NextResponse.json({ error: "Invalid broker slug" }, { status: 400 });
    }
    if (field === "rating") {
      return NextResponse.json({ error: "Rating must be an integer between 1 and 5" }, { status: 400 });
    }
    if (field === "body" && issue?.code === "too_small") {
      const rawObj = rawBody as Record<string, unknown>;
      const bodyLen = typeof rawObj.body === "string" ? rawObj.body.length : 0;
      return NextResponse.json({ error: `Review body must be at least 100 characters (currently ${bodyLen})` }, { status: 400 });
    }
    return NextResponse.json({ error: issue?.message ?? "Invalid request" }, { status: 400 });
  }

  const { broker_slug: brokerSlug, rating, title, body } = inputResult.data;
  const pros = inputResult.data.pros.filter((p) => p.trim().length > 0).map((p) => p.trim());
  const cons = inputResult.data.cons.filter((c) => c.trim().length > 0).map((c) => c.trim());

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
