/**
 * Handler for `customer.subscription.paused`.
 *
 * Stripe allows subscriptions to be paused (payment_pause or
 * trial-end pause). When a subscription is paused:
 *   - The associated professional's advisor account is paused so they
 *     stop receiving new leads (billing pause → service pause).
 *   - The `subscriptions` table row is updated to reflect paused state.
 *
 * This prevents the dunning cron from emailing advisors about "payment
 * failures" that are actually intentional pauses, and stops the
 * platform from routing leads to a paused advisor's inbox.
 *
 * Implemented as part of J-10.
 */

import type Stripe from "stripe";
import type { WebhookHandler } from "../types";

export const handleCustomerSubscriptionPaused: WebhookHandler = async (event, ctx) => {
  const sub = event.data.object as Stripe.Subscription;

  const stripeCustomerId =
    typeof sub.customer === "string" ? sub.customer : (sub.customer as Stripe.Customer).id;

  // Update the internal subscriptions table
  await ctx.admin
    .from("subscriptions")
    .update({ status: "paused" })
    .eq("stripe_subscription_id", sub.id);

  // Pause any professional account tied to this customer
  const { data: professional } = await ctx.admin
    .from("professionals")
    .select("id, name, email, status")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (professional && (professional.status as string) === "active") {
    await ctx.admin
      .from("professionals")
      .update({
        status: "paused",
        auto_paused_at: new Date().toISOString(),
        auto_pause_reason: "subscription_paused",
      })
      .eq("id", professional.id);

    ctx.log.info("Professional paused due to subscription pause", {
      professionalId: professional.id,
      stripeCustomerId,
      subscriptionId: sub.id,
    });
  }

  ctx.log.info("Subscription pause event processed", {
    subscriptionId: sub.id,
    stripeCustomerId,
    professionalFound: !!professional,
    professionalPaused: !!professional && (professional.status as string) === "active",
  });

  return { status: "done" };
};
