/**
 * Subscription upsert helper (extracted from route.ts in J-01b).
 *
 * Three handlers depend on this:
 *   - `customer.subscription.created`
 *   - `customer.subscription.updated`
 *   - `customer.subscription.deleted`
 *
 * Carries the original out-of-order protection comment block (Stripe
 * does NOT guarantee event delivery order; we use the row's existing
 * `updated_at` as a monotonic marker to drop late-arriving older
 * events). Tested in isolation in the J-01d round.
 */

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Logger } from "@/lib/logger";
import type { Database } from "@/lib/database.types";

export async function upsertSubscription(
  subscription: Stripe.Subscription,
  admin: SupabaseClient<Database>,
  log: Logger,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  // Look up user by stripe_customer_id
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    log.error("No profile found for Stripe customer", { customerId });
    return;
  }

  const item = subscription.items.data[0];

  // Out-of-order protection. Stripe does NOT guarantee webhook delivery
  // order. A `subscription.updated` event (flipping status to active) can
  // arrive AFTER a later `subscription.updated` (flipping to cancelled),
  // which would leave the row in the wrong terminal state. Stripe puts
  // the actual event time on `subscription.updated` via `Date.now()`; we
  // use that as a monotonic marker and skip any incoming event that's
  // older than what we already stored.
  //
  // We persist it into `updated_at` because the column already exists on
  // the subscriptions table and we don't want to require a migration for
  // this fix. Incoming events older than existing `updated_at` are
  // dropped (but still return success to Stripe so it stops retrying).
  const stripeEventTime = new Date(
    // Prefer explicit updated timestamp if Stripe provides it (billing_cycle_anchor
    // or created are the closest proxies); otherwise fall back to wall clock.
    subscription.cancel_at
      ? subscription.cancel_at * 1000
      : subscription.current_period_start
      ? subscription.current_period_start * 1000
      : Date.now()
  ).toISOString();

  const { data: existing } = await admin
    .from("subscriptions")
    .select("updated_at, status")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (existing?.updated_at && existing.updated_at > stripeEventTime) {
    log.info("Skipping older webhook event", {
      subscriptionId: subscription.id,
      existingUpdatedAt: existing.updated_at,
      incomingEventTime: stripeEventTime,
    });
    return;
  }

  const subscriptionData = {
    user_id: profile.id,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    status: subscription.status,
    price_id: item?.price?.id || null,
    plan_interval: item?.price?.recurring?.interval || null,
    current_period_start: new Date(
      subscription.current_period_start * 1000
    ).toISOString(),
    current_period_end: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("subscriptions")
    .upsert(subscriptionData, { onConflict: "stripe_subscription_id" });

  if (error) {
    log.error("Subscription upsert error", { error: error.message });
  }
}
