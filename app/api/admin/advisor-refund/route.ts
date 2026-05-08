/**
 * Admin-only path to issue an advisor refund.
 *
 * Calls Stripe `refunds.create` with metadata that the
 * `charge.refunded` webhook reads to decide between credit-back
 * (default) and cash-back. The webhook never carries admin context;
 * this route is the only path that can flip a refund to cash.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_EMAILS } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

const log = logger("admin-advisor-refund");

const Body = z.object({
  // Either a Stripe charge id (`ch_...`) or a payment-intent id (`pi_...`).
  // Most ops paths have the payment-intent stored on advisor_billing /
  // advisor_credit_topups; we resolve to the charge id internally.
  charge_id: z.string().min(3).optional(),
  payment_intent_id: z.string().min(3).optional(),
  amount_cents: z.number().int().positive().optional(),         // omit for full refund
  refund_policy: z.enum(["credit", "cash"]).default("credit"),
  refund_reason: z.string().min(1).max(500),
}).refine(
  (b) => Boolean(b.charge_id || b.payment_intent_id),
  { message: "charge_id or payment_intent_id is required" },
);

export const POST = withValidatedBody(Body, async (request: NextRequest, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !ADMIN_EMAILS.includes(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let stripe;
  try {
    const stripeModule = await import("@/lib/stripe");
    stripe = stripeModule.getStripe();
  } catch {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  // Resolve charge id from payment-intent if needed
  let chargeId = body.charge_id;
  if (!chargeId && body.payment_intent_id) {
    try {
      const pi = await stripe.paymentIntents.retrieve(body.payment_intent_id, {
        expand: ["latest_charge"],
      });
      const latest = pi.latest_charge;
      chargeId = typeof latest === "string" ? latest : latest?.id;
    } catch (err) {
      log.error("Failed to resolve charge from payment intent", {
        error: err instanceof Error ? err.message : String(err),
        payment_intent_id: body.payment_intent_id,
      });
    }
  }

  if (!chargeId) {
    return NextResponse.json({ error: "Could not resolve a Stripe charge id" }, { status: 400 });
  }

  let refund;
  try {
    refund = await stripe.refunds.create(
      {
        charge: chargeId,
        amount: body.amount_cents,
        metadata: {
          refund_policy: body.refund_policy,
          refund_reason: body.refund_reason,
          ops_actor_email: user.email,
        },
      },
      {
        // Idempotency: same charge + actor + minute window collapses.
        idempotencyKey: `advisor_refund_${chargeId}_${user.email}_${Math.floor(Date.now() / 60000)}`,
      },
    );
  } catch (err) {
    log.error("Stripe refund creation failed", {
      error: err instanceof Error ? err.message : String(err),
      chargeId,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stripe refund failed" },
      { status: 500 },
    );
  }

  await createAdminClient().from("admin_audit_log").insert({
    action: "advisor_refund_issued",
    entity_type: "stripe_charge",
    entity_id: chargeId,
    admin_email: user.email,
    details: {
      refund_id: refund.id,
      amount_cents: refund.amount,
      refund_policy: body.refund_policy,
      refund_reason: body.refund_reason,
    },
  });

  log.info("Advisor refund issued", {
    chargeId,
    refundId: refund.id,
    refundPolicy: body.refund_policy,
    actor: user.email,
  });

  return NextResponse.json({
    ok: true,
    refund_id: refund.id,
    amount_cents: refund.amount,
    refund_policy: body.refund_policy,
  });
});
