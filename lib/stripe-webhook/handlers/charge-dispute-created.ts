import type Stripe from "stripe";
import type { WebhookHandler } from "../types";

/**
 * Handler for `charge.dispute.created`.
 *
 * Disputes need immediate human attention — they have a hard deadline
 * (usually 7-21 days depending on reason) to submit evidence, and
 * losing a dispute means losing the original charge plus a $15 dispute
 * fee. This handler:
 *
 *   1. Fires an alert email to `hello@invest.com.au` with amount, reason,
 *      Stripe dashboard link.
 *   2. Writes an `admin_audit_log` row so the event surfaces in the
 *      ops dashboard regardless of email delivery.
 *
 * Idempotency: every step is safe to re-run. Email is fire-and-forget
 * (Resend's own dedup is downstream of us); the audit-log insert
 * doesn't have a unique constraint on `entity_id`, so a Stripe retry
 * would write a duplicate row — acceptable cost for the audit trail.
 *
 * Migrated from `app/api/stripe/webhook/route.ts:1104-1158` as part of
 * J-01a (handler-registry split). Behaviour is byte-for-byte the same.
 */
export const handleChargeDisputeCreated: WebhookHandler = async (event, ctx) => {
  const dispute = event.data.object as Stripe.Dispute;
  const chargeId =
    typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;

  // Alert admin immediately — disputes need manual attention
  if (process.env.RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Invest.com.au <alerts@invest.com.au>",
          to: ["hello@invest.com.au"],
          subject: `⚠️ Stripe Dispute Created — $${(dispute.amount / 100).toFixed(2)}`,
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
              <div style="background: #dc2626; padding: 16px 24px; border-radius: 12px 12px 0 0;">
                <span style="color: #fff; font-weight: 800; font-size: 14px;">⚠️ Dispute Alert</span>
              </div>
              <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
                <p style="margin: 0 0 12px; font-size: 14px; color: #0f172a;"><strong>Amount:</strong> $${(dispute.amount / 100).toFixed(2)}</p>
                <p style="margin: 0 0 12px; font-size: 14px; color: #0f172a;"><strong>Reason:</strong> ${dispute.reason}</p>
                <p style="margin: 0 0 12px; font-size: 14px; color: #0f172a;"><strong>Charge:</strong> ${chargeId}</p>
                <p style="margin: 0 0 16px; font-size: 14px; color: #0f172a;"><strong>Status:</strong> ${dispute.status}</p>
                <a href="https://dashboard.stripe.com/disputes/${dispute.id}" style="display: inline-block; padding: 10px 20px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">View in Stripe →</a>
              </div>
            </div>
          `,
        }),
      });
    } catch (err) {
      ctx.log.error("Dispute alert email failed", {
        err: err instanceof Error ? err.message : String(err),
        disputeId: dispute.id,
      });
    }
  }

  // Audit log
  await ctx.admin.from("admin_audit_log").insert({
    action: "stripe_dispute",
    entity_type: "dispute",
    entity_id: dispute.id,
    entity_name: chargeId || "unknown",
    details: {
      amount_cents: dispute.amount,
      reason: dispute.reason,
      status: dispute.status,
    },
    admin_email: "stripe_webhook",
  });

  return { status: "done" };
};
