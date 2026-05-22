import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor-reviews-get:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: reviews, error } = await admin
    .from("professional_reviews")
    .select(
      "id, reviewer_name, rating, title, body, created_at, communication_rating, expertise_rating, value_for_money_rating, status",
    )
    .eq("professional_id", advisorId)
    .in("status", ["approved", "pending"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch reviews." }, { status: 500 });
  }

  const approved = (reviews ?? []).filter((r) => r.status === "approved");
  const pending = (reviews ?? []).filter((r) => r.status === "pending");

  const avgRating =
    approved.length > 0
      ? approved.reduce((sum, r) => sum + r.rating, 0) / approved.length
      : null;

  // Trend: average rating of the most recent 5 approved vs the 5 before that
  const recentFive = approved.slice(0, 5);
  const previousFive = approved.slice(5, 10);
  const recentAvg =
    recentFive.length > 0
      ? recentFive.reduce((sum, r) => sum + r.rating, 0) / recentFive.length
      : null;
  const previousAvg =
    previousFive.length > 0
      ? previousFive.reduce((sum, r) => sum + r.rating, 0) / previousFive.length
      : null;

  const trend: "up" | "down" | "flat" | null =
    recentAvg !== null && previousAvg !== null
      ? recentAvg > previousAvg + 0.1
        ? "up"
        : recentAvg < previousAvg - 0.1
          ? "down"
          : "flat"
      : null;

  return NextResponse.json({
    reviews: reviews ?? [],
    stats: {
      totalReviews: approved.length,
      pendingReviews: pending.length,
      avgRating: avgRating !== null ? parseFloat(avgRating.toFixed(1)) : null,
      trend,
    },
  });
}
