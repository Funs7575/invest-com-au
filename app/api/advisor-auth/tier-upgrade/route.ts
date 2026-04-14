import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import { getTier, isUpgrade, type AdvisorTier } from "@/lib/advisor-tiers";
import { recordFinancialAudit } from "@/lib/financial-audit";
import { enqueueJob } from "@/lib/job-queue";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";

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
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("advisor_session")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("advisor_sessions")
    .select("professional_id, expires_at")
    .eq("token", sessionToken)
    .maybeSingle();

  if (
    !session ||
    !session.professional_id ||
    (session.expires_at && new Date(session.expires_at as string).getTime() < Date.now())
  ) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

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
    .select("id, email, name, advisor_tier")
    .eq("id", session.professional_id)
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

  // Downgrade path — skip Stripe, stamp directly, schedule the
  // downgrade for the end of the cycle (we simplify: take effect
  // immediately and queue a confirmation email)
  if (!isUpgrade(currentTier, targetTier as AdvisorTier)) {
    await admin
      .from("professionals")
      .update({
        advisor_tier: targetTier,
        tier_changed_at: new Date().toISOString(),
        tier_changed_by: advisor.email,
        tier_change_reason: "self_service_downgrade",
      })
      .eq("id", advisor.id);

    await recordFinancialAudit({
      actorType: "advisor",
      actorId: advisor.email as string,
      action: "adjustment",
      resourceType: "professionals.advisor_tier",
      resourceId: advisor.id as number,
      reason: `Self-service downgrade from ${currentTier} to ${targetTier}`,
      context: { from: currentTier, to: targetTier, billing },
    });

    await enqueueJob("send_email", {
      to: advisor.email,
      subject: `Your plan has been changed to ${tier.label}`,
      from: "Invest.com.au <advisors@invest.com.au>",
      html: `<p>Hi ${escapeHtml((advisor.name as string) || "there")},</p><p>Your plan is now <strong>${escapeHtml(tier.label)}</strong>. The change takes effect immediately. You can upgrade again any time from the advisor portal.</p>`,
    });

    return NextResponse.json({
      ok: true,
      tier: targetTier,
      action: "downgraded",
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
