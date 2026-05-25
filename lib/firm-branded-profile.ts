// Firm branded-profile subscription (B2) — checkout + entitlement helpers.
//
// A firm pays a recurring subscription to unlock an enhanced /firm/[slug]
// profile (custom hero, featured specialties, booking embed). The
// entitlement + Stripe subscription state live on the advisor_firms row
// (see supabase/migrations/20260521000000_firm_branded_profile_subscription.sql);
// the lifecycle webhook (lib/stripe-webhook/handlers/firm-subscription.ts)
// flips them on customer.subscription.* events.
//
// Mirrors lib/pro-subscription/billing.ts (Checkout session shape, env
// gating, idempotency bucket) and lib/firm-billing.ts (admin client +
// gate-on-is_firm_admin discipline). Read access uses the admin client
// because the branded-profile content columns aren't exposed in a
// firm-admin-scoped shape under the anon SELECT policy, and the firm's
// dedicated branding Stripe customer is distinct from any individual
// advisor's customer.

import type Stripe from "stripe";

// eslint-disable-next-line no-restricted-imports -- Firm-admin branded-profile billing: writes the branding subscription state onto advisor_firms (service-role-only columns) and reads sibling/firm-internal billing fields. Every call site gates on is_firm_admin via resolveFirmAdminContext first.
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";

const log = logger("firm-branded-profile");

// The branded-profile price id env var. Production sets this in Vercel
// before the upgrade page is linked anywhere user-visible. Surfaced via
// checkStripeEnv so a missing var yields an informative 503 rather than a
// runtime throw.
export const BRANDED_PROFILE_PRICE_ENV = "STRIPE_FIRM_BRANDED_PRICE_ID";

export function getBrandedProfilePriceId(): string | null {
  return process.env[BRANDED_PROFILE_PRICE_ENV] || null;
}

// Internal status buckets — must match the advisor_firms_branded_profile_status_check
// CHECK constraint in the migration.
export type BrandedProfileStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "inactive";

/**
 * Whether a given branded-profile status grants the enhanced profile.
 * `active` and `trialing` are entitled; everything else (past_due,
 * canceled, inactive) is not. Past-due deliberately revokes immediately —
 * a firm whose card fails drops back to the free profile until they fix
 * it, which is what the dunning copy on the upgrade page tells them.
 */
export function isEntitledStatus(
  status: BrandedProfileStatus | string | null | undefined,
): boolean {
  return status === "active" || status === "trialing";
}

/**
 * Collapse a Stripe.Subscription.Status into our four UI-facing buckets.
 * Mirrors mapStripeStatus in lib/pro-subscription/billing.ts.
 */
export function mapStripeStatusToBranded(
  stripeStatus: Stripe.Subscription.Status,
): BrandedProfileStatus {
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

// ── Read-side: the firm's current branded-profile state ─────────────────────

export interface BrandedProfileState {
  firmId: number;
  firmSlug: string;
  firmName: string;
  active: boolean;
  status: BrandedProfileStatus | null;
  subscriptionId: string | null;
  periodEnd: string | null;
  stripeCustomerId: string | null;
}

// The subset of advisor_firms columns the branded-profile flow touches.
// The generated database.types.ts predates this migration, so we read
// through this shape and cast at the query boundary.
interface FirmBrandedRow {
  id: number;
  slug: string;
  name: string;
  status: string | null;
  branded_profile_active: boolean | null;
  branded_profile_status: string | null;
  branded_profile_subscription_id: string | null;
  branded_profile_period_end: string | null;
  branded_profile_stripe_customer_id: string | null;
}

const BRANDED_SELECT =
  "id, slug, name, status, branded_profile_active, branded_profile_status, branded_profile_subscription_id, branded_profile_period_end, branded_profile_stripe_customer_id";

function mapState(row: FirmBrandedRow): BrandedProfileState {
  const status = (row.branded_profile_status as BrandedProfileStatus | null) ?? null;
  return {
    firmId: row.id,
    firmSlug: row.slug,
    firmName: row.name,
    // Trust the persisted flag, but never report "active" for a status
    // that isn't entitled (defends against a stale flag if a webhook
    // updated status but not the boolean).
    active: Boolean(row.branded_profile_active) && isEntitledStatus(status),
    status,
    subscriptionId: row.branded_profile_subscription_id,
    periodEnd: row.branded_profile_period_end,
    stripeCustomerId: row.branded_profile_stripe_customer_id,
  };
}

/**
 * Load the branded-profile billing state for a firm. Returns null when
 * the firm doesn't exist or isn't active. Used by the upgrade page.
 */
export async function getBrandedProfileState(
  firmId: number,
): Promise<BrandedProfileState | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("advisor_firms")
    .select(BRANDED_SELECT)
    .eq("id", firmId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as FirmBrandedRow;
  if (row.status !== "active") return null;
  return mapState(row);
}

// ── Checkout ────────────────────────────────────────────────────────────────

export interface BrandedCheckoutResult {
  url: string;
}
export interface BrandedCheckoutFailure {
  /** Set when configuration is missing — callers return 503. */
  unavailable: true;
  reason: string;
}
export type BrandedCheckoutOutcome =
  | BrandedCheckoutResult
  | BrandedCheckoutFailure;

/**
 * Ensure the firm has a dedicated Stripe customer for branding billing.
 * This is intentionally separate from any individual advisor's customer
 * (lead-credit billing) so the firm's branding subscription is isolated
 * and the metadata firm_id is unambiguous on the webhook side. Idempotent
 * via a deterministic idempotencyKey + a conditional update that only
 * writes when the column is still null (mirrors ensureStripeCustomerId in
 * lib/pro-subscription/billing.ts).
 */
async function ensureFirmBrandingCustomer(
  firm: FirmBrandedRow,
  email: string | null,
): Promise<string> {
  if (firm.branded_profile_stripe_customer_id) {
    return firm.branded_profile_stripe_customer_id;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create(
    {
      email: email ?? undefined,
      name: firm.name,
      metadata: { firm_id: String(firm.id), purpose: "branded_profile" },
    },
    { idempotencyKey: `firm_branding_customer_${firm.id}` },
  );

  const admin = createAdminClient();
  await admin
    .from("advisor_firms")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- branded_profile_* columns land via 20260521000000 migration; database.types.ts not yet regenerated.
    .update({ branded_profile_stripe_customer_id: customer.id } as any)
    .eq("id", firm.id)
    // Only claim the slot if no customer landed first (race-safe).
    .is("branded_profile_stripe_customer_id", null);

  // Converge on whichever customer won the race.
  const { data: refreshed } = await admin
    .from("advisor_firms")
    .select("branded_profile_stripe_customer_id")
    .eq("id", firm.id)
    .maybeSingle();
  const fresh = (refreshed as unknown as {
    branded_profile_stripe_customer_id: string | null;
  } | null)?.branded_profile_stripe_customer_id;
  return fresh ?? customer.id;
}

/**
 * Create a Stripe Checkout Session (mode=subscription) to start a firm's
 * branded-profile subscription. The firm_id is stamped on both the
 * session and subscription metadata so the lifecycle webhook can resolve
 * the firm. Returns `{ unavailable }` (→ 503) when Stripe / the price id
 * isn't configured; throws only on genuinely unexpected failures.
 */
export async function createBrandedProfileCheckout(input: {
  firmId: number;
}): Promise<BrandedCheckoutOutcome> {
  const priceId = getBrandedProfilePriceId();
  if (!priceId) {
    log.warn("branded-profile price id not configured");
    return {
      unavailable: true,
      reason: `${BRANDED_PROFILE_PRICE_ENV} not configured`,
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

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("advisor_firms")
    .select(`${BRANDED_SELECT}, email`)
    .eq("id", input.firmId)
    .maybeSingle();
  if (error || !data) throw new Error(`Firm #${input.firmId} not found`);
  const firm = data as unknown as FirmBrandedRow & { email: string | null };

  // Already entitled — nothing to buy. Surface as unavailable so the
  // route can tell the firm-admin to manage via the portal instead.
  if (
    firm.branded_profile_active &&
    isEntitledStatus(firm.branded_profile_status)
  ) {
    return {
      unavailable: true,
      reason: "Branded profile already active",
    };
  }

  const customerId = await ensureFirmBrandingCustomer(firm, firm.email);

  // 10-minute idempotency bucket: a rapid double-click converges on one
  // Checkout URL, a deliberate retry after cancel gets a fresh one.
  const bucket = Math.floor(Date.now() / (10 * 60 * 1000));
  const siteUrl = getSiteUrl();

  const session = await stripe.checkout.sessions.create(
    {
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/firm-portal/branded-profile?subscribe=success`,
      cancel_url: `${siteUrl}/firm-portal/branded-profile?subscribe=cancelled`,
      subscription_data: {
        metadata: {
          firm_id: String(firm.id),
          product: "firm_branded_profile",
        },
      },
      metadata: {
        firm_id: String(firm.id),
        product: "firm_branded_profile",
      },
      allow_promotion_codes: true,
    },
    {
      idempotencyKey: `firm_branded_subscribe_${firm.id}_${bucket}`,
    },
  );

  if (!session.url) throw new Error("Stripe Checkout session has no URL");
  log.info("branded-profile checkout session created", {
    firmId: firm.id,
    sessionId: session.id,
  });
  return { url: session.url };
}

// ── Portal ──────────────────────────────────────────────────────────────────

export type BrandedPortalOutcome =
  | { url: string }
  | BrandedCheckoutFailure;

/**
 * Open a Stripe Customer Portal session for the firm's branding customer
 * so the firm-admin can update the card or cancel. Returns `{ unavailable }`
 * when no branding customer exists yet (firm must subscribe first).
 */
export async function createBrandedProfilePortalUrl(
  firmId: number,
): Promise<BrandedPortalOutcome> {
  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    log.warn("stripe client unavailable", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { unavailable: true, reason: "Stripe not configured" };
  }

  const state = await getBrandedProfileState(firmId);
  if (!state) throw new Error(`Firm #${firmId} not found`);
  if (!state.stripeCustomerId) {
    return { unavailable: true, reason: "No branding billing account yet" };
  }

  const siteUrl = getSiteUrl();
  const session = await stripe.billingPortal.sessions.create({
    customer: state.stripeCustomerId,
    return_url: `${siteUrl}/firm-portal/branded-profile`,
  });
  if (!session.url) throw new Error("Stripe Portal session has no URL");
  log.info("branded-profile portal session created", { firmId });
  return { url: session.url };
}
