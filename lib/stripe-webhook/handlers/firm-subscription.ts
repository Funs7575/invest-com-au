/**
 * Handler for the firm branded-profile subscription (B2).
 *
 * Fires on `customer.subscription.{created,updated,deleted}` and flips the
 * firm's branded-profile entitlement on advisor_firms (see
 * supabase/migrations/20260521000000_firm_branded_profile_subscription.sql).
 * The /firm/[slug] page renders the enhanced components only when
 * `branded_profile_active` is true, so this handler is the single writer
 * of that flag from the Stripe side.
 *
 * FOLLOW-UP (intentionally not done here): register this handler in
 * `lib/stripe-webhook/handlers/index.ts` against
 *   customer.subscription.created  → handleFirmBrandedSubscription
 *   customer.subscription.updated  → handleFirmBrandedSubscription
 *   customer.subscription.deleted  → handleFirmBrandedSubscription
 * The shared dispatcher (registry / handlers/index.ts) is owned by another
 * lane; editing it here would collide. Note that the existing
 * `customer.subscription.*` handlers in `customer-subscription.ts` no-op
 * for non-pro subscriptions, so once both are wired the dispatcher will
 * need to fan a single event out to both (or this product's events get a
 * dedicated routing key). Until wired, branded-profile entitlement is
 * driven only by the checkout/portal round-trip + manual reconciliation.
 *
 * Idempotency: every code path is an upsert-by-firm keyed write, so
 * redelivery of the same event converges. We also drop events that are
 * older than the period we've already recorded for the firm's *current*
 * subscription (Stripe does not guarantee delivery order), mirroring the
 * out-of-order guard in lib/stripe-webhook/lib/upsert-subscription.ts.
 */

import type Stripe from "stripe";
import type { WebhookHandler } from "../types";
import {
  isEntitledStatus,
  mapStripeStatusToBranded,
} from "@/lib/firm-branded-profile";

// Only act on subscriptions this product owns. The checkout flow stamps
// metadata.product on both the session and the subscription.
const BRANDED_PRODUCT = "firm_branded_profile";

function isBrandedSubscription(sub: Stripe.Subscription): boolean {
  return sub.metadata?.product === BRANDED_PRODUCT;
}

function resolveFirmId(sub: Stripe.Subscription): number | null {
  const raw = sub.metadata?.firm_id;
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

export const handleFirmBrandedSubscription: WebhookHandler = async (
  event,
  ctx,
) => {
  const sub = event.data.object as Stripe.Subscription;

  // Ignore subscriptions that aren't branded-profile. This keeps the
  // handler safe to register on the shared customer.subscription.* events
  // alongside the pro/consumer handlers — it simply returns done without
  // touching any firm.
  if (!isBrandedSubscription(sub)) {
    return { status: "done" };
  }

  const stripeCustomerId =
    typeof sub.customer === "string"
      ? sub.customer
      : (sub.customer as Stripe.Customer).id;

  const isDeletion = event.type === "customer.subscription.deleted";

  // Resolve the firm. Prefer metadata.firm_id; fall back to the indexed
  // subscription-id lookup (the migration added idx_advisor_firms_branded_subscription
  // for exactly this — handles a retried event with stripped metadata).
  let firmId = resolveFirmId(sub);
  if (!firmId) {
    const { data } = await ctx.admin
      .from("advisor_firms")
      .select("id")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- branded_profile_subscription_id lands via 20260521000000 migration; database.types.ts not yet regenerated, so the column is absent from the typed .eq() column union.
      .eq("branded_profile_subscription_id" as any, sub.id)
      .maybeSingle();
    firmId = (data as { id: number } | null)?.id ?? null;
  }
  if (!firmId) {
    ctx.log.error("Branded subscription event: no firm resolved", {
      subscriptionId: sub.id,
      eventType: event.type,
    });
    // Return done (not error): without a firm there's nothing to retry to,
    // and a hard error would make Stripe retry forever.
    return { status: "done" };
  }

  // On deletion the subscription has ended → revoke entitlement.
  // Otherwise map Stripe's status into our bucket and entitle iff
  // active/trialing.
  const status = isDeletion
    ? "canceled"
    : mapStripeStatusToBranded(sub.status);
  const active = !isDeletion && isEntitledStatus(status);

  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  // Out-of-order guard: skip an event whose period_end is older than what
  // we've already stored for THIS subscription. Scoped to the same
  // subscription id so a brand-new subscription (after a prior cancel)
  // isn't blocked by the old row's later period_end.
  const { data: existing } = await ctx.admin
    .from("advisor_firms")
    .select(
      "branded_profile_subscription_id, branded_profile_period_end, branded_profile_status",
    )
    .eq("id", firmId)
    .maybeSingle();
  const existingRow = existing as unknown as {
    branded_profile_subscription_id: string | null;
    branded_profile_period_end: string | null;
    branded_profile_status: string | null;
  } | null;

  if (
    existingRow?.branded_profile_subscription_id === sub.id &&
    existingRow.branded_profile_period_end &&
    periodEnd &&
    existingRow.branded_profile_period_end > periodEnd &&
    // Never let an out-of-order update keep entitlement alive past a
    // cancellation — deletions always win.
    !isDeletion
  ) {
    ctx.log.info("Skipping older branded-subscription event", {
      firmId,
      subscriptionId: sub.id,
      existingPeriodEnd: existingRow.branded_profile_period_end,
      incomingPeriodEnd: periodEnd,
    });
    return { status: "done" };
  }

  // On deletion, only clear the row if it still points at THIS
  // subscription (a newer subscription may already have replaced it).
  if (
    isDeletion &&
    existingRow?.branded_profile_subscription_id &&
    existingRow.branded_profile_subscription_id !== sub.id
  ) {
    ctx.log.info("Branded deletion for superseded subscription — ignoring", {
      firmId,
      deletedSubscriptionId: sub.id,
      currentSubscriptionId: existingRow.branded_profile_subscription_id,
    });
    return { status: "done" };
  }

  const update: Record<string, unknown> = {
    branded_profile_active: active,
    branded_profile_status: status,
    branded_profile_subscription_id: sub.id,
    branded_profile_period_end: periodEnd,
    branded_profile_stripe_customer_id: stripeCustomerId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await ctx.admin
    .from("advisor_firms")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- branded_profile_* columns land via 20260521000000 migration; database.types.ts not yet regenerated.
    .update(update as any)
    .eq("id", firmId);

  if (error) {
    ctx.log.error("Branded-profile entitlement update failed", {
      firmId,
      subscriptionId: sub.id,
      error: error.message,
    });
    return { status: "error", error: new Error(error.message) };
  }

  ctx.log.info("Branded-profile entitlement updated", {
    firmId,
    subscriptionId: sub.id,
    eventType: event.type,
    status,
    active,
  });

  return { status: "done" };
};
