import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_EMAILS } from "@/lib/admin";
import { logger } from "@/lib/logger";
import { z } from "zod";

const ModerateBody = z.object({
  ids: z.array(z.number().int()).min(1),
  action: z.enum(["approve", "reject", "flag"]),
});

const log = logger("admin-review-moderation");

/**
 * PATCH /api/admin/review-moderation
 *
 * Approve, reject, or flag pending professional reviews.
 * Body: { ids: number[], action: "approve" | "reject" | "flag" }
 */
export async function PATCH(req: NextRequest) {
  try {
    // Auth check: require an authenticated admin user
    const supabaseAuth = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (
      authError ||
      !user ||
      !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await req.json();
    const parsed = ModerateBody.safeParse(rawBody);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      const msg =
        field === "ids"
          ? "Missing or empty ids array"
          : field === "action"
            ? "Action must be 'approve', 'reject', or 'flag'"
            : "Invalid request body";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { ids, action } = parsed.data;

    const statusMap: Record<string, string> = {
      approve: "approved",
      reject: "rejected",
      flag: "flagged",
    };

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("professional_reviews")
      .update({ status: statusMap[action] })
      .in("id", ids);

    if (error) {
      return NextResponse.json(
        { error: `Failed to ${action} reviews: ` + error.message },
        { status: 500 }
      );
    }

    // If approving, recalculate the average rating for each affected advisor
    if (action === "approve") {
      // Get the professional_ids of the approved reviews
      const { data: reviews } = await supabase
        .from("professional_reviews")
        .select("professional_id")
        .in("id", ids);

      if (reviews) {
        const uniqueProfIds = [...new Set(reviews.map((r) => r.professional_id))];
        for (const profId of uniqueProfIds) {
          const { data: allReviews } = await supabase
            .from("professional_reviews")
            .select("rating")
            .eq("professional_id", profId)
            .eq("status", "approved");

          if (allReviews && allReviews.length > 0) {
            const avg =
              allReviews.reduce((s, rv) => s + rv.rating, 0) / allReviews.length;
            await supabase
              .from("professionals")
              .update({
                rating: Math.round(avg * 10) / 10,
                review_count: allReviews.length,
              })
              .eq("id", profId);
          }
        }
      }
    }

    await supabase.from("admin_audit_log").insert({
      action: `professional_review:${statusMap[action]}`,
      entity_type: "professional_review",
      admin_email: user.email ?? null,
      details: { ids, count: ids.length },
    });
    return NextResponse.json({
      success: true,
      message: `${ids.length} review(s) ${statusMap[action]}`,
    });
  } catch (err) {
    log.error("Review moderation failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
