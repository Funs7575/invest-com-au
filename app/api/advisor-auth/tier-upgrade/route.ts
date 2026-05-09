import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { logger } from "@/lib/logger";
import { getTier, isUpgrade, prorateUpgradeCents, type AdvisorTier } from "@/lib/advisor-tiers";
import { recordFinancialAudit } from "@/lib/financial-audit";
import { enqueueJob } from "@/lib/job-queue";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";
import { recordLedgerEntry } from "@/lib/advisor-credit-ledger";

const log = logger("advisor-tier-upgrade");

export const runtime = "nodejs";

/**
 * POST /api/advisor-auth/tier-upgrade
 *
 * Body: { target_tier: 'growth'|'pro'|'elite', billing: 'monthly'|'annual' }
 *
 * Flow:
 *   1. Auth the advisor via advisor_session cookie
 *   2. Validate the target tier is real + an upgrade from current
 *   3. Create a Stripe Checkout session (subscription mode) and
 *      return the URL — the client redirects
 *   4. The existing Stripe webhook handler will flip
 *      professionals.advisor_tier on `checkout.session.completed`
 *
 * For v1 we do a simple "cancel current, start new" flow. Full
 * proration happens in the webhook after the checkout lands.
 *
 * Downgrades skip Stripe and write directly (customer keeps the
 * current tier until the end of the billing cycle).
 */
export async function POST(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // eslint-disable-next-line invest/no-unvalidated-req-json -- Pre-existing endpoint with inline narrow type-guards on each field; advisor-session-gated. Tracked for migration to withValidatedBody in a dedicated cleanup PR.
  const body = await request.json().catch(() => ({}));
  const targetTier = typeof body.target_tier === "string" ? body.target_tier : null;
  const billing = body.billing === "annual" ? "annual" : "monthly";
  if (!targetTier) {
    return NextResponse.json({ error: "Missing target_tier" }, { status: 400 });
  }
  const tier = getTier(targetTier);
  if (!tier) {
    return NextResponse.json({ error: "Unknown tier" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: advisor } = await admin
    .from("professionals")
    .select("id, email, name, advisor_tier, stripe_customer_id, pending_tier")
    .eq("id", advisorId)
    .maybeSingle();
  if (!advisor) {
    return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
  }

  const currentTier = (advisor.advisor_tier as AdvisorTier) || "free";

  // Same tier → no-op
  if (currentTier === targetTier) {
    return NextResponse.json(
      { ok: true, message: "Already on this tier" },
      { status: 200 },
    );
  }

  // ── Downgrade path — defer to end of billing cycle ──────────────
  // Reads the advisor's active Stripe subscription, prorates the
  // unused days into a portal credit, stamps pending_tier on the
  // advisor row (visible in the BillingTab DowngradeBanner), and
  // tells Stripe to cancel at period end. The actual advisor_tier
  // flip happens when the customer.subscription.deleted webhook
  // fires at cycle end.
  if (!isUpgrade(currentTier, targetTier as AdvisorTier)) {
    if (advisor.pending_tier) {
      return NextResponse.json(
        { error: "A downgrade is already scheduled. Cancel it before queuing another." },
        { status: 409 },
      );
    }

    // Default cycle end = today + 30 days; refined below if we find a
    // Stripe subscription with a real current_period_end.
    let cycleEnd = new Date(Date.now() + 30 * 86400_000);
    let daysRemaining = 30;
    let stripeSubscriptionId: string | null = null;

    if (advisor.stripe_customer_id) {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("stripe_subscription_id, current_period_end, status")
        .eq("stripe_customer_id", advisor.stripe_customer_id as string)
        .in("status", ["active", "trialing", "past_due"])
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sub?.current_period_end) {
        cycleEnd = new Date(sub.current_period_end as string);
        daysRemaining = Math.max(
          1,
          Math.ceil((cycleEnd.getTime() - Date.now()) / 86400_000),
        );
        stripeSubscriptionId = (sub.stripe_subscription_id as string) ?? null;
      }
    }

    // prorateUpgradeCents returns negative when the new tier is cheaper
    // (i.e. money owed to the advisor). Flip sign so the ledger row is
    // a positive credit.
    const proration = prorateUpgradeCents(
      currentTier,
      targetTier as AdvisorTier,
      daysRemaining,
      30,
      billing,
    );
    const creditCents = proration < 0 ? -proration : 0;

    if (creditCents > 0) {
      await recordLedgerEntry({
        professionalId: advisor.id as number,
        amountCents: creditCents,
        kind: "tier_proration_credit",
        description: `Downgrade proration credit (${currentTier} → ${targetTier}, ${daysRemaining} days remaining)`,
        referenceType: "tier_downgrade",
        referenceId: `pro_${advisor.id}_${Date.now()}`,
        expiresAt: null, // proration credits are owed money, never expire
        createdBy: "advisor",
        metadata: { from: currentTier, to: targetTier, billing, days_remaining: daysRemaining },
      });
    }

    await admin
      .from("professionals")
      .update({
        pending_tier: targetTier,
        pending_tier_effective_at: cycleEnd.toISOString(),
      })
      .eq("id", advisor.id);

    // Tell Stripe to cancel at period end. Metadata is read by the
    // customer.subscription.deleted webhook to flip the tier.
    if (stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
      try {
        const { getStripe } = await import("@/lib/stripe");
        await getStripe().subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: true,
          metadata: {
            pending_tier: targetTier,
            downgrade_initiated_at: new Date().toISOString(),
            advisor_id: String(advisor.id),
          },
        });
      } catch (err) {
        log.error("Stripe cancel_at_period_end failed", {
          error: err instanceof Error ? err.message : String(err),
          stripeSubscriptionId,
        });
      }
    }

    await recordFinancialAudit({
      actorType: "advisor",
      actorId: advisor.email as string,
      action: "adjustment",
      resourceType: "professionals.advisor_tier",
      resourceId: advisor.id as number,
      reason: `Self-service deferred downgrade from ${currentTier} to ${targetTier}`,
      context: {
        from: currentTier,
        to: targetTier,
        billing,
        effective_at: cycleEnd.toISOString(),
        proration_credit_cents: creditCents,
      },
    });

    await enqueueJob("send_email", {
      to: advisor.email,
      subject: `Your plan will change to ${tier.label} on ${cycleEnd.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}`,
      from: "Invest.com.au <advisors@invest.com.au>",
      html: `<p>Hi ${escapeHtml((advisor.name as string) || "there")},</p>
<p>You're on <strong>${escapeHtml(currentTier)}</strong> until <strong>${escapeHtml(cycleEnd.toLocaleDateString("en-AU"))}</strong>, then <strong>${escapeHtml(tier.label)}</strong>.</p>
<p>Unused subscription days have been credited to your portal balance${creditCents > 0 ? ` ($${(creditCents / 100).toFixed(2)})` : ""}. You can cancel this downgrade any time from the advisor portal.</p>`,
    });

    return NextResponse.json({
      ok: true,
      tier: currentTier,
      pending_tier: targetTier,
      pending_tier_effective_at: cycleEnd.toISOString(),
      proration_credit_cents: creditCents,
      action: "deferred_downgrade",
    });
  }

  // Upgrade path — stripe checkout (Stripe is optional in dev; we
  // surface a placeholder URL when unconfigured so the portal UI
  // still renders and gives the dev a signal)
  if (!process.env.STRIPE_SECRET_KEY) {
    log.warn("Stripe not configured — returning placeholder", { target: targetTier });
    return NextResponse.json({
      ok: true,
      checkout_url: `${getSiteUrl()}/advisor-portal/upgrade/thanks?tier=${targetTier}`,
      action: "stripe_not_configured",
    });
  }

  try {
    const stripeModule = await import("@/lib/stripe");
    const stripe = stripeModule.getStripe();
    const price = billing === "annual" ? tier.annualPriceCents : tier.monthlyPriceCents;
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: `${getSiteUrl()}/advisor-portal/upgrade/thanks?tier=${targetTier}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getSiteUrl()}/advisor-portal/upgrade`,
      customer_email: advisor.email as string,
      line_items: [
        {
          price_data: {
            currency: "aud",
            recurring: { interval: billing === "annual" ? "year" : "month" },
            unit_amount: price,
            product_data: {
              name: `Invest.com.au ${tier.label} — ${billing}`,
              description: tier.features[0],
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "advisor_tier_upgrade",
        professional_id: String(advisor.id),
        from_tier: currentTier,
        to_tier: targetTier,
        billing,
      },
    });

    return NextResponse.json({
      ok: true,
      checkout_url: checkout.url,
      action: "upgrade_checkout",
    });
  } catch (err) {
    log.error("Stripe checkout creation failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to start checkout" },
      { status: 500 },
    );
  }
}
