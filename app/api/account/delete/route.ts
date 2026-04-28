import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/resend";

const log = logger("account-delete");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRACE_PERIOD_DAYS = 30;

/**
 * Build the user-facing "your account is scheduled for deletion"
 * confirmation email. Plain HTML — kept inline rather than added to
 * `lib/email-templates.ts` because:
 *   - the deletion flow is a single low-volume use case
 *   - centralising would require a new template-config plumb that
 *     none of the other one-off transactional emails use
 *
 * Emphasises (a) the cancel path, (b) the deadline date in the
 * user's locale, and (c) reassurance that data isn't deleted yet.
 */
function deletionConfirmationHtml(args: {
  email: string;
  scheduledPurgeAt: string;
  cancelUrl: string;
}): { subject: string; html: string } {
  const purgeDate = new Date(args.scheduledPurgeAt).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const subject = `Account deletion scheduled — cancel anytime before ${purgeDate}`;
  const html = `
<p>Hi,</p>
<p>We've received your request to delete the invest.com.au account associated with <strong>${args.email}</strong>.</p>
<p style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:4px">
  <strong>Your account will be permanently deleted on ${purgeDate}.</strong><br>
  We hold your data for ${GRACE_PERIOD_DAYS} days as a grace period — you can cancel this at any time before then and nothing will be lost.
</p>
<p><strong>Changed your mind?</strong> Sign in and visit <a href="${args.cancelUrl}">your account settings</a>, or simply log in within ${GRACE_PERIOD_DAYS} days. Either action cancels the deletion.</p>
<p>If you didn't request this, please <a href="${args.cancelUrl}">cancel immediately</a> and contact support — your account may be at risk.</p>
<p>Thanks for being part of invest.com.au.</p>
<p style="font-size:12px;color:#64748b;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px">
  This email was sent because someone using your account requested deletion.<br>
  Compliance: APP 11 (security and destruction of personal info) and GDPR Article 17 (right to erasure).
</p>
  `.trim();
  return { subject, html };
}

/**
 * POST /api/account/delete
 * Schedules an authenticated user's account for deletion after a
 * 30-day grace period. The actual purge is run by the existing
 * /api/cron/gdpr-retention-purge job which respects the
 * scheduled_purge_at column.
 *
 * Users may cancel via DELETE on this endpoint (sets status='cancelled').
 *
 * Body: { reason?: string }
 *
 * Compliance with APP 11 (security and destruction of personal info)
 * and GDPR Article 17 (right to erasure).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 1000) : null;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) || null;

  const scheduledPurgeAt = new Date(
    Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("account_deletion_requests")
    .upsert(
      {
        user_id: user.id,
        email: user.email ?? "",
        reason,
        scheduled_purge_at: scheduledPurgeAt,
        ip_address: ip,
        user_agent: userAgent,
        status: "scheduled",
        cancelled_at: null,
      },
      { onConflict: "user_id" }
    )
    .select("id, scheduled_purge_at")
    .single();

  if (error) {
    log.error("account_deletion_requests insert failed", error);
    return NextResponse.json({ error: "Failed to schedule deletion" }, { status: 500 });
  }

  // K-07 (audit 2026-04-26 §7 SEC-07): send a confirmation email so
  // the user has a permanent record of the deadline + a cancel link
  // they can find later. Best-effort — failure to email does not roll
  // back the scheduled deletion (the user already submitted the
  // request and the row is committed). The cron at
  // /api/cron/account-deletion-reminder (queue item K-07b) sends a
  // second nudge ~5 days before the purge for users who took no
  // further action.
  if (user.email) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au";
    const cancelUrl = `${siteUrl}/account/privacy`;
    const { subject, html } = deletionConfirmationHtml({
      email: user.email,
      scheduledPurgeAt: data.scheduled_purge_at,
      cancelUrl,
    });
    const result = await sendEmail({ to: user.email, subject, html });
    if (!result.ok) {
      // Log but don't fail the response — the deletion request is
      // already persisted and the user knows the deadline from the
      // success message below.
      log.warn("account-delete confirmation email failed", { error: result.error });
    }
  }

  return NextResponse.json({
    ok: true,
    request_id: data.id,
    scheduled_purge_at: data.scheduled_purge_at,
    grace_period_days: GRACE_PERIOD_DAYS,
    message: `Your account is scheduled for permanent deletion in ${GRACE_PERIOD_DAYS} days. You can cancel this at any time during the grace period by signing in and visiting your account settings. We've also sent a confirmation email with the exact deadline and a cancel link.`,
  });
}

/**
 * DELETE /api/account/delete
 * Cancels a previously-scheduled account deletion within the grace period.
 */
export async function DELETE(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { error } = await supabase
    .from("account_deletion_requests")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("status", "scheduled");

  if (error) {
    log.error("account_deletion_requests cancel failed", error);
    return NextResponse.json({ error: "Failed to cancel deletion" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Your account deletion request has been cancelled.",
  });
}
