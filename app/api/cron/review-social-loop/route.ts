/**
 * Cron: Review social loop — monthly on the 1st at 09:00 UTC (monthly-1-9).
 *
 * For each user who had at least one review approved in the past 31 days:
 *   1. Counts total approved reviews (all time) to determine badge tier.
 *   2. Upserts forum_user_profiles.badge to 'contributor' (≥3) or
 *      'expert' (≥10) — never downgrades, never touches 'moderator'.
 *   3. Sends a "your review helped investors" notification email.
 *
 * Deduplication: we only act on emails with a review created in the past
 * 31 days whose status is currently 'approved'. This naturally re-fires
 * when a previously-pending review is approved on the next monthly run.
 *
 * Capped at 200 emails per invocation (re-runs handle overflow at low
 * volume; monthly cadence means overflow is unlikely).
 */

import { NextRequest, NextResponse } from "next/server";
import { escapeHtml } from "@/lib/html-escape";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { buildEmailToUserIdMap } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import { SITE_URL } from "@/lib/seo";

const log = logger("cron:review-social-loop");

export const runtime = "nodejs";
export const maxDuration = 60;

const WINDOW_DAYS = 31;
const MAX_PER_RUN = 200;
const BADGE_CONTRIBUTOR_THRESHOLD = 3;
const BADGE_EXPERT_THRESHOLD = 10;
const BADGE_ORDER = ["newcomer", "contributor", "expert", "moderator"] as const;

type BadgeTier = (typeof BADGE_ORDER)[number];

function badgeRank(b: string | null): number {
  const idx = BADGE_ORDER.indexOf((b ?? "newcomer") as BadgeTier);
  return idx === -1 ? 0 : idx;
}

function targetBadge(totalApproved: number): BadgeTier | null {
  if (totalApproved >= BADGE_EXPERT_THRESHOLD) return "expert";
  if (totalApproved >= BADGE_CONTRIBUTOR_THRESHOLD) return "contributor";
  return null;
}


function buildEmail(opts: {
  firstName: string;
  newReviewProduct: string;
  totalApproved: number;
  badgeGranted: BadgeTier | null;
  siteUrl: string;
}): { subject: string; html: string; text: string } {
  const { firstName, newReviewProduct, totalApproved, badgeGranted, siteUrl } = opts;
  const reviewsUrl = `${siteUrl}/account/reviews?utm_source=review_loop&utm_medium=email`;

  const badgeSection =
    badgeGranted === "expert"
      ? `<p style="color:#475569;font-size:14px;line-height:1.6">
           🏅 <strong>You've earned the Expert Reviewer badge</strong> for your ${totalApproved} approved reviews.
           It's now displayed on your community profile.
         </p>`
      : badgeGranted === "contributor"
        ? `<p style="color:#475569;font-size:14px;line-height:1.6">
             ⭐ <strong>You've earned the Contributor badge</strong> for your ${totalApproved} approved reviews.
             Keep them coming — 10 reviews unlocks the Expert badge.
           </p>`
        : "";

  const subject =
    totalApproved === 1
      ? `${firstName}, your first review is helping investors!`
      : `${firstName}, your ${totalApproved} reviews are helping investors`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#0f172a;font-size:18px">
        Your review of ${escapeHtml(newReviewProduct)} is live ✅
      </h2>
      <p style="color:#475569;font-size:14px;line-height:1.6">Hi ${escapeHtml(firstName)},</p>
      <p style="color:#475569;font-size:14px;line-height:1.6">
        Your review of <strong>${escapeHtml(newReviewProduct)}</strong> is published and helping other
        investors make better decisions. You now have
        <strong>${totalApproved} ${totalApproved === 1 ? "review" : "reviews"}</strong> on Invest.com.au —
        thank you for contributing to the community.
      </p>
      ${badgeSection}
      <a
        href="${reviewsUrl}"
        style="display:inline-block;padding:12px 24px;background:#0f172a;color:white;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;margin:12px 0"
      >
        View your reviews →
      </a>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;line-height:1.6">
        You're receiving this because you submitted a review on
        <a href="${siteUrl}" style="color:#7c3aed">Invest.com.au</a>.
        Reviews help other Australians make better investing decisions.
      </p>
    </div>
  `;

  const text = [
    `Hi ${firstName},`,
    "",
    `Your review of ${newReviewProduct} is published on Invest.com.au.`,
    `You now have ${totalApproved} ${totalApproved === 1 ? "review" : "reviews"} helping investors.`,
    ...(badgeGranted ? [`You've earned the ${badgeGranted} reviewer badge!`] : []),
    "",
    `View your reviews: ${reviewsUrl}`,
  ].join("\n");

  return { subject, html, text };
}

export const GET = (req: NextRequest) => {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>("review-social-loop", async () => {
    const supabase = createAdminClient();
    const siteUrl = SITE_URL;

    const windowStart = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();

    // Reviews approved and created in the past 31 days, grouped by email.
    // We use created_at as a proxy for "newly published this period" because
    // the table has no updated_at column. Reviews submitted and approved in
    // the window will trigger the loop.
    const { data: recentRows, error: recentErr } = await supabase
      .from("user_reviews")
      .select("email, broker_slug, rating")
      .eq("status", "approved")
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false })
      .limit(MAX_PER_RUN);

    if (recentErr) {
      log.error("Failed to fetch recent reviews", { error: recentErr.message });
      return {
        response: NextResponse.json({ error: "fetch_failed" }, { status: 500 }),
        stats: { error: recentErr.message },
      };
    }

    if (!recentRows || recentRows.length === 0) {
      return {
        response: NextResponse.json({ ok: true, sent: 0, badged: 0, checked: 0 }),
        stats: { sent: 0, badged: 0, checked: 0 },
      };
    }

    // Deduplicate to one email → product per run; take the most recent product slug.
    const emailToProduct = new Map<string, string>();
    for (const row of recentRows) {
      const em = row.email?.toLowerCase();
      if (em && !emailToProduct.has(em)) {
        emailToProduct.set(em, row.broker_slug ?? "a product");
      }
    }

    // Build email → userId map once for the whole batch.
    const emailToUserId = await buildEmailToUserIdMap();

    let sent = 0;
    let badged = 0;

    for (const [email, productSlug] of emailToProduct) {
      // Count total approved reviews for this email (all time).
      const { count: totalApproved } = await supabase
        .from("user_reviews")
        .select("id", { count: "exact", head: true })
        .eq("email", email)
        .eq("status", "approved");

      const total = totalApproved ?? 0;
      const desired = targetBadge(total);
      const userId = emailToUserId.get(email.toLowerCase());

      let badgeGranted: BadgeTier | null = null;

      if (userId && desired) {
        // Ensure profile row exists.
        await supabase.from("forum_user_profiles").upsert(
          {
            user_id: userId,
            display_name: email.split("@")[0] ?? "Reviewer",
            reputation: 0,
            post_count: 0,
            thread_count: 0,
            is_moderator: false,
          },
          { onConflict: "user_id", ignoreDuplicates: true },
        );

        const { data: profile } = await supabase
          .from("forum_user_profiles")
          .select("badge")
          .eq("user_id", userId)
          .maybeSingle();

        const currentRank = badgeRank(profile?.badge ?? null);
        const desiredRank = badgeRank(desired);

        if (desiredRank > currentRank) {
          await supabase
            .from("forum_user_profiles")
            .update({ badge: desired })
            .eq("user_id", userId);
          badgeGranted = desired;
          badged++;
        }
      }

      // Send notification email.
      const firstName = email.split("@")[0] ?? "there";
      const productName = productSlug
        .split("-")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      const { subject, html, text } = buildEmail({
        firstName,
        newReviewProduct: productName,
        totalApproved: total,
        badgeGranted,
        siteUrl,
      });

      const { error: emailErr } = await sendEmail({
        to: email,
        from: "Invest.com.au <hello@invest.com.au>",
        subject,
        html,
        text,
      });

      if (emailErr) {
        log.warn("Email send failed", { email, error: emailErr });
      } else {
        sent++;
      }
    }

    log.info("Review social loop complete", { sent, badged, checked: emailToProduct.size });
    return {
      response: NextResponse.json({ ok: true, sent, badged, checked: emailToProduct.size }),
      stats: { sent, badged, checked: emailToProduct.size },
    };
  });
};
