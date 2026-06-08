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
import { enqueueUserNotification } from "@/lib/user-notifications";

const log = logger("briefs:auto-recharge");

const RECHARGE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between attempts

interface ProRow {
  id: number;
  email: string | null;
  name: string | null;
  auth_user_id: string | null;
  credit_balance_cents: number | null;
  auto_recharge_enabled: boolean;
  auto_recharge_threshold_credits: number | null;
  auto_recharge_pack_slug: string | null;
  stripe_customer_id: string | null;
  stripe_default_payment_method: string | null;
  auto_recharge_last_attempted_at: string | null;
}

/**
 * Fire-and-forget inbox notification for the recharging pro. Looks up
 * `auth_user_id` directly on the professionals row (added by migration
 * 20260429) — no email→userId scan needed.
 */
async function notifyProInbox(
  pro: ProRow,
  kind: "topup_succeeded" | "topup_failed",
  body: string,
): Promise<void> {
  if (!pro.auth_user_id) return;
  await enqueueUserNotification({
    authUserId: pro.auth_user_id,
    kind,
    title:
      kind === "topup_succeeded"
        ? "Auto-recharge processed"
        : "Auto-recharge failed",
    body,
    href: "/pros/billing",
  });
}

export async function maybeAutoRecharge(professionalId: number): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("professionals")
      .select(
        "id, email, name, auth_user_id, credit_balance_cents, auto_recharge_enabled, auto_recharge_threshold_credits, auto_recharge_pack_slug, stripe_customer_id, stripe_default_payment_method, auto_recharge_last_attempted_at",
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
    const intent = await stripe.paymentIntents.create({
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
      intentStatus: intent.status,
    });

    // ── In-app inbox (C1 / mm06) ────────────────────────────────────
    // Gate the notification on the ACTUAL PaymentIntent status. A
    // non-throwing return from `paymentIntents.create({confirm:true})`
    // does NOT mean money settled: Stripe only THROWS for hard declines
    // / authentication_required. It returns normally with status
    // `processing`, `requires_action`, or `requires_payment_method` when
    // the charge is pending or needs more from the cardholder. Firing
    // "topup_succeeded" on a clean return therefore falsely tells the pro
    // their balance topped up when it has not.
    //
    // - succeeded → real settlement; notify "succeeded".
    // - requires_action / requires_payment_method → off-session step-up
    //   (e.g. 3DS) or a card problem the pro must resolve; notify
    //   "failed" with an action-required message so they take action.
    // - processing (or any other non-terminal status) → no money has
    //   settled yet; suppress the notification and let the asynchronous
    //   webhook / reconciliation surface the eventual outcome. Do NOT
    //   claim success.
    //
    // ⚠️ KNOWN LATENT GAP (founder + payments review — see PR body): even
    // a genuinely `succeeded` raw PaymentIntent has no registered handler
    // that grants the advisor_credit_topup credits. `checkout.session.
    // completed` (the comment's stated design) never fires for a raw
    // PaymentIntent, and the `payment_intent.succeeded` handler early-
    // returns unless metadata.kind === "marketplace_payment". So the
    // "succeeded" notification is presently still optimistic about the
    // credit grant. Wiring the credit-grant path (Checkout Session in
    // payment mode, or an advisor_credit_topup branch in a
    // payment_intent.succeeded handler) is the load-bearing companion fix
    // and is intentionally NOT done here — it is money-movement and needs
    // explicit founder + payments sign-off.
    if (intent.status === "succeeded") {
      void notifyProInbox(
        pro,
        "topup_succeeded",
        `${pack.leads} credits topped up via auto-recharge (A$${(pack.priceCents / 100).toFixed(0)}).`,
      );
    } else if (
      intent.status === "requires_action" ||
      intent.status === "requires_payment_method"
    ) {
      log.warn("auto-recharge needs cardholder action", {
        professionalId,
        intentStatus: intent.status,
      });
      void notifyProInbox(
        pro,
        "topup_failed",
        "We couldn't complete your auto-recharge — your card needs verification or updating. Top up manually or update your payment method.",
      );
    } else {
      // processing / requires_capture / canceled / unknown — the charge
      // has not settled. Do not assert success; stay silent and let the
      // webhook / reconciliation surface the eventual outcome.
      log.info("auto-recharge pending (no success notification)", {
        professionalId,
        intentStatus: intent.status,
      });
    }
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

    // ── In-app inbox (C1 / mm06) ───────────────────────────────────
    // Surface the failure in the pro's inbox so they can take action
    // (update card, top up manually) without checking email.
    try {
      const admin = createAdminClient();
      const { data: pro } = await admin
        .from("professionals")
        .select("id, email, name, auth_user_id")
        .eq("id", professionalId)
        .maybeSingle();
      if (pro?.auth_user_id) {
        await notifyProInbox(
          pro as ProRow,
          "topup_failed",
          "We couldn't charge your saved card. Top up manually or update your payment method.",
        );
      }
    } catch {
      /* silent — inbox failure must never re-throw out of auto-recharge */
    }
  }
}
