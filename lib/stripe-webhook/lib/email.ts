/**
 * Stripe-webhook email helpers (extracted from route.ts in J-01b).
 *
 * The webhook handlers fire transactional emails on several events:
 * subscription welcome, course receipt, consultation confirmation,
 * payment-failure dunning, etc. The senders + templates lived inline
 * in `app/api/stripe/webhook/route.ts`; pulling them into a shared
 * module so the J-01a handler-registry split can move handlers into
 * `handlers/<event>.ts` files without each one re-implementing or
 * importing back-into-the-route.
 *
 * `escapeHtml` is intentionally re-exported from `@/lib/html-escape`
 * (the SSOT helper), not re-defined here. The original webhook had a
 * local copy that missed apostrophes — bug-for-bug preservation
 * isn't worth keeping.
 */

import { logger } from "@/lib/logger";
import { PLANS } from "@/lib/stripe";
import { escapeHtml } from "@/lib/html-escape";

const log = logger("stripe-webhook:email");

/** Fire-and-forget email via Resend. Returns void on missing API key. */
export async function sendTransactionalEmail(
  to: string,
  subject: string,
  html: string,
  from = "Invest.com.au <hello@invest.com.au>",
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
  } catch (err) {
    log.error("Transactional email failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Common branded wrapper for transactional emails. */
export function emailWrapper(heading: string, accentColor: string, body: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #f8fafc; padding: 24px 16px;">
      <div style="background: ${accentColor}; padding: 20px 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <span style="color: #fff; font-weight: 800; font-size: 16px;">${heading}</span>
      </div>
      <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        ${body}
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 24px 0 0 0; line-height: 1.5;">
          Invest.com.au — Independent investing education &amp; comparison<br>
          <a href="https://invest.com.au/unsubscribe" style="color: #94a3b8;">Unsubscribe</a>
        </p>
      </div>
    </div>`;
}

/** Pro welcome email — fired on `customer.subscription.created`. */
export function buildProWelcomeEmail(planInterval: string | null): string {
  const isYearly = planInterval === "year";
  const planLabel = isYearly ? PLANS.yearly.label : PLANS.monthly.label;

  return emailWrapper("Welcome to Invest.com.au Pro 🎉", "#15803d", `
    <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">You're now a Pro member!</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
      Your <strong>${planLabel}</strong> subscription is active. Here's what you've unlocked:
    </p>
    <ul style="color: #334155; font-size: 14px; line-height: 1.8; margin: 0 0 20px; padding-left: 20px;">
      <li>Ad-free broker comparisons &amp; reviews</li>
      <li>Exclusive Pro-only research &amp; guides</li>
      <li>Discounted course &amp; consultation pricing</li>
      <li>Priority support</li>
    </ul>
    <div style="text-align: center; margin: 20px 0;">
      <a href="https://invest.com.au/account" style="display: inline-block; padding: 12px 28px; background: #15803d; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">Go to Your Account →</a>
    </div>
  `);
}

/** Course receipt email — fired on `checkout.session.completed` for course mode. */
export function buildCourseReceiptEmail(courseName: string, courseSlug: string, amountCents: number): string {
  const amount = (amountCents / 100).toFixed(2);

  return emailWrapper("Course Purchase Confirmed ✅", "#0f172a", `
    <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">You're in!</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
      Your purchase of <strong>${escapeHtml(courseName)}</strong> has been confirmed.
    </p>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 0 0 20px;">
      <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Amount paid:</strong> A$${amount}</p>
      <p style="margin: 4px 0 0; font-size: 13px; color: #334155;"><strong>Access:</strong> Lifetime — start anytime</p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="https://invest.com.au/courses/${courseSlug}" style="display: inline-block; padding: 12px 28px; background: #0f172a; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">Start Learning →</a>
    </div>
  `);
}

/** Consultation confirmation email — fired on `checkout.session.completed` for consultation mode. */
export function buildConsultationConfirmationEmail(
  consultationTitle: string,
  consultationSlug: string,
  amountCents: number,
): string {
  const amount = (amountCents / 100).toFixed(2);

  return emailWrapper("Consultation Booked ✅", "#7c3aed", `
    <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">Booking confirmed!</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
      Your <strong>${escapeHtml(consultationTitle)}</strong> consultation has been booked successfully.
    </p>
    <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px; margin: 0 0 16px;">
      <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Amount paid:</strong> A$${amount}</p>
      <p style="margin: 4px 0 0; font-size: 13px; color: #334155;"><strong>Status:</strong> Confirmed</p>
    </div>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
      We'll reach out within 1–2 business days to schedule your session. Check your account for updates.
    </p>
    <div style="text-align: center; margin: 20px 0;">
      <a href="https://invest.com.au/consultations/${consultationSlug}" style="display: inline-block; padding: 12px 28px; background: #7c3aed; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">View Booking →</a>
    </div>
  `);
}
