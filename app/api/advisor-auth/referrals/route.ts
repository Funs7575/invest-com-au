/**
 * GET /api/advisor-auth/referrals
 *
 * Returns the authenticated advisor's referral code and programme stats.
 * The referral code is derived deterministically from the advisor's ID
 * so no extra DB column is required — the same ID always produces the
 * same code. Stats are pulled from referral_rewards rows where the
 * referral_code matches the advisor's generated code.
 *
 * Uses requireAdvisorSession() which supports both Supabase Auth and
 * legacy cookie-based advisor sessions.
 * Uses createAdminClient() because referral_rewards has service_role-only
 * policies (no authenticated-user SELECT policy exists on that table).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("advisor-auth:referrals");

const ADVISOR_SIGNUP_BASE = "https://invest.com.au/advisor-signup";

/**
 * Deterministic 9-char code from advisor ID.
 * Format: "ADV" + 6 uppercase alphanumeric chars derived from the ID.
 */
function generateAdvisorReferralCode(advisorId: number): string {
  return (
    "ADV" +
    Buffer.from(String(advisorId))
      .toString("base64")
      .replace(/[^A-Z0-9]/gi, "")
      .slice(0, 6)
      .toUpperCase()
  );
}

export async function GET(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (await isRateLimited(`advisor_referrals_get:${ip}`, 60, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const referralCode = generateAdvisorReferralCode(advisorId);
    const referralUrl = `${ADVISOR_SIGNUP_BASE}?ref=${referralCode}`;

    const admin = createAdminClient();

    // Fetch the advisor's email to look up rewards rows by referrer_email.
    // The referral_rewards table uses referrer_email as the link key.
    const { data: professional } = await admin
      .from("professionals")
      .select("email, referral_credit_cents")
      .eq("id", advisorId)
      .maybeSingle();

    let totalReferred = 0;
    let activeReferrals = 0;
    let creditsEarnedCents = 0;

    if (professional?.email) {
      // Count all referral_rewards rows where this advisor is the referrer.
      const { data: rewards } = await admin
        .from("referral_rewards")
        .select("status, reward_cents")
        .eq("referrer_email", professional.email);

      if (rewards && rewards.length > 0) {
        totalReferred = rewards.length;
        activeReferrals = rewards.filter(
          (r) => r.status === "paid"
        ).length;
        creditsEarnedCents = rewards
          .filter((r) => r.status === "paid")
          .reduce((sum, r) => sum + (r.reward_cents ?? 0), 0);
      }
    }

    // Fall back to stored referral_credit_cents if available (additive credit
    // from the marketplace v2 flow — professionals.referral_credit_cents).
    // Use whichever is larger so we don't under-report.
    const storedCreditCents = professional?.referral_credit_cents ?? 0;
    const reportedCreditCents = Math.max(creditsEarnedCents, storedCreditCents);

    return NextResponse.json({
      referral_code: referralCode,
      referral_url: referralUrl,
      stats: {
        total_referred: totalReferred,
        active_referrals: activeReferrals,
        credits_earned_cents: reportedCreditCents,
      },
    });
  } catch (err) {
    log.error("advisor referrals fetch error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to fetch referral data" },
      { status: 500 }
    );
  }
}
