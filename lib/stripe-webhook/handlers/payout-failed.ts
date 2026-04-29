/**
 * Handler for `payout.failed`.
 *
 * A payout to the company's bank account failed — the most common
 * cause is an incorrect bank account number or routing code. This is
 * an internal operational event (it doesn't affect end-user data) but
 * requires immediate human action or Stripe will not reattempt.
 *
 * Actions:
 *   1. Log at warn level with the failure code and message.
 *   2. Send an alert email to the admin address.
 *   3. Write to admin_audit_log.
 *
 * Implemented as part of J-08.
 */

import type Stripe from "stripe";
import type { WebhookHandler } from "../types";
import { sendTransactionalEmail } from "../lib/email";
import { ADMIN_EMAIL } from "@/lib/admin";

export const handlePayoutFailed: WebhookHandler = async (event, ctx) => {
  const payout = event.data.object as Stripe.Payout;

  ctx.log.warn("Stripe payout failed — manual action required", {
    payoutId: payout.id,
    amount: payout.amount,
    currency: payout.currency,
    failureCode: payout.failure_code,
    failureMessage: payout.failure_message,
  });

  // Non-blocking — webhook ack must not wait on email delivery
  sendTransactionalEmail(
    ADMIN_EMAIL,
    `⚠️ Stripe payout failed — ${payout.failure_code ?? "unknown error"}`,
    `<div style="font-family:Arial,sans-serif;max-width:560px;padding:24px">
      <h2 style="color:#dc2626;font-size:18px">⚠️ Stripe Payout Failed</h2>
      <p style="color:#334155;font-size:14px">
        <strong>Amount:</strong> $${(payout.amount / 100).toFixed(2)} ${payout.currency.toUpperCase()}
      </p>
      <p style="color:#334155;font-size:14px">
        <strong>Failure code:</strong> ${payout.failure_code ?? "unknown"}
      </p>
      <p style="color:#334155;font-size:14px">
        <strong>Message:</strong> ${payout.failure_message ?? "No message provided"}
      </p>
      <p style="color:#334155;font-size:14px">
        <strong>Payout ID:</strong> ${payout.id}
      </p>
      <a href="https://dashboard.stripe.com/payouts/${payout.id}"
         style="display:inline-block;padding:10px 20px;background:#dc2626;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px">
        View in Stripe dashboard →
      </a>
    </div>`,
    "Invest.com.au Alerts <alerts@invest.com.au>",
  ).catch((err) =>
    ctx.log.error("Payout-failed admin alert email failed", {
      err: err instanceof Error ? err.message : String(err),
    }),
  );

  await ctx.admin.from("admin_audit_log").insert({
    action: "payout_failed",
    entity_type: "payout",
    entity_id: payout.id,
    entity_name: payout.description ?? null,
    details: {
      amount: payout.amount,
      currency: payout.currency,
      failure_code: payout.failure_code,
      failure_message: payout.failure_message,
    },
    admin_email: "stripe_webhook",
  });

  return { status: "done" };
};
