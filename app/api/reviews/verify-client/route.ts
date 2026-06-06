import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ADMIN_EMAILS } from "@/lib/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

const log = logger("verify-client");

const VerifyBody = z.object({
  review_id: z.number().int().positive(),
  review_type: z.enum(["broker", "advisor"]),
});

export async function POST(request: NextRequest) {
  if (!(await isAllowed("reviews_verify_client_post", ipKey(request), { max: 30, refillPerSec: 0.2 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // ── Auth check: require an authenticated admin user ──
  const supabaseAuth = await createServerClient();
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

  // Parse + validate body
  const parsed = VerifyBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "review_id and review_type are required" },
      { status: 400 },
    );
  }
  const { review_id, review_type } = parsed.data;

  if (review_type !== "broker" && review_type !== "advisor") {
    return NextResponse.json(
      { error: "review_type must be 'broker' or 'advisor'" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  try {
    if (review_type === "broker") {
      // Fetch the broker review
      const { data: review, error: reviewError } = await supabase
        .from("user_reviews")
        .select("id, email, broker_slug, broker_id, is_verified_client")
        .eq("id", review_id)
        .single();

      if (reviewError || !review) {
        return NextResponse.json(
          { error: "Review not found" },
          { status: 404 },
        );
      }

      if (review.is_verified_client) {
        return NextResponse.json({
          success: true,
          already_verified: true,
          message: "Review is already verified",
        });
      }

      // Check if reviewer email matches any platform lead for the same broker.
      // A platform enquiry (lead_type='platform', broker_id set) submitted via
      // /api/submit-lead proves the reviewer is a real customer of this broker.
      // Mirrors the advisor path (professional_leads match). We key on
      // broker_id — `leads` has no broker_slug, and the review row carries
      // broker_id alongside broker_slug. Reviews with a null broker_id (and
      // leads with a null broker_id) can't be attributed, so they never match.
      if (review.broker_id == null) {
        return NextResponse.json({
          success: true,
          verified: false,
          message: "No matching enquiry found for this reviewer",
        });
      }

      const { data: leadMatch } = await supabase
        .from("leads")
        .select("id")
        .eq("lead_type", "platform")
        .eq("broker_id", review.broker_id)
        .eq("user_email", review.email)
        .limit(1);

      if (leadMatch && leadMatch.length > 0) {
        const { error: updateError } = await supabase
          .from("user_reviews")
          .update({
            is_verified_client: true,
            verified_via: "enquiry_match",
            verified_client_at: new Date().toISOString(),
          })
          .eq("id", review_id);

        if (updateError) {
          log.error("Failed to update broker review verification", {
            review_id,
            error: updateError.message,
          });
          return NextResponse.json(
            { error: "Failed to update review" },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          verified: true,
          verified_via: "enquiry_match",
        });
      }

      // No match found
      return NextResponse.json({
        success: true,
        verified: false,
        message: "No matching enquiry found for this reviewer",
      });
    } else {
      // advisor review
      const { data: review, error: reviewError } = await supabase
        .from("professional_reviews")
        .select(
          "id, reviewer_email, professional_id, is_verified_client",
        )
        .eq("id", review_id)
        .single();

      if (reviewError || !review) {
        return NextResponse.json(
          { error: "Review not found" },
          { status: 404 },
        );
      }

      if (review.is_verified_client) {
        return NextResponse.json({
          success: true,
          already_verified: true,
          message: "Review is already verified",
        });
      }

      // Check if reviewer email matches any professional_leads for the same professional
      const { data: leadMatch } = await supabase
        .from("professional_leads")
        .select("id")
        .eq("professional_id", review.professional_id)
        .eq("user_email", review.reviewer_email)
        .limit(1);

      if (leadMatch && leadMatch.length > 0) {
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("professional_reviews")
          .update({
            is_verified_client: true,
            verified_client_at: now,
            lead_id: leadMatch[0]?.id,
            // Keep verified_engagement in sync with is_verified_client
            verified_engagement: true,
            verified_at: now,
          })
          .eq("id", review_id);

        if (updateError) {
          log.error("Failed to update advisor review verification", {
            review_id,
            error: updateError.message,
          });
          return NextResponse.json(
            { error: "Failed to update review" },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          verified: true,
          verified_via: "enquiry_match",
        });
      }

      // No match found
      return NextResponse.json({
        success: true,
        verified: false,
        message: "No matching enquiry found for this reviewer",
      });
    }
  } catch (err) {
    log.error("Verify client error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
