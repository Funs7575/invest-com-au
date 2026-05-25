import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { z } from "zod";

const log = logger("courses/enroll");

const EnrollBody = z.object({
  courseId: z.union([z.string(), z.number()]).transform(String),
});

export const POST = withValidatedBody(EnrollBody, async (req, body) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`courses:enroll:${ip}`, 10, 1)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: course } = await admin
    .from("courses")
    .select("id, slug, title, price_cents, status, stripe_price_id")
    .eq("id", body.courseId)
    .eq("status", "published")
    .maybeSingle();

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const { data: existing } = await admin
    .from("course_enrollments")
    .select("id")
    .eq("course_id", course.id)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You are already enrolled in this course" },
      { status: 400 }
    );
  }

  if (course.price_cents === 0) {
    const { error: insertError } = await admin
      .from("course_enrollments")
      .insert({
        course_id: course.id,
        user_id: user.id,
        status: "active",
      });

    if (insertError) {
      log.error("Failed to insert free enrollment", {
        error: insertError.message,
        courseId: course.id,
        userId: user.id,
      });
      return NextResponse.json(
        { error: "Failed to enroll. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ enrolled: true }, { status: 201 });
  }

  const priceId: string | null = course.stripe_price_id ?? null;

  if (!priceId) {
    return NextResponse.json(
      { error: "Course pricing not configured" },
      { status: 400 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://invest.com.au";

  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id as string | undefined;

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
      .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/academy/${course.slug}?enrolled=1`,
    cancel_url: `${siteUrl}/academy/${course.slug}?checkout=cancelled`,
    metadata: {
      type: "academy_course",
      course_id: String(course.id),
      course_slug: course.slug,
      supabase_user_id: user.id,
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
});
