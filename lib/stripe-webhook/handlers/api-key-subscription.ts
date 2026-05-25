/**
 * Stripe webhook handlers for API key subscriptions.
 *
 * Listens for `customer.subscription.{created,updated,deleted}` events where
 * the subscription metadata carries `type: "api_key_subscription"`.
 *
 * On activation (created/updated active):
 *   - Resolves the target tier from the subscription's price ID.
 *   - Updates the `api_keys` row: tier + rate limits (from API_TIER_CONFIGS).
 *   - Upserts a row in `api_key_subscriptions`.
 *
 * On cancellation/deletion:
 *   - Downgrades the key back to "free" limits.
 *   - Marks the `api_key_subscriptions` row as "canceled".
 *
 * Designed to be called from the EXISTING webhook handler's
 * `customer.subscription.*` path — it returns `handled: false` when
 * the metadata doesn't belong to an API key subscription, so non-API
 * subscriptions flow through to the existing `upsertSubscription` path.
 *
 * Thread-safety: Stripe webhook events are deduplicated by the outer
 * webhook route (stripe_webhook_events idempotency table), so this
 * handler doesn't need its own idempotency guard.
 */

import type Stripe from "stripe";
import type { WebhookContext } from "../types";
import { getTierConfig, tierFromPriceId, API_TIER_CONFIGS } from "@/lib/api-tiers";
import { escapeHtml } from "@/lib/html-escape";
import { getSiteUrl } from "@/lib/url";
import { sendTransactionalEmail, emailWrapper } from "../lib/email";

/** Returns true only when the subscription belongs to an API key billing flow. */
function isApiKeySubscription(sub: Stripe.Subscription): boolean {
  return sub.metadata?.type === "api_key_subscription" && !!sub.metadata?.api_key_id;
}

/**
 * Resolve the tier for a subscription from its first price item.
 * Falls back to "basic" if the price isn't mapped (misconfigured Stripe product).
 */
function resolveTier(sub: Stripe.Subscription): string {
  const priceId = sub.items.data[0]?.price?.id;
  if (!priceId) return "basic";
  return tierFromPriceId(priceId) ?? "basic";
}

async function applyTierToKey(
  apiKeyId: string,
  tier: string,
  sub: Stripe.Subscription,
  ctx: WebhookContext,
): Promise<void> {
  const tierCfg = getTierConfig(tier);
  const now = new Date().toISOString();
  const periodStart = sub.current_period_start
    ? new Date(sub.current_period_start * 1000).toISOString()
    : now;

  // Update the api_keys row with tier + fresh limits
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new billing columns not yet in generated database.types.ts
  const { error: keyUpdateError } = await (ctx.admin as any)
    .from("api_keys")
    .update({
      tier,
      rate_limit_per_minute: tierCfg.rateLimitPerMinute,
      rate_limit_per_day: tierCfg.rateLimitPerDay,
      allowed_endpoints: tierCfg.allowedEndpoints,
      stripe_subscription_id: sub.id,
      billing_period_start: periodStart,
      updated_at: now,
    })
    .eq("id", apiKeyId);

  if (keyUpdateError) {
    ctx.log.error("api-key-subscription: failed to update api_keys row", {
      apiKeyId,
      tier,
      error: keyUpdateError.message,
    });
    throw new Error(`Failed to update api_keys: ${keyUpdateError.message}`);
  }

  // Upsert the join table row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: subUpsertError } = await (ctx.admin as any)
    .from("api_key_subscriptions")
    .upsert(
      {
        api_key_id: apiKeyId,
        stripe_subscription_id: sub.id,
        stripe_customer_id:
          typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        tier,
        status: "active",
        updated_at: now,
      },
      { onConflict: "api_key_id,stripe_subscription_id" },
    );

  if (subUpsertError) {
    ctx.log.warn("api-key-subscription: join table upsert failed (non-fatal)", {
      apiKeyId,
      subscriptionId: sub.id,
      error: subUpsertError.message,
    });
    // Non-fatal — the api_keys row is the ground truth
  }

  ctx.log.info("API key tier upgraded", {
    apiKeyId,
    tier,
    subscriptionId: sub.id,
  });
}

async function downgradeTierToFree(
  apiKeyId: string,
  subscriptionId: string,
  ctx: WebhookContext,
): Promise<void> {
  const freeCfg = API_TIER_CONFIGS.free;
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: keyUpdateError } = await (ctx.admin as any)
    .from("api_keys")
    .update({
      tier: "free",
      rate_limit_per_minute: freeCfg.rateLimitPerMinute,
      rate_limit_per_day: freeCfg.rateLimitPerDay,
      allowed_endpoints: freeCfg.allowedEndpoints,
      stripe_subscription_id: null,
      billing_period_start: null,
      updated_at: now,
    })
    .eq("id", apiKeyId);

  if (keyUpdateError) {
    ctx.log.error("api-key-subscription: failed to downgrade api_keys row", {
      apiKeyId,
      error: keyUpdateError.message,
    });
    throw new Error(`Failed to downgrade api_keys: ${keyUpdateError.message}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (ctx.admin as any)
    .from("api_key_subscriptions")
    .update({ status: "canceled", updated_at: now })
    .eq("api_key_id", apiKeyId)
    .eq("stripe_subscription_id", subscriptionId);

  ctx.log.info("API key downgraded to free", { apiKeyId, subscriptionId });
}

/**
 * Handle `customer.subscription.created` for API key subscriptions.
 * Returns `{ handled: false }` for non-API-key subscriptions.
 */
export async function handleApiKeySubscriptionCreated(
  event: Stripe.Event,
  ctx: WebhookContext,
): Promise<{ handled: boolean }> {
  const sub = event.data.object as Stripe.Subscription;
  if (!isApiKeySubscription(sub)) return { handled: false };

  const apiKeyId = sub.metadata.api_key_id!;
  const tier = resolveTier(sub);
  await applyTierToKey(apiKeyId, tier, sub, ctx);

  // Send a confirmation email to the key owner (fire-and-forget)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: keyRow } = await (ctx.admin as any)
      .from("api_keys")
      .select("owner_email, owner_name, name, key_prefix")
      .eq("id", apiKeyId)
      .maybeSingle();

    if (keyRow?.owner_email) {
      const tierCfg = getTierConfig(tier);
      const safeName = escapeHtml(keyRow.owner_name ?? keyRow.owner_email);
      const safeKeyName = escapeHtml(keyRow.name ?? keyRow.key_prefix);
      const safePrefix = escapeHtml(keyRow.key_prefix ?? "");
      const safeTier = escapeHtml(tierCfg.label);

      sendTransactionalEmail(
        keyRow.owner_email,
        `API key upgraded to ${tierCfg.label} — ${safeKeyName}`,
        emailWrapper(
          `API Key Upgraded to ${safeTier} ✅`,
          "#0f172a",
          `
          <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">Your API access is upgraded</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">
            Hi ${safeName}, your key <strong>${safeKeyName}</strong> (${safePrefix}...) is now on the
            <strong>${safeTier}</strong> tier.
          </p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:0 0 20px;">
            <p style="margin:0;font-size:13px;color:#334155;"><strong>Rate limit:</strong> ${tierCfg.rateLimitPerMinute} req/min · ${tierCfg.rateLimitPerDay.toLocaleString()} req/day</p>
            <p style="margin:4px 0 0;font-size:13px;color:#334155;"><strong>Endpoints:</strong> ${tierCfg.allowedEndpoints.includes("*") ? "All v1 endpoints" : tierCfg.allowedEndpoints.join(", ")}</p>
          </div>
          <div style="text-align:center;margin:20px 0;">
            <a href="${getSiteUrl()}/api-docs" style="display:inline-block;padding:12px 28px;background:#0f172a;color:#fff;font-weight:700;font-size:14px;border-radius:8px;text-decoration:none;">API Docs →</a>
          </div>
          `,
        ),
      ).catch((err) =>
        ctx.log.error("API key upgrade email failed", {
          err: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  } catch (err) {
    ctx.log.error("API key upgrade email lookup failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return { handled: true };
}

/**
 * Handle `customer.subscription.updated` for API key subscriptions.
 * Returns `{ handled: false }` for non-API-key subscriptions.
 */
export async function handleApiKeySubscriptionUpdated(
  event: Stripe.Event,
  ctx: WebhookContext,
): Promise<{ handled: boolean }> {
  const sub = event.data.object as Stripe.Subscription;
  if (!isApiKeySubscription(sub)) return { handled: false };

  const apiKeyId = sub.metadata.api_key_id!;

  if (sub.status === "active" || sub.status === "trialing") {
    const tier = resolveTier(sub);
    await applyTierToKey(apiKeyId, tier, sub, ctx);
  } else if (sub.status === "canceled" || sub.status === "unpaid") {
    await downgradeTierToFree(apiKeyId, sub.id, ctx);
  } else {
    ctx.log.info("API key subscription status unchanged (no action)", {
      apiKeyId,
      status: sub.status,
    });
  }

  return { handled: true };
}

/**
 * Handle `customer.subscription.deleted` for API key subscriptions.
 * Returns `{ handled: false }` for non-API-key subscriptions.
 */
export async function handleApiKeySubscriptionDeleted(
  event: Stripe.Event,
  ctx: WebhookContext,
): Promise<{ handled: boolean }> {
  const sub = event.data.object as Stripe.Subscription;
  if (!isApiKeySubscription(sub)) return { handled: false };

  const apiKeyId = sub.metadata.api_key_id!;
  await downgradeTierToFree(apiKeyId, sub.id, ctx);
  return { handled: true };
}
