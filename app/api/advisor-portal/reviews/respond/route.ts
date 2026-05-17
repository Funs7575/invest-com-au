import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("advisor-portal:review-respond");

export const runtime = "nodejs";

const RespondSchema = z.object({
  review_id: z.number().int().positive(),
  body: z.string().min(10).max(1000),
});

/**
 * POST /api/advisor-portal/reviews/respond
 *
 * Creates or replaces an advisor's response to one of their approved
 * professional reviews. Upserts on (review_id) — re-submitting replaces
 * the previous response.
 *
 * Auth: session email → professionals lookup (status=active).
 * Guard: review_id must belong to the session's professional_id.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(`adv-review-respond:${ip}`, 10, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("id")
    .eq("email", user.email)
    .eq("status", "active")
    .maybeSingle();

  if (!pro) {
    return NextResponse.json({ error: "Active advisor account required." }, { status: 403 });
  }

  let body: z.infer<typeof RespondSchema>;
  try {
    body = RespondSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Confirm the review belongs to this advisor (prevent responding to someone else's reviews)
  const { data: review } = await admin
    .from("professional_reviews")
    .select("id, professional_id, status")
    .eq("id", body.review_id)
    .eq("professional_id", pro.id)
    .maybeSingle();

  if (!review) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }
  if (review.status !== "approved") {
    return NextResponse.json({ error: "Can only respond to approved reviews." }, { status: 422 });
  }

  const { data: response, error } = await admin
    .from("professional_review_responses")
    .upsert(
      {
        review_id: body.review_id,
        professional_id: pro.id,
        body: body.body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "review_id" },
    )
    .select("id, body, created_at, updated_at")
    .single();

  if (error) {
    log.error("Failed to upsert review response", { error: error.message, review_id: body.review_id });
    return NextResponse.json({ error: "Failed to save response." }, { status: 500 });
  }

  return NextResponse.json({ response }, { status: 200 });
}
