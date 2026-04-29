/**
 * Handler for `charge.refunded`.
 *
 * Three concurrent refund flows depending on what the original charge
 * paid for:
 *   1. Course purchase → revoke access + delete revenue tracking row.
 *   2. Wallet top-up → reverse the credit (partial-refund safe via
 *      cumulative-reversal accounting against `wallet_transactions`).
 *   3. Consultation booking → mark booking refunded.
 *
 * After the three flows, write an `admin_audit_log` row capturing what
 * was actioned (course revoked / wallet reversed / consultation
 * cancelled) so the audit trail shows the refund's downstream effects.
 *
 * Migrated from `app/api/stripe/webhook/route.ts:746-886` as part of
 * J-01c-1. Behaviour is byte-for-byte preserved, including:
 *   - early-return when `payment_intent` is missing (`return { status:
 *     "done" }` instead of `break` — the dispatch loop's idempotency
 *     stamp expects a result object, not a fall-through);
 *   - the partial-refund-safe `wallet_transactions` accounting block
 *     (Stripe sends `amount_refunded` as cumulative; subtract prior
 *     reversals before debiting; cap against original deposit);
 *   - the dynamic `import("@/lib/marketplace/wallet")` to keep that
 *     module's heavy deps out of the cold path when refunds aren't
 *     wallet-related.
 */

import type Stripe from "stripe";
import type { WebhookHandler } from "../types";

export const handleChargeRefunded: WebhookHandler = async (event, ctx) => {
  const charge = event.data.object as Stripe.Charge;
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id || null;
  const refundedAmountCents = charge.amount_refunded;

  if (!paymentIntentId) return { status: "done" };

  // 1. Check if this was a course purchase — revoke access
  const { data: coursePurchase } = await ctx.admin
    .from("course_purchases")
    .select("id, user_id, course_slug, amount_paid")
    .eq("stripe_payment_id", paymentIntentId)
    .maybeSingle();

  if (coursePurchase) {
    await ctx.admin
      .from("course_purchases")
      .update({ refunded: true, refunded_at: new Date().toISOString() })
      .eq("id", coursePurchase.id);

    // Delete associated revenue record
    await ctx.admin
      .from("course_revenue")
      .delete()
      .eq("purchase_id", coursePurchase.id);

    ctx.log.info("Course purchase refunded", {
      courseSlug: coursePurchase.course_slug,
      userId: coursePurchase.user_id,
    });
  }

  // 2. Check if this was a wallet top-up — reverse the credit
  const { data: walletTxn } = await ctx.admin
    .from("wallet_transactions")
    .select("id, broker_slug, amount_cents")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .eq("type", "deposit")
    .maybeSingle();

  if (walletTxn) {
    try {
      const { debitWallet } = await import("@/lib/marketplace/wallet");

      // Partial-refund-safe reversal. Stripe sends `charge.refunded`
      // with `charge.amount_refunded` as the *cumulative* amount
      // refunded on the charge. If a user has already been partially
      // refunded (say $50) and we later refund another $50, the
      // second event has amount_refunded = $100. Naïvely calling
      // debitWallet($100) would over-reverse by $50.
      //
      // Fix: look up prior reversals for this charge (by the
      // reference_id we set below), sum them, and only reverse the
      // delta. Also capped against the original top-up amount so a
      // bug in Stripe's side can never drain more than the deposit.
      const { data: priorReversals } = await ctx.admin
        .from("wallet_transactions")
        .select("amount_cents")
        .eq("broker_slug", walletTxn.broker_slug)
        .eq("type", "spend")
        .eq("reference_type", "stripe_refund")
        .eq("reference_id", charge.id);

      const alreadyReversedCents = (priorReversals || []).reduce(
        (sum, r) => sum + (r.amount_cents || 0),
        0,
      );
      const targetReversalCents = Math.min(refundedAmountCents, walletTxn.amount_cents);
      const deltaCents = targetReversalCents - alreadyReversedCents;

      if (deltaCents <= 0) {
        ctx.log.info("Wallet refund already fully reversed — skipping", {
          brokerSlug: walletTxn.broker_slug,
          chargeId: charge.id,
          alreadyReversedCents,
          targetReversalCents,
        });
      } else {
        await debitWallet(
          walletTxn.broker_slug,
          deltaCents,
          `Stripe refund reversal — $${(deltaCents / 100).toFixed(2)}`,
          { type: "stripe_refund", id: charge.id }
        );

        // Notify broker
        await ctx.admin.from("broker_notifications").insert({
          broker_slug: walletTxn.broker_slug,
          type: "wallet_refund",
          title: "Wallet Top-Up Reversed",
          message: `A refund of $${(deltaCents / 100).toFixed(2)} was processed. Your wallet balance has been adjusted.`,
          link: "/broker-portal/wallet",
          is_read: false,
          email_sent: false,
        });

        ctx.log.info("Wallet refund reversed", {
          brokerSlug: walletTxn.broker_slug,
          deltaCents,
          cumulativeRefundedCents: refundedAmountCents,
        });
      }
    } catch (err) {
      ctx.log.error("Wallet refund reversal failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 3. Check if this was a consultation booking — cancel it
  const { data: booking } = await ctx.admin
    .from("consultation_bookings")
    .select("id, user_id, consultation_id")
    .eq("stripe_payment_id", paymentIntentId)
    .maybeSingle();

  if (booking) {
    await ctx.admin
      .from("consultation_bookings")
      .update({ status: "refunded", refunded_at: new Date().toISOString() })
      .eq("id", booking.id);

    ctx.log.info("Consultation booking refunded", { bookingId: booking.id });
  }

  // Audit log
  await ctx.admin.from("admin_audit_log").insert({
    action: "stripe_refund",
    entity_type: "charge",
    entity_id: charge.id,
    entity_name: paymentIntentId,
    details: {
      amount_refunded_cents: refundedAmountCents,
      course_purchase_revoked: !!coursePurchase,
      wallet_reversed: !!walletTxn,
      consultation_cancelled: !!booking,
    },
    admin_email: "stripe_webhook",
  });

  return { status: "done" };
};
