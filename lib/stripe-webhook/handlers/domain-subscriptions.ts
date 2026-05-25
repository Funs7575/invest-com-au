import type Stripe from "stripe";

import type { WebhookContext } from "../types";
import { handleApiKeySubscription } from "./api-key-subscription";
import { handleFirmBrandedSubscription } from "./firm-subscription";

/**
 * Fan a subscription / checkout event out to the non-Pro billing domains
 * (Data-API tier — D3, and firm branded-profile — B2).
 *
 * The shared dispatcher maps one handler per event type, and
 * `customer.subscription.*` + `checkout.session.completed` are already owned
 * by the Pro handlers. Rather than overwrite them, the incumbents call this
 * so multiple billing domains observe the same event. Each handler
 * self-discriminates by `session.mode` / metadata / price-id and no-ops when
 * the event isn't theirs. Errors are swallowed + logged per-domain so one
 * domain can never block another or the webhook ack to Stripe.
 */
export async function dispatchDomainSubscriptions(
  event: Stripe.Event,
  ctx: WebhookContext,
): Promise<void> {
  for (const handle of [handleApiKeySubscription, handleFirmBrandedSubscription]) {
    try {
      await handle(event, ctx);
    } catch (err) {
      ctx.log.error("domain subscription dispatch failed", {
        type: event.type,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
