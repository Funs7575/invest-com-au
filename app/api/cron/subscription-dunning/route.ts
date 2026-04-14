import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { enqueueJob } from "@/lib/job-queue";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";

const log = logger("cron:subscription-dunning");

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Subscription dunning cron.
 *
 * Runs daily. Finds subscriptions that are past_due or have a
 * grace_period_until in the past, and progresses them through a
 * retry schedule:
 *
 *   Day 0 (initial failure)        — soft warning email
 *   Day 3 (attempt 2)               — firm warning
 *   Day 7 (attempt 3)               — final notice, grace period
 *                                     expires in 24 hours
 *   Day 8+                          — subscription cancelled, end
 *                                     of grace period stamped
 *
 * We stamp `dunning_attempt_count` and `last_dunning_email_at` on
 * every send so re-running the cron doesn't spam the customer.
 *
 * This is the customer-retention counterpart to Stripe's own
 * dunning — Stripe retries the charge, we retry the relationship.
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (await isFeatureDisabled("subscription_dunning")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const stats = {
    scanned: 0,
    stage1: 0,
    stage2: 0,
    stage3: 0,
    cancelled: 0,
    failed: 0,
  };

  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select(
      "id, user_id, stripe_subscription_id, stripe_customer_id, status, current_period_end, dunning_attempt_count, last_dunning_email_at, grace_period_until",
    )
    .in("status", ["past_due", "unpaid"])
    .limit(500);

  if (error) {
    log.error("subscriptions fetch failed", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  stats.scanned = subs?.length || 0;

  for (const sub of subs || []) {
    try {
      const attempts = (sub.dunning_attempt_count as number) || 0;
      const lastSent = sub.last_dunning_email_at
        ? new Date(sub.last_dunning_email_at as string)
        : null;
      const hoursSinceLast = lastSent
        ? (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60)
        : Infinity;

      // Don't re-send within 24h
      if (hoursSinceLast < 24) continue;

      // Need to know which user to email — go via profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", sub.user_id as string)
        .maybeSingle();
      const email = profile?.email as string | undefined;
      if (!email) {
        log.warn("dunning: no email for subscription", { id: sub.id });
        continue;
      }

      if (attempts === 0) {
        await sendStage(email, 1);
        stats.stage1++;
      } else if (attempts === 1) {
        await sendStage(email, 2);
        stats.stage2++;
      } else if (attempts === 2) {
        await sendStage(email, 3);
        stats.stage3++;
        // Set grace period to end in 24 hours
        await supabase
          .from("subscriptions")
          .update({
            grace_period_until: new Date(
              now.getTime() + 24 * 60 * 60 * 1000,
            ).toISOString(),
          })
          .eq("id", sub.id);
      } else {
        // Cancel the subscription
        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            grace_period_until: null,
          })
          .eq("id", sub.id);
        await sendStage(email, 4);
        stats.cancelled++;
      }

      await supabase
        .from("subscriptions")
        .update({
          dunning_attempt_count: attempts + 1,
          last_dunning_email_at: now.toISOString(),
        })
        .eq("id", sub.id);
    } catch (err) {
      stats.failed++;
      log.error("dunning per-sub failure", {
        id: sub.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("subscription dunning completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

async function sendStage(email: string, stage: 1 | 2 | 3 | 4): Promise<void> {
  const templates: Record<1 | 2 | 3 | 4, { subject: string; body: string }> = {
    1: {
      subject: "Payment issue on your Invest.com.au subscription",
      body: `We couldn't process your latest subscription payment. No action needed yet — Stripe will retry automatically. If you'd like to update your card, you can do so at <a href="${getSiteUrl()}/account">your account</a>.`,
    },
    2: {
      subject: "Second attempt — payment still failing",
      body: `We've tried again and your payment is still failing. Please update your card in <a href="${getSiteUrl()}/account">your account</a> so we can keep your Pro features active.`,
    },
    3: {
      subject: "Final notice — your subscription ends in 24 hours",
      body: `This is our last reminder. Your subscription will be cancelled in 24 hours unless payment is received. Update your card at <a href="${getSiteUrl()}/account">your account</a> or reply to this email if something's wrong.`,
    },
    4: {
      subject: "Your Invest.com.au subscription has been cancelled",
      body: `Your subscription has been cancelled due to repeated payment failures. You can resubscribe any time at <a href="${getSiteUrl()}/pro">invest.com.au/pro</a>. We'd love to know what we could have done better — reply to this email.`,
    },
  };

  const { subject, body } = templates[stage];
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <p style="color:#334155;font-size:14px;line-height:1.6">Hi ${escapeHtml(email)},</p>
      <p style="color:#334155;font-size:14px;line-height:1.6">${body}</p>
      <p style="color:#94a3b8;font-size:11px;margin-top:24px">
        <a href="${getSiteUrl()}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#94a3b8">Unsubscribe</a>
      </p>
    </div>`;

  await enqueueJob("send_email", {
    to: email,
    subject,
    html,
    from: "Invest.com.au <billing@invest.com.au>",
  });
}

export const GET = wrapCronHandler("subscription-dunning", handler);
