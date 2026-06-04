import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  if (await isRateLimited(`reviews:get:${ip}`, 60, 60)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  const supabase = await createClient();

  // Get course by slug first
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const { data: reviews } = await supabase
    .from("course_reviews")
    .select("id, rating, headline, body, is_verified_purchase, created_at")
    .eq("course_id", course.id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);

  // Compute aggregate
  const ratings = (reviews ?? []).map((r) => r.rating);
  const avg =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  return NextResponse.json({
    reviews: reviews ?? [],
    avg_rating: avg ? Math.round(avg * 10) / 10 : null,
    count: ratings.length,
  });
}

const ReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  headline: z.string().max(150).optional(),
  body: z.string().max(2000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";

  const raw = await req.json().catch(() => null);
  if (raw === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = ReviewSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (await isRateLimited(`reviews:post:${user.id}`, 5, 3600)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  // Get course ID
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  // Check if user purchased this course (for verified purchase badge)
  const { data: purchase } = await supabase
    .from("course_purchases")
    .select("id")
    .eq("course_id", course.id)
    .eq("user_id", user.id)
    .eq("status", "paid")
    .maybeSingle();

  // Upsert review (one per user per course)
  const { data: review, error } = await supabase
    .from("course_reviews")
    .upsert(
      {
        course_id: course.id,
        user_id: user.id,
        purchase_id: (purchase as { id: number } | null)?.id ?? null,
        rating: data.rating,
        headline: data.headline ?? null,
        body: data.body ?? null,
        is_verified_purchase: !!purchase,
        status: "published",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "course_id,user_id" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update cached aggregates on courses (best-effort)
  // Re-calc avg and count using admin client
  const admin = createAdminClient();
  const { data: allReviews } = await admin
    .from("course_reviews")
    .select("rating")
    .eq("course_id", course.id)
    .eq("status", "published");

  const ratings = (allReviews ?? []).map((r: { rating: number }) => r.rating);
  const avg =
    ratings.length > 0
      ? Math.round(
          (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 100,
        ) / 100
      : null;

  await admin
    .from("courses")
    .update({ avg_rating: avg, review_count: ratings.length })
    .eq("id", course.id);

  const _ = ip; // used above for rate-limit key
  return NextResponse.json({ review });
}
