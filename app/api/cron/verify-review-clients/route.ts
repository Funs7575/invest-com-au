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
  //
  // Previously this loop was N+1: one Supabase query per unverified review.
  // With the platform growing this hit cron timeout (60s) once unverified
  // reviews crossed ~600 rows. The new flow:
  //   1. Fetch all unverified reviews (one query)
  //   2. Fetch all candidate broker_signups in a single .in() (one query)
  //   3. Build an in-memory lookup map keyed on (broker_slug,email)
  //   4. Update only reviews that have a matching key
  // Reduces N+1 to O(1) Supabase round-trips on the read path.
  try {
    const { data: unverifiedBrokerReviews } = await supabase
      .from("user_reviews")
      .select("id, email, broker_slug, broker_id")
      .or("is_verified_client.is.null,is_verified_client.eq.false")
      .not("email", "is", null);

    if (unverifiedBrokerReviews && unverifiedBrokerReviews.length > 0) {
      // Collect distinct emails (smaller IN list = faster index probe)
      const emails = Array.from(
        new Set(
          unverifiedBrokerReviews
            .map((r) => r.email)
            .filter((e): e is string => typeof e === "string" && e.length > 0),
        ),
      );

      // Single batched fetch of all candidate signups
      const { data: candidateSignups } = await supabase
        .from("broker_signups")
        .select("broker_slug, email")
        .in("email", emails);

      // Build O(1) lookup keyed on slug+email
      const matchKey = (slug: string, email: string) =>
        `${slug}::${email.toLowerCase()}`;
      const matchedKeys = new Set(
        (candidateSignups || []).map((s) =>
          matchKey(s.broker_slug, s.email),
        ),
      );

      // Update only matching reviews
      for (const review of unverifiedBrokerReviews) {
        if (!review.email) continue;
        if (!matchedKeys.has(matchKey(review.broker_slug, review.email))) continue;

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
  } catch (err) {
    log.error("Error verifying broker reviews", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ── Advisor reviews: match professional_reviews.reviewer_email against professional_leads.user_email ──
  // Same N+1 → batched-lookup transformation as the broker block above.
  try {
    const { data: unverifiedAdvisorReviews } = await supabase
      .from("professional_reviews")
      .select("id, reviewer_email, professional_id")
      .or("is_verified_client.is.null,is_verified_client.eq.false")
      .not("reviewer_email", "is", null);

    if (unverifiedAdvisorReviews && unverifiedAdvisorReviews.length > 0) {
      const emails = Array.from(
        new Set(
          unverifiedAdvisorReviews
            .map((r) => r.reviewer_email)
            .filter((e): e is string => typeof e === "string" && e.length > 0),
        ),
      );

      const { data: candidateLeads } = await supabase
        .from("professional_leads")
        .select("id, professional_id, user_email")
        .in("user_email", emails);

      const matchKey = (proId: number | string, email: string) =>
        `${proId}::${email.toLowerCase()}`;
      // Map key → lead.id so we can store the matched lead id on the review
      const leadIdByKey = new Map<string, number>();
      for (const lead of candidateLeads || []) {
        leadIdByKey.set(matchKey(lead.professional_id, lead.user_email), lead.id);
      }

      for (const review of unverifiedAdvisorReviews) {
        if (!review.reviewer_email) continue;
        const leadId = leadIdByKey.get(
          matchKey(review.professional_id, review.reviewer_email),
        );
        if (!leadId) continue;

        const { error } = await supabase
          .from("professional_reviews")
          .update({
            is_verified_client: true,
            verified_client_at: new Date().toISOString(),
            lead_id: leadId,
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
