/**
 * Stripe webhook handlers for FIRM PER-SEAT subscriptions (Lead-Ops #13).
 *
 * Listens for `customer.subscription.{created,updated,deleted}` events whose
 * subscription metadata carries `type: "firm_seat_subscription"` +
 * `firm_id`. The quantity on the first subscription item = the firm's billed
 * seat count.
 *
 * ADDITIVE by construction: like handleApiKeySubscription*, these are invoked
 * from INSIDE the existing customer.subscription.* handlers and return
 * `{ handled: false }` for any subscription that is NOT a firm-seat one — so
 * Pro / API-key / consumer subscriptions flow through untouched. No existing
 * webhook branch is modified; this only adds a new short-circuit at the top.
 *
 * Effects:
 *   - created / updated (active|trialing) → sync stripe_subscription_id +
 *     billed_seats (+ max_seats = quantity) onto advisor_firms via
 *     syncFirmSeatSubscription.
 *   - updated (canceled|unpaid) / deleted → clear billed_seats (set null),
 *     keep stripe_subscription_id for reference. max_seats is left as-is so a
 *     lapsed firm doesn't suddenly lose access to existing members.
 *
 * Idempotency: the outer webhook route dedupes events (stripe_webhook_events),
 * and syncFirmSeatSubscription is an idempotent field upsert, so replays are
 * safe.
 */

import type Stripe from "stripe";
import type { WebhookContext } from "../types";
import { syncFirmSeatSubscription } from "@/lib/firm-billing";

/** True only when the subscription is a firm per-seat subscription. */
function isFirmSeatSubscription(sub: Stripe.Subscription): boolean {
  return (
    sub.metadata?.type === "firm_seat_subscription" && !!sub.metadata?.firm_id
  );
}

/** Parse the firm_id metadata to a positive integer, or null. */
function firmIdOf(sub: Stripe.Subscription): number | null {
  const raw = sub.metadata?.firm_id;
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** The seat quantity from the first subscription item (defaults to 1). */
function seatQuantityOf(sub: Stripe.Subscription): number {
  const qty = sub.items?.data?.[0]?.quantity;
  return typeof qty === "number" && qty > 0 ? qty : 1;
}

async function applySeats(
  sub: Stripe.Subscription,
  ctx: WebhookContext,
  firmId: number,
): Promise<void> {
  const seats = seatQuantityOf(sub);
  await syncFirmSeatSubscription({
    firmId,
    stripeSubscriptionId: sub.id,
    billedSeats: seats,
    // Active sub → the paid seat count becomes the firm's seat cap so the
    // invite gate honours it.
    maxSeats: seats,
    client: ctx.admin,
  });
  ctx.log.info("firm seat subscription active", {
    firmId,
    subscriptionId: sub.id,
    seats,
  });
}

async function clearSeats(
  sub: Stripe.Subscription,
  ctx: WebhookContext,
  firmId: number,
): Promise<void> {
  await syncFirmSeatSubscription({
    firmId,
    stripeSubscriptionId: sub.id,
    billedSeats: null,
    // Leave max_seats untouched on cancellation — don't yank capacity from a
    // firm with existing members mid-cycle.
    maxSeats: null,
    client: ctx.admin,
  });
  ctx.log.info("firm seat subscription cleared", {
    firmId,
    subscriptionId: sub.id,
  });
}

/** created → activate seats. Returns { handled:false } for non-firm subs. */
export async function handleFirmSeatSubscriptionCreated(
  event: Stripe.Event,
  ctx: WebhookContext,
): Promise<{ handled: boolean }> {
  const sub = event.data.object as Stripe.Subscription;
  if (!isFirmSeatSubscription(sub)) return { handled: false };
  const firmId = firmIdOf(sub);
  if (firmId === null) {
    ctx.log.warn("firm seat subscription missing firm_id", { subscriptionId: sub.id });
    return { handled: true };
  }
  if (sub.status === "active" || sub.status === "trialing") {
    await applySeats(sub, ctx, firmId);
  }
  return { handled: true };
}

/** updated → activate or clear by status. */
export async function handleFirmSeatSubscriptionUpdated(
  event: Stripe.Event,
  ctx: WebhookContext,
): Promise<{ handled: boolean }> {
  const sub = event.data.object as Stripe.Subscription;
  if (!isFirmSeatSubscription(sub)) return { handled: false };
  const firmId = firmIdOf(sub);
  if (firmId === null) {
    ctx.log.warn("firm seat subscription missing firm_id", { subscriptionId: sub.id });
    return { handled: true };
  }
  if (sub.status === "active" || sub.status === "trialing") {
    await applySeats(sub, ctx, firmId);
  } else if (sub.status === "canceled" || sub.status === "unpaid") {
    await clearSeats(sub, ctx, firmId);
  } else {
    ctx.log.info("firm seat subscription status unchanged (no action)", {
      firmId,
      status: sub.status,
    });
  }
  return { handled: true };
}

/** deleted → clear seats. */
export async function handleFirmSeatSubscriptionDeleted(
  event: Stripe.Event,
  ctx: WebhookContext,
): Promise<{ handled: boolean }> {
  const sub = event.data.object as Stripe.Subscription;
  if (!isFirmSeatSubscription(sub)) return { handled: false };
  const firmId = firmIdOf(sub);
  if (firmId === null) {
    ctx.log.warn("firm seat subscription missing firm_id", { subscriptionId: sub.id });
    return { handled: true };
  }
  await clearSeats(sub, ctx, firmId);
  return { handled: true };
}
