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

  // 4. Advisor billing — credit-first refund unless metadata.refund_policy = "cash"
  //
  // Looks for the originating Stripe charge in either:
  //   - advisor_credit_topups (a top-up)
  //   - advisor_billing       (a per-lead invoice)
  //
  // Default behaviour: write a `refund_to_credit` ledger row for the
  // delta vs prior credit-refunds for the same charge. Cash refunds
  // (refund_policy === "cash") skip the credit and rely on Stripe to
  // return funds to the original card — no ledger row, since no balance
  // movement.
  let advisorCreditRefundCents = 0;
  let advisorRefundIdempotent = false;
  let advisorRefundPolicy: string | null = null;

  const { data: topupRow } = await ctx.admin
    .from("advisor_credit_topups")
    .select("id, professional_id, amount_cents, status")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  const { data: billingRow } = topupRow
    ? { data: null }
    : await ctx.admin
        .from("advisor_billing")
        .select("id, professional_id, amount_cents")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle();

  const advisorSource = topupRow
    ? {
        professionalId: topupRow.professional_id as number,
        originalCents: topupRow.amount_cents as number,
        sourceType: "advisor_credit_topup" as const,
        sourceId: String(topupRow.id),
      }
    : billingRow
      ? {
          professionalId: billingRow.professional_id as number,
          originalCents: billingRow.amount_cents as number,
          sourceType: "advisor_billing" as const,
          sourceId: String(billingRow.id),
        }
      : null;

  if (advisorSource) {
    advisorRefundPolicy = (charge.metadata?.refund_policy as string) ?? "credit";
    if (advisorRefundPolicy === "cash") {
      ctx.log.info("Advisor refund issued as cash — skipping credit ledger", {
        chargeId: charge.id,
        professionalId: advisorSource.professionalId,
      });
    } else {
      // Partial-refund-safe delta — Stripe sends amount_refunded as the
      // *cumulative* amount refunded on the charge.
      // The `advisor_credit_ledger` table is new in this migration so it
      // isn't in the auto-generated database.types.ts yet; cast to a
      // loose query surface until the next types regen.
      const ledgerQuery = (
        ctx.admin as unknown as {
          from: (t: string) => {
            select: (s: string) => {
              eq: (c: string, v: string) => {
                eq: (c: string, v: string) => {
                  eq: (c: string, v: string) => Promise<{
                    data: { amount_cents: number }[] | null;
                  }>;
                };
              };
            };
          };
        }
      ).from("advisor_credit_ledger");
      const { data: priorRefunds } = await ledgerQuery
        .select("amount_cents")
        .eq("kind", "refund_to_credit")
        .eq("reference_type", "stripe_charge")
        .eq("reference_id", charge.id);
      const alreadyCreditedCents = (priorRefunds ?? []).reduce(
        (sum, r) => sum + (r.amount_cents ?? 0),
        0,
      );
      const targetCents = Math.min(refundedAmountCents, advisorSource.originalCents);
      const deltaCents = targetCents - alreadyCreditedCents;

      if (deltaCents <= 0) {
        ctx.log.info("Advisor refund already fully credited — skipping", {
          chargeId: charge.id,
          professionalId: advisorSource.professionalId,
          alreadyCreditedCents,
          targetCents,
        });
        advisorRefundIdempotent = true;
      } else {
        try {
          const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
          // For partial sequences we use the charge id + cumulative
          // suffix so each Stripe replay maps to a distinct ledger row
          // until the total target is reached.
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 24); // refund credit valid 24mo
          const result = await recordLedgerEntry({
            professionalId: advisorSource.professionalId,
            amountCents: deltaCents,
            kind: "refund_to_credit",
            description: `Stripe refund — A$${(deltaCents / 100).toFixed(2)} (${advisorSource.sourceType})`,
            referenceType: "stripe_charge",
            // referenceId is the charge.id alone (one ledger row per charge);
            // partial-refund deltas update via re-running this branch which
            // hits the unique-index idempotency path.
            referenceId: charge.id,
            expiresAt,
            createdBy: "webhook",
            metadata: {
              source_type: advisorSource.sourceType,
              source_id: advisorSource.sourceId,
              cumulative_refunded_cents: refundedAmountCents,
              original_amount_cents: advisorSource.originalCents,
            },
            supabase: ctx.admin,
          });
          advisorCreditRefundCents = deltaCents;
          advisorRefundIdempotent = result.idempotent;
        } catch (err) {
          ctx.log.error("Advisor refund-to-credit failed", {
            error: err instanceof Error ? err.message : String(err),
            chargeId: charge.id,
            professionalId: advisorSource.professionalId,
          });
        }
      }
    }

    // Mark originating row refunded if this is a full refund.
    const isFullRefund = refundedAmountCents >= advisorSource.originalCents;
    if (isFullRefund) {
      const sourceIdNum = parseInt(advisorSource.sourceId, 10);
      if (advisorSource.sourceType === "advisor_credit_topup") {
        await ctx.admin
          .from("advisor_credit_topups")
          .update({ status: "refunded" })
          .eq("id", sourceIdNum);
      } else {
        await ctx.admin
          .from("advisor_billing")
          .update({ status: "refunded" })
          .eq("id", sourceIdNum);
      }
    }
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
      advisor_credit_refund_cents: advisorCreditRefundCents,
      advisor_refund_idempotent: advisorRefundIdempotent,
      advisor_refund_policy: advisorRefundPolicy,
    },
    admin_email: "stripe_webhook",
  });

  return { status: "done" };
};
