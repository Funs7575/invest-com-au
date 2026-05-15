/**
 * Stripe webhook handlers for marketplace Connect payouts (MM-34).
 *
 * Wires the existing `lib/stripe-connect::handleConnectWebhook` dispatch
 * into the project's per-event registry. Each handler returns 'done'
 * unconditionally — the underlying lib is fail-soft and idempotent.
 */
import type { WebhookHandler } from "../types";

import { handleConnectWebhook } from "@/lib/stripe-connect";

export const handleAccountUpdated: WebhookHandler = async (event) => {
  await handleConnectWebhook(event);
  return { status: "done" };
};

export const handlePaymentIntentSucceeded: WebhookHandler = async (event) => {
  await handleConnectWebhook(event);
  return { status: "done" };
};

export const handlePaymentIntentCanceled: WebhookHandler = async (event) => {
  await handleConnectWebhook(event);
  return { status: "done" };
};

/**
 * Existing charge.refunded handler in `charge-refunded.ts` covers consumer
 * Pro refunds. This wrapper additionally pings the Connect dispatcher so
 * marketplace_payments rows flip to 'refunded' when a connected-account
 * charge is refunded.
 */
export const handleChargeRefundedConnect: WebhookHandler = async (event) => {
  await handleConnectWebhook(event);
  return { status: "done" };
};
