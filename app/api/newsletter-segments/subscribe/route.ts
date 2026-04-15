import { NextRequest, NextResponse } from "next/server";
import { subscribeToNewsletter } from "@/lib/newsletter";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { sendEmail } from "@/lib/resend";
import { SITE_URL } from "@/lib/seo";
import { logger } from "@/lib/logger";

const log = logger("api:newsletter-segments:subscribe");

export const runtime = "nodejs";

/**
 * POST /api/newsletter-segments/subscribe
 *
 * Wave 16 segment-aware newsletter subscription. Writes to the
 * new newsletter_subscriptions table with double-opt-in.
 *
 * Body: { email, segment? }
 *
 * Distinct from the legacy /api/newsletter/subscribe route
 * which writes to the older newsletter_subscribers table (kept
 * for backwards compatibility with existing signup forms).
 */
export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("newsletter_segment_subscribe", ipKey(request), {
      max: 5,
      refillPerSec: 5 / 600,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : null;
  const segment = typeof body.segment === "string" ? body.segment : null;

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const result = await subscribeToNewsletter({ email, segmentSlug: segment });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (result.alreadyConfirmed) {
    return NextResponse.json({
      ok: true,
      message: "You are already subscribed.",
      already_confirmed: true,
    });
  }

  // Best-effort confirmation email. If Resend is not configured
  // (staging/dev) the helper silently no-ops.
  if (result.confirmationToken) {
    try {
      const confirmUrl = `${SITE_URL}/newsletter/confirm?token=${encodeURIComponent(result.confirmationToken)}`;
      await sendEmail({
        to: email.trim().toLowerCase(),
        from: "Invest.com.au <newsletter@invest.com.au>",
        subject: "Confirm your Invest.com.au newsletter subscription",
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <h2 style="color:#0f172a;font-size:18px">Almost there</h2>
            <p style="color:#334155;font-size:14px;line-height:1.6">
              Thanks for subscribing to the Invest.com.au newsletter${segment ? ` (${segment})` : ""}.
              Confirm your email to start receiving updates.
            </p>
            <p style="margin:24px 0">
              <a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
                Confirm subscription
              </a>
            </p>
            <p style="color:#94a3b8;font-size:11px">If you did not subscribe, ignore this email — no further action needed.</p>
          </div>
        `,
      });
    } catch (err) {
      log.warn("confirmation email failed", {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ ok: true, message: "Check your inbox to confirm." });
}
