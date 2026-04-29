/**
 * Handler for `radar.early_fraud_warning.created`.
 *
 * Stripe Radar signals an early fraud warning before a dispute is
 * formally filed. Proactively issuing a refund:
 *   - avoids the $15 dispute fee
 *   - keeps the dispute ratio below Stripe's 0.65% threshold
 *
 * Actions:
 *   1. Attempt a full refund on the flagged charge via the Stripe API.
 *   2. Send an alert email to the admin.
 *   3. Write to admin_audit_log with the refund outcome.
 *
 * Refund failures are non-fatal (the event is still ack'd `done`) but
 * logged at error level so the admin email always arrives for manual
 * action.
 *
 * Implemented as part of J-09.
 */

import type Stripe from "stripe";
import type { WebhookHandler } from "../types";
import { sendTransactionalEmail } from "../lib/email";
import { ADMIN_EMAIL } from "@/lib/admin";

export const handleRadarEarlyFraudWarning: WebhookHandler = async (event, ctx) => {
  const warning = event.data.object as Stripe.Radar.EarlyFraudWarning;

  const chargeId =
    typeof warning.charge === "string" ? warning.charge : (warning.charge as Stripe.Charge).id;

  ctx.log.warn("Radar early fraud warning — attempting proactive refund", {
    warningId: warning.id,
    chargeId,
    fraudType: warning.fraud_type,
  });

  let refundSucceeded = false;
  let refundId: string | null = null;

  try {
    const refund = await ctx.stripe.refunds.create({ charge: chargeId });
    refundSucceeded = refund.status === "succeeded";
    refundId = refund.id;
    ctx.log.info("Proactive refund issued to prevent dispute", { refundId, chargeId });
  } catch (err) {
    ctx.log.error("Proactive refund failed — manual action required", {
      chargeId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  sendTransactionalEmail(
    ADMIN_EMAIL,
    `🔴 Radar fraud warning — charge ${chargeId} ${refundSucceeded ? "refunded" : "REFUND FAILED"}`,
    `<div style="font-family:Arial,sans-serif;max-width:560px;padding:24px">
      <h2 style="color:#dc2626;font-size:18px">🔴 Radar Early Fraud Warning</h2>
      <p style="color:#334155;font-size:14px"><strong>Charge:</strong> ${chargeId}</p>
      <p style="color:#334155;font-size:14px"><strong>Fraud type:</strong> ${warning.fraud_type}</p>
      <p style="color:#334155;font-size:14px">
        <strong>Proactive refund:</strong> ${
          refundSucceeded ? `Issued ✅ (${refundId ?? ""})` : "Failed ❌ — manual action required"
        }
      </p>
      <a href="https://dashboard.stripe.com/charges/${chargeId}"
         style="display:inline-block;padding:10px 20px;background:#dc2626;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px">
        View charge in Stripe →
      </a>
    </div>`,
    "Invest.com.au Alerts <alerts@invest.com.au>",
  ).catch((err) =>
    ctx.log.error("Radar admin alert email failed", {
      err: err instanceof Error ? err.message : String(err),
    }),
  );

  await ctx.admin.from("admin_audit_log").insert({
    action: "radar_fraud_warning",
    entity_type: "charge",
    entity_id: chargeId,
    entity_name: warning.id,
    details: {
      fraud_type: warning.fraud_type,
      proactive_refund_succeeded: refundSucceeded,
      refund_id: refundId,
    },
    admin_email: "stripe_webhook",
  });

  return { status: "done" };
};
