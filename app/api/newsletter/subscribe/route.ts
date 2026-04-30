import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";
import { enqueueJob } from "@/lib/job-queue";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";

const log = logger("newsletter:subscribe");

export const runtime = "nodejs";

// Allowlist prevents analytics-poisoning via arbitrary source values.
// Add new entries here when wiring up a new sign-up surface.
const ALLOWED_SOURCES = [
  "newsletter",
  "smsf_checklist",
  "learn_hub",
] as const;
type NewsletterSource = (typeof ALLOWED_SOURCES)[number];

/**
 * Body schema. Every field is optional with a server-side default so a
 * malformed/missing body still gets normalised values — the existing
 * email-validity gate below stays the gatekeeper for required fields.
 *
 * `.catch()` makes the schema infallible: if `.preference` arrives as the
 * wrong shape (or an unknown enum like "daily"), Zod silently substitutes
 * the default rather than 400-ing. That preserves the route's current
 * "drop unknown values, default to weekly" contract end-to-end.
 */
const NewsletterSubscribeSchema = z
  .object({
    email: z.string().optional(),
    name: z.string().optional(),
    preference: z.enum(["weekly", "monthly", "quarterly"]).catch("weekly"),
    source: z.enum(ALLOWED_SOURCES).catch("newsletter"),
  })
  .catch({ preference: "weekly", source: "newsletter" });

/**
 * POST /api/newsletter/subscribe
 *
 * Body: { email, name?, preference?, source? }
 *
 * Adds a row to `newsletter_subscribers`. Double opt-in via an
 * async `send_email` job so the subscribe path is fast and the
 * confirmation email retries on transient Resend failures.
 *
 * Rate limited per IP (5/hour) — newsletter signups are a nice
 * abuse vector for spam.
 */
export async function POST(request: NextRequest) {
  if (!(await isAllowed("newsletter_subscribe", ipKey(request), { max: 5, refillPerSec: 5 / 3600 }))) {
    return NextResponse.json({ error: "Too many subscriptions" }, { status: 429 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = NewsletterSubscribeSchema.parse(raw);
  const email = parsed.email ? parsed.email.trim().toLowerCase() : null;
  const name = parsed.name ? parsed.name.trim().slice(0, 100) : null;
  const preference = parsed.preference;
  const source: NewsletterSource = parsed.source;

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (isDisposableEmail(email)) {
    return NextResponse.json({ error: "Please use a real email address" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Upsert — if the user re-subscribes, reactivate them instead of
  // erroring on the unique constraint.
  const { error } = await supabase
    .from("newsletter_subscribers")
    .upsert(
      {
        email,
        name,
        preference,
        source,
        status: "active",
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
      },
      { onConflict: "email" },
    );

  if (error) {
    log.error("newsletter_subscribers upsert failed", { error: error.message });
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }

  // Queue the confirmation email as an async job so the response
  // path is fast and email delivery retries on failure.
  const siteUrl = getSiteUrl();
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h2 style="color:#0f172a;font-size:18px">Welcome to the invest.com.au newsletter</h2>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        Hi ${escapeHtml(name || "there")},
      </p>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        Thanks for signing up. You'll get the ${escapeHtml(preference)} roundup:
        broker fee changes, new comparison tools, and the occasional
        detailed scenario walkthrough. No spam.
      </p>
      <p style="margin:24px 0">
        <a href="${siteUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
          Visit the site
        </a>
      </p>
      <p style="color:#94a3b8;font-size:11px">
        You can change your cadence or unsubscribe any time at
        <a href="${siteUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#94a3b8">${siteUrl}/unsubscribe</a>.
      </p>
    </div>`;

  await enqueueJob("send_email", {
    to: email,
    subject: "Welcome to Invest.com.au",
    html,
    from: "Invest.com.au <hello@invest.com.au>",
  });

  return NextResponse.json({ ok: true });
}
