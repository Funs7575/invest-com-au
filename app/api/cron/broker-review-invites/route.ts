import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { SITE_URL } from "@/lib/seo";

const log = logger("cron:broker-review-invites");

export const maxDuration = 60;

/**
 * Broker review-invite cron.
 *
 * Converts affiliate clicks into review-requests. Flow:
 *
 *   1. Find affiliate_clicks from 7-30 days ago with a session_id
 *   2. Join to email_captures to resolve an email for that session
 *   3. Skip suppressed / unsubscribed emails
 *   4. Skip any (email, broker_slug) we've already invited in last 90 days
 *   5. Create a broker_review_invites row + token
 *   6. Send a Resend email with the magic link /review/broker/{token}
 *
 * Runs daily at 10:00 AEST. Max 50 invites per run to stay well under
 * Resend and cron timeouts — the natural cadence of clicks won't
 * exceed this at current volumes.
 */

const MAX_INVITES_PER_RUN = 50;
const CLICK_MIN_AGE_DAYS = 7;
const CLICK_MAX_AGE_DAYS = 30;
const DEDUP_WINDOW_DAYS = 90;

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = Date.now();
  const minAge = new Date(
    now - CLICK_MIN_AGE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const maxAge = new Date(
    now - CLICK_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dedupCutoff = new Date(
    now - DEDUP_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Pull eligible affiliate clicks with session_id in the target window.
  const { data: clicks, error: clickErr } = await supabase
    .from("affiliate_clicks")
    .select("broker_id, broker_slug, broker_name, session_id, clicked_at")
    .gte("clicked_at", maxAge)
    .lte("clicked_at", minAge)
    .not("session_id", "is", null)
    .order("clicked_at", { ascending: false })
    .limit(500);

  if (clickErr || !clicks || clicks.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: "no eligible clicks" });
  }

  // Resolve session_id → email via email_captures
  const sessionIds = Array.from(
    new Set(clicks.map((c) => c.session_id).filter(Boolean)),
  );
  const { data: captures } = await supabase
    .from("email_captures")
    .select("email, session_id, unsubscribed, status")
    .in("session_id", sessionIds as string[])
    .eq("unsubscribed", false)
    .neq("status", "suppressed");

  const sessionToEmail = new Map<string, string>();
  for (const cap of captures ?? []) {
    if (cap.session_id && cap.email && !sessionToEmail.has(cap.session_id)) {
      sessionToEmail.set(cap.session_id, cap.email);
    }
  }

  if (sessionToEmail.size === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      reason: "no captured emails match these sessions",
    });
  }

  // Build unique (email, broker_slug) candidate set — newest click wins
  const candidates = new Map<
    string,
    { email: string; broker_slug: string; broker_id: number | null; broker_name: string }
  >();
  for (const c of clicks) {
    const email = c.session_id ? sessionToEmail.get(c.session_id) : null;
    if (!email) continue;
    const key = `${email}|${c.broker_slug}`;
    if (!candidates.has(key)) {
      candidates.set(key, {
        email,
        broker_slug: c.broker_slug,
        broker_id: c.broker_id ?? null,
        broker_name: c.broker_name ?? c.broker_slug,
      });
    }
  }

  // Suppress candidates already invited for this broker in the last 90 days
  const emails = Array.from(new Set([...candidates.values()].map((c) => c.email)));
  const { data: priorInvites } = await supabase
    .from("broker_review_invites")
    .select("email, broker_slug")
    .in("email", emails)
    .gte("sent_at", dedupCutoff);
  const suppressedKeys = new Set(
    (priorInvites ?? []).map((p) => `${p.email}|${p.broker_slug}`),
  );

  // Suppress emails on the suppression list
  const { data: suppressed } = await supabase
    .from("email_suppression_list")
    .select("email")
    .in("email", emails);
  const suppressedEmails = new Set(
    (suppressed ?? []).map((s) => s.email as string),
  );

  const toSend = [...candidates.values()]
    .filter((c) => !suppressedKeys.has(`${c.email}|${c.broker_slug}`))
    .filter((c) => !suppressedEmails.has(c.email))
    .slice(0, MAX_INVITES_PER_RUN);

  let sent = 0;
  let failed = 0;

  for (const c of toSend) {
    // Create the invite row first — the token is what the email links to
    const { data: invite, error: insertErr } = await supabase
      .from("broker_review_invites")
      .insert({
        email: c.email,
        broker_slug: c.broker_slug,
        broker_id: c.broker_id,
      })
      .select("token")
      .single();

    if (insertErr || !invite) {
      log.error("invite_insert_failed", {
        email: c.email,
        broker: c.broker_slug,
        err: insertErr?.message,
      });
      failed++;
      continue;
    }

    const reviewUrl = `${SITE_URL}/review/broker/${invite.token}`;
    const unsubUrl = `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(c.email)}`;
    const html = renderInviteEmail({
      brokerName: c.broker_name,
      brokerSlug: c.broker_slug,
      reviewUrl,
      unsubUrl,
    });

    const result = await sendEmail({
      to: c.email,
      subject: `How was your experience with ${c.broker_name}?`,
      html,
    });

    if (result.ok) {
      sent++;
    } else {
      failed++;
      log.warn("send_failed", {
        email: c.email,
        broker: c.broker_slug,
        err: result.error,
      });
    }
  }

  return NextResponse.json({ ok: true, sent, failed, candidates: toSend.length });
}

function renderInviteEmail(opts: {
  brokerName: string;
  brokerSlug: string;
  reviewUrl: string;
  unsubUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; padding: 24px;">
    <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 28px; border: 1px solid #e2e8f0;">
      <p style="font-size: 13px; color: #64748b; margin: 0 0 8px;">invest.com.au</p>
      <h1 style="font-size: 20px; color: #0f172a; margin: 0 0 12px;">How did it go with ${opts.brokerName}?</h1>
      <p style="font-size: 14px; line-height: 1.55; color: #334155; margin: 0 0 16px;">
        You recently visited <strong>${opts.brokerName}</strong> through our comparison.
        A quick honest review helps other Australians choose — it takes under two minutes.
      </p>
      <p style="margin: 0 0 24px;">
        <a href="${opts.reviewUrl}"
           style="display: inline-block; background: #f59e0b; color: white; font-weight: 700; text-decoration: none; padding: 12px 22px; border-radius: 10px; font-size: 14px;">
          Leave a review
        </a>
      </p>
      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 6px;">
        This is a personalised magic link — no login required. Reviews are moderated before publishing and your email is never shared.
      </p>
      <p style="font-size: 11px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 14px;">
        Not interested? <a href="${opts.unsubUrl}" style="color: #94a3b8;">Unsubscribe</a>.
      </p>
    </div>
  </body>
</html>`;
}
