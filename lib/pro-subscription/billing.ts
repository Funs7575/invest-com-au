/**
 * Pro subscription billing — Stripe Checkout + Customer Portal + webhook
 * lifecycle handlers.
 *
 * Layer above `lib/pro-subscription/index.ts` — the index module owns the
 * data model (`setProSubscriptionTier`, configs); this module owns the
 * Stripe IO (Checkout sessions, Portal sessions, webhook event → tier
 * change mapping).
 *
 * Env vars (per CLAUDE.md "STRIPE_PRICE_ID_*" — graceful 503 if unset):
 *   STRIPE_PRICE_ID_STARTER  — Stripe Price ID for the A$29/mo Starter tier
 *   STRIPE_PRICE_ID_GROWTH   — Stripe Price ID for the A$99/mo Growth tier
 *   STRIPE_PRICE_ID_SCALE    — Stripe Price ID for the A$249/mo Scale tier
 *
 * Idempotency: all writes flow through `setProSubscriptionTier` which is
 * itself a single UPDATE; the calling webhook route already guards against
 * duplicate Stripe event delivery via `stripe_webhook_events.event_id`
 * (see `app/api/stripe/webhook/route.ts`). Handlers here are pure event →
 * tier mappers so re-running them on a duplicate event is a no-op.
 */

// eslint-disable-next-line no-restricted-imports -- service-role legitimate: webhook handlers run without a user JWT (Stripe → server), and Checkout-session creation looks up the pro's row by id from an authenticated route. Both are covered by CLAUDE.md "Two Supabase clients" service-role allow-list (webhook + cross-user query).
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";
import type Stripe from "stripe";
import {
  setProSubscriptionTier,
  SUBSCRIPTION_CONFIGS,
  type ProSubscriptionTier,
  type ProSubscriptionStatus,
} from "@/lib/pro-subscription";

const log = logger("pro-subscription:billing");

/** Paid tiers — `free` is not purchasable through Checkout. */
export type PaidProTier = Exclude<ProSubscriptionTier, "free">;

/**
 * Resolve the configured Stripe Price ID for a tier. Returns `null` if the
 * env var is unset — callers must surface a 503 in that case rather than
 * letting Stripe throw a confusing "No such price" error.
 */
export function getPriceIdForTier(tier: PaidProTier): string | null {
  const env = process.env;
  switch (tier) {
    case "starter":
      return env.STRIPE_PRICE_ID_STARTER || null;
    case "growth":
      return env.STRIPE_PRICE_ID_GROWTH || null;
    case "scale":
      return env.STRIPE_PRICE_ID_SCALE || null;
  }
}

/**
 * Reverse lookup: given a Stripe Price ID (from the webhook line_items or
 * a subscription item), return which pro tier it represents. Returns null
 * if the env vars don't match — webhook handlers fall back to `free` in
 * that case so a misconfigured env doesn't bump random pros to paid tiers.
 */
export function getTierForPriceId(priceId: string | null | undefined): PaidProTier | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_ID_GROWTH) return "growth";
  if (priceId === process.env.STRIPE_PRICE_ID_SCALE) return "scale";
  return null;
}

interface ProBillingRow {
  id: number;
  email: string | null;
  stripe_customer_id: string | null;
}

async function loadProBillingRow(professionalId: number): Promise<ProBillingRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("professionals")
    .select("id, email, stripe_customer_id")
    .eq("id", professionalId)
    .maybeSingle();
  return (data as ProBillingRow | null) ?? null;
}

async function ensureStripeCustomerId(pro: ProBillingRow): Promise<string> {
  if (pro.stripe_customer_id) return pro.stripe_customer_id;
  if (!pro.email) {
    throw new Error(`Pro #${pro.id} has no email — cannot create Stripe customer`);
  }
  const stripe = getStripe();
  // Stripe idempotency key keeps two parallel requests converging on the
  // same customer (see app/api/stripe/create-checkout/route.ts for the
  // pattern this mirrors).
  const customer = await stripe.customers.create(
    {
      email: pro.email,
      metadata: { professional_id: String(pro.id) },
    },
    { idempotencyKey: `pro_customer_${pro.id}` },
  );
  // Persist; only write if still null so a race with another writer doesn't
  // overwrite a customer id that landed first.
  const admin = createAdminClient();
  await admin
    .from("professionals")
    .update({ stripe_customer_id: customer.id } as Record<string, unknown>)
    .eq("id", pro.id)
    .is("stripe_customer_id", null);
  // Re-read to converge on whichever customer won the race.
  const { data: refreshed } = await admin
    .from("professionals")
    .select("stripe_customer_id")
    .eq("id", pro.id)
    .maybeSingle();
  const fresh = (refreshed as { stripe_customer_id: string | null } | null)
    ?.stripe_customer_id;
  return fresh ?? customer.id;
}

export interface CreateCheckoutSessionResult {
  url: string;
}

export interface CreateCheckoutSessionFailure {
  /** Set when the configuration is missing — callers should return 503. */
  unavailable: true;
  reason: string;
}

export type CreateCheckoutSessionOutcome =
  | CreateCheckoutSessionResult
  | CreateCheckoutSessionFailure;

/**
 * Create a Stripe Checkout Session for a subscription upgrade. Returns
 * the Checkout URL the caller redirects the pro to. Stamps a stripe
 * customer id on the pro if it doesn't already exist.
 *
 * Returns `{ unavailable: true }` instead of throwing when the price-id
 * env var for the requested tier is unset — callers map that to 503.
 */
export async function createCheckoutSession(input: {
  professionalId: number;
  tier: PaidProTier;
}): Promise<CreateCheckoutSessionOutcome> {
  const priceId = getPriceIdForTier(input.tier);
  if (!priceId) {
    log.warn("price id not configured for tier", { tier: input.tier });
    return {
      unavailable: true,
      reason: `Stripe Price ID for ${input.tier} not configured`,
    };
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    log.warn("stripe client unavailable", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { unavailable: true, reason: "Stripe not configured" };
  }

  const pro = await loadProBillingRow(input.professionalId);
  if (!pro) throw new Error(`Pro #${input.professionalId} not found`);

  const customerId = await ensureStripeCustomerId(pro);

  // 10-minute idempotency bucket so a rapid double-click converges on the
  // same Checkout URL but a deliberate retry after a cancel gets a fresh
  // one. Mirrors the create-checkout pattern in app/api/stripe/.
  const bucket = Math.floor(Date.now() / (10 * 60 * 1000));
  const siteUrl = getSiteUrl();

  const session = await stripe.checkout.sessions.create(
    {
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/pros/billing?subscribe=success`,
      cancel_url: `${siteUrl}/pros/billing?subscribe=cancelled`,
      subscription_data: {
        metadata: {
          professional_id: String(pro.id),
          pro_tier: input.tier,
        },
      },
      metadata: {
        professional_id: String(pro.id),
        pro_tier: input.tier,
      },
      allow_promotion_codes: true,
    },
    {
      idempotencyKey: `pro_subscribe_${pro.id}_${input.tier}_${bucket}`,
    },
  );

  if (!session.url) {
    throw new Error("Stripe Checkout session has no URL");
  }
  log.info("checkout session created", {
    professionalId: pro.id,
    tier: input.tier,
    sessionId: session.id,
  });
  return { url: session.url };
}

export interface CreateBillingPortalUrlResult {
  url: string;
}

export type CreateBillingPortalOutcome =
  | CreateBillingPortalUrlResult
  | CreateCheckoutSessionFailure;

/**
 * Create a Stripe Customer Portal session for managing/cancelling the
 * pro's subscription. Requires the pro to already have a stripe_customer_id
 * (i.e. they completed at least one Checkout). Returns
 * `{ unavailable: true }` if there's no customer to manage.
 */
export async function createBillingPortalUrl(
  professionalId: number,
): Promise<CreateBillingPortalOutcome> {
  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    log.warn("stripe client unavailable", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { unavailable: true, reason: "Stripe not configured" };
  }

  const pro = await loadProBillingRow(professionalId);
  if (!pro) throw new Error(`Pro #${professionalId} not found`);
  if (!pro.stripe_customer_id) {
    return { unavailable: true, reason: "No billing account yet" };
  }

  const siteUrl = getSiteUrl();
  const session = await stripe.billingPortal.sessions.create({
    customer: pro.stripe_customer_id,
    return_url: `${siteUrl}/pros/billing`,
  });

  if (!session.url) throw new Error("Stripe Portal session has no URL");
  log.info("portal session created", { professionalId: pro.id });
  return { url: session.url };
}

/**
 * Map a Stripe.Subscription.Status to our internal status. Stripe has
 * extra states (incomplete, incomplete_expired, unpaid, paused) which we
 * collapse into the four UI-facing buckets we expose.
 */
function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status,
): ProSubscriptionStatus {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
    case "paused":
    default:
      return "inactive";
  }
}

/**
 * Look up the professional_id for a Stripe customer id. We persist a
 * professional_id metadata field on every Customer + Subscription we
 * create, so the preferred path is metadata. Falls back to the
 * `professionals.stripe_customer_id` column (set on first Checkout).
 */
async function resolveProfessionalId(
  subscription: Stripe.Subscription,
): Promise<number | null> {
  // Subscription metadata first — set when we create the Checkout session.
  const metaId = subscription.metadata?.professional_id;
  if (metaId) {
    const parsed = parseInt(metaId, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const admin = createAdminClient();
  const { data } = await admin
    .from("professionals")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data as { id: number } | null)?.id ?? null;
}

async function applySubscriptionState(
  subscription: Stripe.Subscription,
  log_: typeof log,
): Promise<void> {
  const professionalId = await resolveProfessionalId(subscription);
  if (!professionalId) {
    log_.warn("subscription event without resolvable pro", {
      subscriptionId: subscription.id,
    });
    return;
  }
  const item = subscription.items.data[0];
  const priceId = item?.price?.id ?? null;
  const tier = getTierForPriceId(priceId);
  if (!tier) {
    log_.warn("subscription event with unrecognised price id", {
      subscriptionId: subscription.id,
      priceId,
    });
    return;
  }
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  await setProSubscriptionTier({
    professionalId,
    tier,
    status: mapStripeStatus(subscription.status),
    periodEnd,
    stripeId: subscription.id,
  });
}

/**
 * Handle a Stripe webhook event that affects a pro's subscription state.
 * Called from the existing webhook registry — returns silently for event
 * types this module doesn't handle (so it composes with the existing
 * email / dispute / refund handlers without conflicts).
 *
 * Handled types:
 *   - checkout.session.completed (mode=subscription) → tier upgrade
 *   - customer.subscription.updated                  → status / period
 *   - customer.subscription.deleted                  → tier=free / canceled
 *   - invoice.payment_failed                         → status=past_due
 *
 * Idempotency: the webhook route claims `event.id` in the
 * `stripe_webhook_events` table before dispatch, so duplicate deliveries
 * never reach this function. All writes go through `setProSubscriptionTier`
 * which is itself a single UPDATE statement; replaying the same event is
 * a no-op.
 */
export async function handleSubscriptionWebhook(
  event: Stripe.Event,
): Promise<{ handled: boolean }> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      // Only subscription-mode checkouts are ours. The credit-pack and
      // course-purchase flows also fire checkout.session.completed in
      // payment mode — skip those so we don't accidentally flip a tier.
      if (session.mode !== "subscription") {
        return { handled: false };
      }
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (!subscriptionId) {
        log.warn("checkout.session.completed without subscription id", {
          sessionId: session.id,
        });
        return { handled: false };
      }
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      await applySubscriptionState(subscription, log);
      return { handled: true };
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await applySubscriptionState(subscription, log);
      return { handled: true };
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const professionalId = await resolveProfessionalId(subscription);
      if (!professionalId) {
        log.warn("subscription.deleted without resolvable pro", {
          subscriptionId: subscription.id,
        });
        return { handled: true };
      }
      await setProSubscriptionTier({
        professionalId,
        tier: "free",
        status: "canceled",
        periodEnd: null,
        stripeId: null,
      });
      return { handled: true };
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;
      if (!subscriptionId) return { handled: false };
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      const professionalId = await resolveProfessionalId(subscription);
      if (!professionalId) return { handled: true };
      const item = subscription.items.data[0];
      const tier = getTierForPriceId(item?.price?.id) ?? "free";
      // Keep the tier value the same — we only flip status to past_due.
      // Cancellation comes via customer.subscription.deleted once Stripe
      // gives up after retries.
      await setProSubscriptionTier({
        professionalId,
        tier,
        status: "past_due",
        periodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
        stripeId: subscription.id,
      });
      return { handled: true };
    }

    default:
      return { handled: false };
  }
}

/**
 * Public-facing tier listing for the upgrade UI. Excludes `free` (you
 * don't "upgrade to free" — that's the cancel flow).
 */
export function getUpgradeableTiers(): {
  tier: PaidProTier;
  priceCents: number;
  perks: string[];
}[] {
  return (["starter", "growth", "scale"] as const).map((tier) => ({
    tier,
    priceCents: SUBSCRIPTION_CONFIGS[tier].monthlyPriceCents,
    perks: SUBSCRIPTION_CONFIGS[tier].perks,
  }));
}
