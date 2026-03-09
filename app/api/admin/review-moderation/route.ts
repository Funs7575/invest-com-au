import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/admin/review-moderation
 *
 * Approve, reject, or flag pending professional reviews.
 * Body: { ids: number[], action: "approve" | "reject" | "flag" }
 */
export async function PATCH(req: NextRequest) {
  try {
    // Auth check: require an authenticated admin user
    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "admin@invest.com.au")
      .split(",")
      .map((e) => e.trim().toLowerCase());
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

    const body = await req.json();
    const { ids, action } = body as { ids?: number[]; action?: string };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty ids array" },
        { status: 400 }
      );
    }
    if (!action || !["approve", "reject", "flag"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'approve', 'reject', or 'flag'" },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      message: `${ids.length} review(s) ${statusMap[action]}`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
