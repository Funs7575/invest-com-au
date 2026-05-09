/**
 * DELETE /api/advisor-auth/tier-upgrade/pending
 *
 * Cancels a queued tier downgrade. Un-cancels the Stripe subscription
 * (cancel_at_period_end → false), claws back the proration credit via
 * an `admin_adjustment` ledger row, and clears the pending_tier
 * columns. The advisor stays on their current tier.
 *
 * Tier-upgrade clawbacks intentionally use kind=`admin_adjustment` (not
 * a separate kind) so the unified ledger view groups all corrections
 * under one badge while still surfacing the reason in metadata.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { logger } from "@/lib/logger";
import { recordFinancialAudit } from "@/lib/financial-audit";
import { recordLedgerEntry } from "@/lib/advisor-credit-ledger";

const log = logger("advisor-tier-upgrade-pending");

export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: advisor } = await admin
    .from("professionals")
    .select(
      "id, email, advisor_tier, stripe_customer_id, pending_tier, pending_tier_effective_at",
    )
    .eq("id", advisorId)
    .maybeSingle();

  if (!advisor) {
    return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
  }
  if (!advisor.pending_tier) {
    return NextResponse.json({ error: "No pending downgrade to cancel" }, { status: 404 });
  }

  // Look up the prior proration credit so we know how much to claw back.
  const { data: prorationRows } = await admin
    .from("advisor_credit_ledger")
    .select("id, amount_cents, reference_id")
    .eq("professional_id", advisor.id)
    .eq("kind", "tier_proration_credit")
    .order("created_at", { ascending: false })
    .limit(1);

  const lastProration = prorationRows && prorationRows.length > 0 ? prorationRows[0] : null;
  const clawbackCents = lastProration?.amount_cents
    ? -(lastProration.amount_cents as number)
    : 0;

  if (clawbackCents !== 0) {
    await recordLedgerEntry({
      professionalId: advisor.id as number,
      amountCents: clawbackCents,
      kind: "admin_adjustment",
      description: "Cancelled pending downgrade — proration credit reversed",
      referenceType: "tier_downgrade_clawback",
      referenceId: String(lastProration?.reference_id ?? `pro_${advisor.id}_cancel_${Date.now()}`),
      expiresAt: null,
      createdBy: "advisor",
      metadata: {
        reason: "cancelled_pending_downgrade",
        from_pending_tier: advisor.pending_tier,
      },
    });
  }

  // Un-cancel the Stripe subscription if there is one.
  if (advisor.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const { getStripe } = await import("@/lib/stripe");
      const stripe = getStripe();
      const { data: sub } = await admin
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("stripe_customer_id", advisor.stripe_customer_id as string)
        .in("status", ["active", "trialing", "past_due"])
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sub?.stripe_subscription_id) {
        await stripe.subscriptions.update(sub.stripe_subscription_id as string, {
          cancel_at_period_end: false,
          metadata: { pending_tier: "" },
        });
      }
    } catch (err) {
      log.error("Stripe un-cancel failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await admin
    .from("professionals")
    .update({ pending_tier: null, pending_tier_effective_at: null })
    .eq("id", advisor.id);

  await recordFinancialAudit({
    actorType: "advisor",
    actorId: advisor.email as string,
    action: "adjustment",
    resourceType: "professionals.advisor_tier",
    resourceId: advisor.id as number,
    reason: `Cancelled pending downgrade to ${advisor.pending_tier}`,
    context: {
      cancelled_pending_tier: advisor.pending_tier,
      clawback_cents: clawbackCents,
    },
  });

  return NextResponse.json({
    ok: true,
    cancelled_pending_tier: advisor.pending_tier,
    clawback_cents: clawbackCents,
  });
}
