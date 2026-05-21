/**
 * Handler for **Data-API tier subscriptions** (D3 billing).
 *
 * On a successful Stripe Checkout for an API-tier plan — and on subsequent
 * subscription lifecycle events — this flips `api_keys.tier` (and the
 * matching `rate_limit_per_minute/day`) for the key the subscription was
 * bought for. The v1 API (`lib/api-auth.ts`) reads those columns on every
 * request, so changing them is the entire billing effect.
 *
 * Events handled (the dispatch is by `event.type` *inside* this one
 * handler, so a single registry entry per type can delegate here — see the
 * wiring note below):
 *   - `checkout.session.completed` (mode=subscription, our discriminator)
 *       → upgrade the key to the purchased tier
 *   - `customer.subscription.updated`
 *       → re-sync the tier to whatever the active price now maps to; if the
 *         subscription has lapsed (canceled/unpaid/incomplete_expired), drop
 *         to `free`
 *   - `customer.subscription.deleted`
 *       → drop the key back to `free`
 *
 * ── Wiring (FOLLOW-UP — intentionally NOT done here) ──────────────────
 * This lane must not edit the shared dispatcher. The existing
 * `checkout.session.completed`, `customer.subscription.updated`, and
 * `customer.subscription.deleted` registry slots are already occupied by
 * `checkout-session-completed.ts` / `customer-subscription.ts`, so we can't
 * just `registerHandler(...)` a second time (the Map would overwrite the
 * incumbent). The correct follow-up — matching how those files already
 * delegate to `handleSubscriptionWebhook` from `lib/pro-subscription/billing`
 * — is to call this handler from the incumbents, e.g. add to
 * `handleCheckoutSessionCompleted` and `handleCustomerSubscription{Updated,
 * Deleted}`:
 *
 *     await handleApiKeySubscription(event, ctx);
 *
 * That keeps one registry slot per event while letting multiple billing
 * domains observe the same event. (Alternatively, give this lane its own
 * event types if/when Stripe ever distinguishes them.)
 *
 * ── Idempotency ──────────────────────────────────────────────────────
 * Two layers:
 *   1. The webhook route claims `event.id` in `stripe_webhook_events`
 *      before dispatch, so a duplicate Stripe delivery never reaches a
 *      handler at all.
 *   2. Defensively, every write is a guarded UPDATE: we read the key's
 *      current tier and skip the write when it already equals the target.
 *      Replaying the same event is therefore a no-op even if layer 1 were
 *      bypassed (e.g. a manual `stripe trigger`).
 */

import type Stripe from "stripe";
import type { WebhookContext, WebhookHandler, WebhookHandlerResult } from "../types";
import {
  getApiTierForPriceId,
  isApiTier,
  rateLimitsForTier,
  type ApiTier,
} from "@/lib/api-tiers";

/** Subscription statuses that mean the key should no longer be paid-tier. */
const LAPSED_STATUSES: ReadonlySet<Stripe.Subscription.Status> = new Set([
  "canceled",
  "incomplete_expired",
  "unpaid",
]);

/**
 * Apply a tier to a single `api_keys` row, keyed by its id. Idempotent: a
 * no-op when the row already sits on `tier`. Returns a short status string
 * for logging.
 */
async function setApiKeyTier(
  ctx: WebhookContext,
  apiKeyId: string,
  tier: ApiTier,
): Promise<"updated" | "noop" | "missing"> {
  const { admin, log } = ctx;

  const { data: row, error: readErr } = await admin
    .from("api_keys")
    .select("id, tier")
    .eq("id", apiKeyId)
    .maybeSingle();

  if (readErr) {
    log.error("api-key-subscription: read failed", {
      apiKeyId,
      error: readErr.message,
    });
    throw new Error(readErr.message);
  }
  if (!row) {
    log.warn("api-key-subscription: key row not found", { apiKeyId });
    return "missing";
  }
  if (row.tier === tier) {
    // Already where we want it — replay / out-of-order event. No-op.
    return "noop";
  }

  const limits = rateLimitsForTier(tier);
  const { error: updateErr } = await admin
    .from("api_keys")
    .update({
      tier,
      rate_limit_per_minute: limits.rate_limit_per_minute,
      rate_limit_per_day: limits.rate_limit_per_day,
      updated_at: new Date().toISOString(),
    })
    .eq("id", apiKeyId);

  if (updateErr) {
    log.error("api-key-subscription: tier update failed", {
      apiKeyId,
      tier,
      error: updateErr.message,
    });
    throw new Error(updateErr.message);
  }

  log.info("api-key-subscription: tier applied", { apiKeyId, tier });
  return "updated";
}

/**
 * Pull the target API key id out of subscription / checkout metadata. We
 * stamp `api_key_id` + `api_key_subscription="1"` at checkout time (see
 * `app/api/v1/billing/checkout/route.ts`).
 */
function readApiKeyId(
  metadata: Stripe.Metadata | null | undefined,
): string | null {
  if (!metadata) return null;
  if (metadata.api_key_subscription !== "1") return null;
  const id = metadata.api_key_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/**
 * Resolve the tier a subscription currently represents. Prefers the live
 * price id (authoritative — survives plan changes from the Customer Portal);
 * falls back to the `api_tier` metadata stamped at checkout. Returns null if
 * neither resolves to a known tier (handler then leaves the key untouched so
 * a misconfigured price-id env can't bump random keys).
 */
function resolveTier(subscription: Stripe.Subscription): ApiTier | null {
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const fromPrice = getApiTierForPriceId(priceId);
  if (fromPrice) return fromPrice;

  const metaTier = subscription.metadata?.api_tier;
  if (isApiTier(metaTier) && metaTier !== "free") return metaTier;
  return null;
}

/**
 * The exported handler. Branches on `event.type` so a single function can be
 * delegated to from multiple registry slots (see the wiring note at the top).
 */
export const handleApiKeySubscription: WebhookHandler = async (
  event,
  ctx,
): Promise<WebhookHandlerResult> => {
  switch (event.type) {
    // ── New purchase ───────────────────────────────────────────────
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // Only our subscription-mode API checkouts. Other checkout flows
      // (courses, credit top-ups, pro subs, …) carry different metadata.
      if (session.mode !== "subscription") return { status: "done" };
      const apiKeyId = readApiKeyId(session.metadata);
      if (!apiKeyId) return { status: "done" };

      const tierMeta = session.metadata?.api_tier;
      // Trust the checkout metadata for the initial grant; the subsequent
      // subscription.updated event re-syncs from the live price id.
      if (!isApiTier(tierMeta) || tierMeta === "free") {
        ctx.log.warn("api-key-subscription: checkout missing valid api_tier", {
          sessionId: session.id,
          apiKeyId,
        });
        return { status: "done" };
      }
      await setApiKeyTier(ctx, apiKeyId, tierMeta);
      return { status: "done" };
    }

    // ── Plan change / renewal / lapse ──────────────────────────────
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const apiKeyId = readApiKeyId(subscription.metadata);
      if (!apiKeyId) return { status: "done" };

      // A lapsed subscription means the key should fall back to free.
      if (LAPSED_STATUSES.has(subscription.status)) {
        await setApiKeyTier(ctx, apiKeyId, "free");
        return { status: "done" };
      }

      const tier = resolveTier(subscription);
      if (!tier) {
        ctx.log.warn("api-key-subscription: unrecognised price on update", {
          subscriptionId: subscription.id,
          apiKeyId,
        });
        return { status: "done" };
      }
      await setApiKeyTier(ctx, apiKeyId, tier);
      return { status: "done" };
    }

    // ── Cancellation ───────────────────────────────────────────────
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const apiKeyId = readApiKeyId(subscription.metadata);
      if (!apiKeyId) return { status: "done" };
      await setApiKeyTier(ctx, apiKeyId, "free");
      return { status: "done" };
    }

    default:
      // Not one of ours — let the caller carry on.
      return { status: "done" };
  }
};
