import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const log = logger("cron:verify-review-clients");

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  let brokerVerified = 0;
  let advisorVerified = 0;

  // ── Broker reviews: match user_reviews.email against broker_signups.email ──
  try {
    const { data: unverifiedBrokerReviews } = await supabase
      .from("user_reviews")
      .select("id, email, broker_slug, broker_id")
      .or("is_verified_client.is.null,is_verified_client.eq.false")
      .not("email", "is", null);

    if (unverifiedBrokerReviews && unverifiedBrokerReviews.length > 0) {
      for (const review of unverifiedBrokerReviews) {
        if (!review.email) continue;

        // Check broker_signups for matching email + broker
        const { data: signupMatch } = await supabase
          .from("broker_signups")
          .select("id")
          .eq("broker_slug", review.broker_slug)
          .eq("email", review.email)
          .limit(1);

        if (signupMatch && signupMatch.length > 0) {
          const { error } = await supabase
            .from("user_reviews")
            .update({
              is_verified_client: true,
              verified_via: "signup_match",
              verified_client_at: new Date().toISOString(),
            })
            .eq("id", review.id);

          if (!error) {
            brokerVerified++;
          } else {
            log.warn("Failed to verify broker review", {
              review_id: review.id,
              error: error.message,
            });
          }
        }
      }
    }
  } catch (err) {
    log.error("Error verifying broker reviews", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ── Advisor reviews: match professional_reviews.reviewer_email against professional_leads.user_email ──
  try {
    const { data: unverifiedAdvisorReviews } = await supabase
      .from("professional_reviews")
      .select("id, reviewer_email, professional_id")
      .or("is_verified_client.is.null,is_verified_client.eq.false")
      .not("reviewer_email", "is", null);

    if (unverifiedAdvisorReviews && unverifiedAdvisorReviews.length > 0) {
      for (const review of unverifiedAdvisorReviews) {
        if (!review.reviewer_email) continue;

        // Check professional_leads for matching email + professional
        const { data: leadMatch } = await supabase
          .from("professional_leads")
          .select("id")
          .eq("professional_id", review.professional_id)
          .eq("user_email", review.reviewer_email)
          .limit(1);

        if (leadMatch && leadMatch.length > 0) {
          const { error } = await supabase
            .from("professional_reviews")
            .update({
              is_verified_client: true,
              verified_client_at: new Date().toISOString(),
              lead_id: leadMatch[0].id,
            })
            .eq("id", review.id);

          if (!error) {
            advisorVerified++;
          } else {
            log.warn("Failed to verify advisor review", {
              review_id: review.id,
              error: error.message,
            });
          }
        }
      }
    }
  } catch (err) {
    log.error("Error verifying advisor reviews", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const totalVerified = brokerVerified + advisorVerified;

  if (totalVerified > 0) {
    log.info("Review client verification complete", {
      brokerVerified,
      advisorVerified,
      totalVerified,
    });
  }

  return NextResponse.json({
    success: true,
    broker_verified: brokerVerified,
    advisor_verified: advisorVerified,
    total_verified: totalVerified,
    timestamp: new Date().toISOString(),
  });
}
