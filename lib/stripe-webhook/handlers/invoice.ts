/**
 * Handlers for `invoice.paid` and `invoice.payment_failed`.
 *
 * Two related but distinct flows:
 *   - `invoice.paid`: just delegates to `handleInvoicePaid` from
 *     `@/lib/advisor-billing` for advisor lead invoices; logs others.
 *   - `invoice.payment_failed`: delegates to `handleInvoicePaymentFailed`
 *     for advisor leads; for consumer Pro subscriptions, sends a
 *     payment-failed dunning email so the user can update their card
 *     before Stripe's dunning cycle cancels the subscription.
 *
 * Migrated from `app/api/stripe/webhook/route.ts:150-234` as part of
 * J-01c-1. Behaviour is byte-for-byte preserved:
 *   - Logging key/values match.
 *   - The "subscriptions.updated_at touch" on payment failure (which
 *     keeps the row's freshness marker in sync without requiring a
 *     dedicated `payment_failed_at` column) is preserved.
 *   - The dunning email is fire-and-await (`await sendTransactionalEmail`)
 *     to match the legacy code; if the send blocks the handler the row
 *     just stays `processing` until Stripe retries — same as before.
 */

import type Stripe from "stripe";
import type { WebhookHandler } from "../types";
import {
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from "@/lib/advisor-billing";
import { getSiteUrl } from "@/lib/url";
import {
  emailWrapper,
  sendTransactionalEmail,
} from "../lib/email";

export const handleInvoicePaidEvent: WebhookHandler = async (event, ctx) => {
  const paidInvoice = event.data.object as Stripe.Invoice;
  const paidPiId =
    typeof paidInvoice.payment_intent === "string"
      ? paidInvoice.payment_intent
      : paidInvoice.payment_intent?.id || null;

  // Check if this is an advisor lead billing invoice
  if (paidInvoice.metadata?.type === "advisor_lead") {
    await handleInvoicePaid(paidInvoice.id, paidPiId);
  }

  ctx.log.info("Invoice paid", {
    invoiceId: paidInvoice.id,
    customer: paidInvoice.customer,
  });

  return { status: "done" };
};

export const handleInvoicePaymentFailedEvent: WebhookHandler = async (event, ctx) => {
  const invoice = event.data.object as Stripe.Invoice;

  // Update advisor billing if applicable
  if (invoice.metadata?.type === "advisor_lead") {
    await handleInvoicePaymentFailed(invoice.id);
  }

  // Notify the subscriber so they can update their card before Stripe's
  // dunning cycle cancels the subscription. Previously this only
  // logged a warning, so subscribers with an expired card would
  // silently slide into past_due → canceled and only find out when
  // their Pro features stopped working. getSubscription()'s isPro
  // already excludes past_due, so access is revoked at the check
  // layer — this handler just adds the user-visible notification.
  const invCustomerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (invCustomerId && invoice.metadata?.type !== "advisor_lead") {
    try {
      const { data: subProfile } = await ctx.admin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", invCustomerId)
        .maybeSingle();

      // Tag the subscription with payment_failed_at if the column exists.
      // Safe under schema drift — errors are logged and swallowed.
      if (subProfile) {
        await ctx.admin
          .from("subscriptions")
          .update({ updated_at: new Date().toISOString() })
          .eq("stripe_customer_id", invCustomerId);
      }

      const customer = await ctx.stripe.customers.retrieve(invCustomerId);
      if (!("deleted" in customer) && customer.email) {
        const amount = ((invoice.amount_due || 0) / 100).toFixed(2);
        await sendTransactionalEmail(
          customer.email,
          "Action needed: your Invest.com.au Pro payment failed",
          emailWrapper("Payment Failed ⚠️", "#dc2626", `
                  <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">We couldn't process your renewal</h2>
                  <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                    We tried to charge your card A$${amount} for your Invest.com.au Pro
                    subscription, but the payment didn't go through.
                  </p>
                  <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                    Pro features are temporarily paused until you update your
                    payment method. We'll retry over the next few days — update
                    your card now to avoid losing access.
                  </p>
                  <div style="text-align: center; margin: 20px 0;">
                    <a href="${getSiteUrl()}/account" style="display: inline-block; padding: 12px 28px; background: #0f172a; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">Update Payment Method →</a>
                  </div>
                `),
        );
      }
    } catch (err) {
      ctx.log.error("Payment failed email error", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  ctx.log.warn("Payment failed for customer", {
    customer: invoice.customer,
    invoice: invoice.id,
  });
  // The subscription.updated webhook will also fire with status 'past_due',
  // which upsertSubscription handles automatically. Access is revoked
  // by getSubscription() since past_due is excluded from isPro.

  return { status: "done" };
};
