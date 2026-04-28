/**
 * Handler for `payment_intent.payment_failed`.
 *
 * Distinct from `invoice.payment_failed` (which covers recurring
 * subscription billing). This handler fires on one-time payment
 * failures — course purchases, wallet top-ups, single consultation
 * payments.
 *
 * Actions:
 *   1. Look up the payment's subject (course purchase or wallet top-up)
 *      so the email copy can be specific.
 *   2. Retrieve the customer email and send a failure notification.
 *   3. Write to admin_audit_log so the incident is traceable.
 *
 * Implemented as part of J-06.
 */

import type Stripe from "stripe";
import type { WebhookHandler } from "../types";
import { sendTransactionalEmail } from "../lib/email";

export const handlePaymentIntentPaymentFailed: WebhookHandler = async (event, ctx) => {
  const pi = event.data.object as Stripe.PaymentIntent;

  const customerId =
    typeof pi.customer === "string" ? pi.customer : (pi.customer as Stripe.Customer | null)?.id ?? null;

  // Determine what the failed payment was for (best-effort)
  const { data: coursePurchase } = await ctx.admin
    .from("course_purchases")
    .select("id, user_id, course_slug")
    .eq("stripe_payment_id", pi.id)
    .maybeSingle();

  const subject = coursePurchase
    ? `your course "${coursePurchase.course_slug as string}"`
    : "your recent payment";

  if (customerId) {
    try {
      const customer = await ctx.stripe.customers.retrieve(customerId);
      if (!("deleted" in customer) && customer.email) {
        await sendTransactionalEmail(
          customer.email,
          "Payment failed — action needed",
          `<div style="font-family:Arial,sans-serif;max-width:560px;padding:24px">
            <h2 style="color:#dc2626;font-size:18px">Payment failed</h2>
            <p style="color:#334155;font-size:14px">
              We couldn&apos;t process ${subject}. This usually means the card was
              declined or expired.
            </p>
            <p style="color:#334155;font-size:14px">
              Please update your payment method to complete your purchase.
            </p>
            <a href="https://invest.com.au/account/billing"
               style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px">
              Update payment method →
            </a>
          </div>`,
        );
      }
    } catch (err) {
      ctx.log.error("payment_intent.payment_failed — customer lookup failed", {
        error: err instanceof Error ? err.message : String(err),
        paymentIntentId: pi.id,
      });
    }
  }

  await ctx.admin.from("admin_audit_log").insert({
    action: "payment_intent_failed",
    entity_type: "payment_intent",
    entity_id: pi.id,
    entity_name: pi.description ?? null,
    details: {
      amount: pi.amount,
      currency: pi.currency,
      last_payment_error: (pi.last_payment_error as { message?: string } | null)?.message ?? null,
      course_purchase_id: coursePurchase?.id ?? null,
    },
    admin_email: "stripe_webhook",
  });

  return { status: "done" };
};
