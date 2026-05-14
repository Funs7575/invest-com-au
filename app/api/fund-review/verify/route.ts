import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

const log = logger("fund-review");

const PROFANITY_LIST = [
  "fuck", "shit", "cunt", "bitch", "asshole", "dick", "piss",
  "bastard", "wanker", "slut", "whore", "nigger", "faggot", "retard",
];

const SPAM_URL_REGEX = /https?:\/\/[^\s]+/i;
const profanityRegex = new RegExp(`\\b(${PROFANITY_LIST.join("|")})\\b`, "i");

interface ReviewContent {
  title: string;
  body: string;
  pros: string | null;
  cons: string | null;
  display_name: string;
}

function checkBlocklist(review: ReviewContent): string | null {
  const allText = [review.title, review.body, review.pros, review.cons, review.display_name]
    .filter(Boolean)
    .join(" ");

  if (profanityRegex.test(allText)) return "Contains profanity";
  if (SPAM_URL_REGEX.test(allText)) return "Contains URL";
  if (review.body.trim().length < 20) return "Body too short";

  if (review.body.length >= 30) {
    const upperCount = (review.body.match(/[A-Z]/g) || []).length;
    const letterCount = (review.body.match(/[A-Za-z]/g) || []).length;
    if (letterCount > 0 && upperCount / letterCount > 0.6) return "Excessive caps";
  }

  if (/(.)\1{5,}/.test(allText)) return "Repetitive characters";

  return null;
}

export async function GET(request: NextRequest) {
  if (!(await isAllowed("fund_review_verify_get", ipKey(request), { max: 30, refillPerSec: 0.2 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const token = request.nextUrl.searchParams.get("token");

  if (!token || typeof token !== "string" || token.length < 10) {
    return NextResponse.redirect(new URL("/?error=invalid_token", request.url));
  }

  const supabase = createAdminClient();

  const { data: review } = await supabase
    .from("fund_reviews")
    .select("id, fund_slug, status, title, body, pros, cons, display_name")
    .eq("verification_token", token)
    .single();

  if (!review) {
    return NextResponse.redirect(new URL("/?error=review_not_found", request.url));
  }

  if (review.status === "pending") {
    const blockReason = checkBlocklist({
      title: review.title,
      body: review.body,
      pros: review.pros,
      cons: review.cons,
      display_name: review.display_name,
    });

    const newStatus = blockReason ? "verified" : "approved";

    const { error } = await supabase
      .from("fund_reviews")
      .update({
        status: newStatus,
        verified_at: new Date().toISOString(),
        ...(blockReason ? { moderation_note: `Auto-held: ${blockReason}` } : {}),
      })
      .eq("id", review.id);

    if (error) {
      log.error("fund_review verify error", { error: error.message });
      return NextResponse.redirect(new URL("/?error=verification_failed", request.url));
    }
  }

  const { getSiteUrl } = await import("@/lib/url");
  const siteUrl = getSiteUrl();
  return NextResponse.redirect(new URL(`/invest/funds/${review.fund_slug}?review_verified=1`, siteUrl));
}
