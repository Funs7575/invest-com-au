/**
 * Auto-recharge trigger — checks if a provider's balance has dropped
 * below their configured threshold and, if so, charges their saved
 * Stripe payment method off-session to top up credits.
 *
 * Called from `acceptBrief` immediately after a credit deduction has
 * landed. Fire-and-forget: errors are logged but never block the
 * caller. The credit grant happens via the existing
 * `checkout.session.completed` webhook path (which we trigger by
 * creating a checkout session here in `payment_intent` mode — Stripe
 * charges the saved card automatically and the webhook fires).
 *
 * Idempotent: stamps `auto_recharge_last_attempted_at` to prevent a
 * double-fire from rapid concurrent brief accepts. If a recharge is
 * already in flight (started in the last 5 minutes), we skip.
 */

// eslint-disable-next-line no-restricted-imports -- payment trigger runs server-side without an advisor JWT (called from acceptBrief webhook + admin flows). Service-role legitimate per CLAUDE.md "Two Supabase clients" — payment-method writes have no user context.
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { getPack } from "@/lib/advisor-credit-packs";
import { logger } from "@/lib/logger";

const log = logger("briefs:auto-recharge");

const RECHARGE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between attempts

interface ProRow {
  id: number;
  email: string | null;
  name: string | null;
  credit_balance_cents: number | null;
  auto_recharge_enabled: boolean;
  auto_recharge_threshold_credits: number | null;
  auto_recharge_pack_slug: string | null;
  stripe_customer_id: string | null;
  stripe_default_payment_method: string | null;
  auto_recharge_last_attempted_at: string | null;
}

export async function maybeAutoRecharge(professionalId: number): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("professionals")
      .select(
        "id, email, name, credit_balance_cents, auto_recharge_enabled, auto_recharge_threshold_credits, auto_recharge_pack_slug, stripe_customer_id, stripe_default_payment_method, auto_recharge_last_attempted_at",
      )
      .eq("id", professionalId)
      .maybeSingle();

    if (!data) return;
    const pro = data as ProRow;

    if (
      !pro.auto_recharge_enabled ||
      !pro.stripe_customer_id ||
      !pro.stripe_default_payment_method ||
      !pro.auto_recharge_pack_slug
    ) {
      return;
    }

    const balanceCents = pro.credit_balance_cents ?? 0;
    const balanceCredits = Math.floor(balanceCents / 100);
    const threshold = pro.auto_recharge_threshold_credits ?? 5;
    if (balanceCredits >= threshold) return;

    // Cooldown: skip if we attempted recently.
    if (pro.auto_recharge_last_attempted_at) {
      const lastMs = new Date(pro.auto_recharge_last_attempted_at).getTime();
      if (Date.now() - lastMs < RECHARGE_COOLDOWN_MS) {
        log.info("auto-recharge cooldown active", { professionalId });
        return;
      }
    }

    const pack = getPack(pro.auto_recharge_pack_slug);
    if (!pack || !pack.isCredit) {
      log.warn("auto-recharge invalid pack", {
        professionalId,
        slug: pro.auto_recharge_pack_slug,
      });
      return;
    }

    // Stamp the attempt timestamp first so a concurrent accept won't
    // double-fire (the cooldown check above gates re-entry).
    await admin
      .from("professionals")
      .update({ auto_recharge_last_attempted_at: new Date().toISOString() })
      .eq("id", professionalId);

    let stripe;
    try {
      stripe = getStripe();
    } catch {
      log.warn("auto-recharge: stripe not configured");
      return;
    }

    // Create a topup row so the webhook can match (kind, reference_id)
    // for idempotency. Same shape as a manual top-up.
    const { data: topup } = await admin
      .from("advisor_credit_topups")
      .insert({
        professional_id: pro.id,
        amount_cents: pack.priceCents,
        status: "pending",
      })
      .select("id")
      .single();

    // Off-session PaymentIntent — Stripe charges the saved card without
    // user intervention. The webhook handler grants credits on success.
    await stripe.paymentIntents.create({
      amount: pack.priceCents,
      currency: "aud",
      customer: pro.stripe_customer_id,
      payment_method: pro.stripe_default_payment_method,
      off_session: true,
      confirm: true,
      description: `Auto-recharge — ${pack.name} (${pack.leads} credits)`,
      metadata: {
        professional_id: String(pro.id),
        topup_id: String(topup?.id ?? ""),
        type: "advisor_credit_topup",
        pack_slug: pack.slug,
        pack_leads: String(pack.leads),
        per_lead_cents: String(pack.perLeadCents),
        auto_recharge: "true",
      },
    });

    log.info("auto-recharge initiated", {
      professionalId,
      pack: pack.slug,
      amountCents: pack.priceCents,
    });
  } catch (err) {
    // Common failures: card declined, auth required, customer deleted.
    // Stripe surfaces these as `StripeCardError` — we log and let the
    // next brief accept retry (after cooldown). The provider sees their
    // balance unchanged; the next attempted accept will fail with
    // insufficient credits and prompt manual top-up.
    log.warn("auto-recharge failed (provider must top up manually)", {
      professionalId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
