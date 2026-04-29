/**
 * Handler for `payment_intent.payment_failed`.
 *
 * Distinct from `invoice.payment_failed` (which covers subscription
 * renewals and advisor-lead billing): this event fires for standalone
 * PaymentIntents — one-time course purchases, consultation bookings, and
 * advisor credit top-ups. Without a handler, a failed one-time payment
 * produces no user notification; the customer has to go back to the site
 * and retry manually without understanding what went wrong.
 *
 * Resolution path:
 *   1. Retrieve customer email (from Stripe customer record if attached,
 *      or from `payment_intent.receipt_email` for guest-checkout flows).
 *   2. Include the decline reason from `last_payment_error.message` so the
 *      user gets actionable feedback (e.g., "insufficient funds", "card expired").
 *   3. Send a retry email linking to the originating page derived from
 *      `metadata.type` (course → /courses, consultation → /consultations,
 *      advisor top-up → /account, unknown → /account).
 *
 * Fire-and-forget (errors caught and logged) so a transient Resend outage
 * never blocks the webhook ack to Stripe.
 */

import type Stripe from "stripe";
import type { WebhookHandler } from "../types";
import { getSiteUrl } from "@/lib/url";
import { emailWrapper, sendTransactionalEmail } from "../lib/email";

function resolveRetryUrl(metadata: Stripe.Metadata | null, siteUrl: string): string {
  if (!metadata) return `${siteUrl}/account`;
  if (metadata.type === "course" && metadata.course_slug) {
    return `${siteUrl}/courses/${metadata.course_slug}`;
  }
  if (metadata.type === "consultation" && metadata.consultation_slug) {
    return `${siteUrl}/consultations/${metadata.consultation_slug}`;
  }
  return `${siteUrl}/account`;
}

export const handlePaymentIntentPaymentFailed: WebhookHandler = async (event, ctx) => {
  const pi = event.data.object as Stripe.PaymentIntent;
  const declineReason =
    pi.last_payment_error?.message ?? pi.last_payment_error?.code ?? "an unknown reason";
  const amount = ((pi.amount || 0) / 100).toFixed(2);
  const siteUrl = getSiteUrl();
  const retryUrl = resolveRetryUrl(pi.metadata ?? null, siteUrl);

  const recipientEmail = await (async (): Promise<string | null> => {
    const customerId =
      typeof pi.customer === "string" ? pi.customer : pi.customer?.id ?? null;
    if (customerId) {
      try {
        const customer = await ctx.stripe.customers.retrieve(customerId);
        if (!("deleted" in customer) && customer.email) return customer.email;
      } catch (err) {
        ctx.log.error("PaymentIntent failed: customer lookup error", {
          error: err instanceof Error ? err.message : String(err),
          customerId,
        });
      }
    }
    return pi.receipt_email ?? null;
  })();

  if (recipientEmail) {
    sendTransactionalEmail(
      recipientEmail,
      "Your payment didn't go through — here's how to retry",
      emailWrapper("Payment Failed ❌", "#dc2626", `
        <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">We couldn't process your payment</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
          Your payment of <strong>A$${amount}</strong> didn't go through.
          Reason: <em>${declineReason}</em>.
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          This often happens when a card has expired or insufficient funds are
          available. You can retry the payment at any time — your cart details
          are saved.
        </p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${retryUrl}" style="display: inline-block; padding: 12px 28px; background: #0f172a; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">Retry Payment →</a>
        </div>
      `),
    ).catch((err) =>
      ctx.log.error("PaymentIntent failed: email send error", {
        err: err instanceof Error ? err.message : String(err),
      }),
    );
  }

  ctx.log.warn("PaymentIntent payment failed", {
    paymentIntentId: pi.id,
    customer: pi.customer,
    amount: pi.amount,
    declineReason,
    metadataType: pi.metadata?.type,
  });

  return { status: "done" };
};
