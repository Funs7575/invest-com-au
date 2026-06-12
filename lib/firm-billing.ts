// Firm billing aggregate helpers — powers /firm-portal/billing (W4.23).
//
// The "single firm payment method" model: a firm admin's existing Stripe
// customer (stored on professionals.stripe_customer_id) is the firm's
// billing relationship. Individual advisors keep their own credit
// balance (no allocation across members at the database level yet);
// the dashboard surfaces the aggregate + per-member breakdown so the
// firm admin can monitor and topup any member who is low.
//
// Read access here goes through the admin client because the underlying
// professionals rows for sibling firm members are NOT visible under
// the anon SELECT policy ("Public can view active" filters by status +
// visibility flags that don't always match firm-internal needs). Every
// caller MUST gate on is_firm_admin before invoking these helpers.

// eslint-disable-next-line no-restricted-imports -- Cross-member aggregation: a firm admin needs to read sibling professionals' credit balances + lifetime spend, which the anon SELECT policy doesn't expose (status + visibility filtering). All call sites in app/firm-portal/billing/* gate on is_firm_admin first.
import { createAdminClient } from "@/lib/supabase/admin";

export interface FirmBillingMember {
  id: number;
  name: string;
  slug: string;
  email: string;
  role: string;
  isFirmAdmin: boolean;
  creditBalanceCents: number;
  lifetimeCreditCents: number;
  lifetimeSpendCents: number;
  autoRechargeEnabled: boolean;
  hasSavedCard: boolean;
  lastLoginAt: string | null;
  isLowBalance: boolean;
}

export interface FirmBillingPaymentMethod {
  // The firm-admin advisor whose Stripe customer is the firm's billing
  // relationship. Null when no firm admin has a Stripe customer yet.
  advisorId: number;
  advisorName: string;
  stripeCustomerId: string;
}

export interface FirmBillingSummary {
  firmId: number;
  firmSlug: string;
  firmName: string;
  totalCreditBalanceCents: number;
  totalLifetimeCreditCents: number;
  totalLifetimeSpendCents: number;
  activeMemberCount: number;
  pendingMemberCount: number;
  lowBalanceMemberCount: number;
  members: FirmBillingMember[];
  paymentMethod: FirmBillingPaymentMethod | null;
}

// Threshold below which a member is flagged as "low balance" on the
// dashboard. Mirrors the auto-recharge default ($50 = 5,000 cents) so
// admins see the same threshold the cron uses.
export const LOW_BALANCE_THRESHOLD_CENTS = 5000;

interface ProfessionalRow {
  id: number;
  name: string;
  slug: string;
  email: string;
  role: string | null;
  is_firm_admin: boolean | null;
  status: string | null;
  credit_balance_cents: number | null;
  lifetime_credit_cents: number | null;
  lifetime_lead_spend_cents: number | null;
  auto_recharge_enabled: boolean | null;
  stripe_customer_id: string | null;
  stripe_default_payment_method: string | null;
  last_login_at: string | null;
}

function mapMember(row: ProfessionalRow): FirmBillingMember {
  const balance = row.credit_balance_cents ?? 0;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    email: row.email,
    role: row.role ?? "member",
    isFirmAdmin: row.is_firm_admin ?? false,
    creditBalanceCents: balance,
    lifetimeCreditCents: row.lifetime_credit_cents ?? 0,
    lifetimeSpendCents: row.lifetime_lead_spend_cents ?? 0,
    autoRechargeEnabled: row.auto_recharge_enabled ?? false,
    hasSavedCard: Boolean(row.stripe_default_payment_method),
    lastLoginAt: row.last_login_at,
    isLowBalance: balance < LOW_BALANCE_THRESHOLD_CENTS,
  };
}

function pickPaymentMethod(
  members: ProfessionalRow[],
): FirmBillingPaymentMethod | null {
  // Prefer the firm admin's Stripe customer (the "single firm payment
  // method"). Fall back to any other member with a customer so the
  // dashboard can still link out to a Stripe portal — uncommon but
  // possible during a transition where the firm admin hasn't paid yet.
  const candidates = members
    .filter((m) => m.stripe_customer_id)
    .sort((a, b) => {
      // Firm admins first, then by lifetime credit (most-paying member
      // is most likely to be the real billing contact).
      if ((a.is_firm_admin ?? false) !== (b.is_firm_admin ?? false)) {
        return a.is_firm_admin ? -1 : 1;
      }
      return (b.lifetime_credit_cents ?? 0) - (a.lifetime_credit_cents ?? 0);
    });

  const winner = candidates[0];
  if (!winner || !winner.stripe_customer_id) return null;

  return {
    advisorId: winner.id,
    advisorName: winner.name,
    stripeCustomerId: winner.stripe_customer_id,
  };
}

export interface FirmBillingSummaryOptions {
  // Override the admin client (testing only — production calls always
  // construct a fresh client per-request).
  client?: ReturnType<typeof createAdminClient>;
}

export async function getFirmBillingSummary(
  firmId: number,
  options: FirmBillingSummaryOptions = {},
): Promise<FirmBillingSummary | null> {
  const client = options.client ?? createAdminClient();

  const { data: firm, error: firmErr } = await client
    .from("advisor_firms")
    .select("id, slug, name, status")
    .eq("id", firmId)
    .single();
  if (firmErr || !firm || firm.status !== "active") return null;

  const { data: rows, error: rowsErr } = await client
    .from("professionals")
    .select(
      "id, name, slug, email, role, is_firm_admin, status, credit_balance_cents, lifetime_credit_cents, lifetime_lead_spend_cents, auto_recharge_enabled, stripe_customer_id, stripe_default_payment_method, last_login_at",
    )
    .eq("firm_id", firmId)
    .in("status", ["active", "pending"])
    .order("is_firm_admin", { ascending: false })
    .order("credit_balance_cents", { ascending: false });
  if (rowsErr || !rows) return null;

  const typed = rows as ProfessionalRow[];
  const activeMembers = typed.filter((r) => r.status === "active");
  const pendingMembers = typed.filter((r) => r.status === "pending");

  const total = activeMembers.reduce(
    (acc, r) => {
      acc.balance += r.credit_balance_cents ?? 0;
      acc.lifetimeCredit += r.lifetime_credit_cents ?? 0;
      acc.lifetimeSpend += r.lifetime_lead_spend_cents ?? 0;
      if ((r.credit_balance_cents ?? 0) < LOW_BALANCE_THRESHOLD_CENTS) {
        acc.lowBalance += 1;
      }
      return acc;
    },
    { balance: 0, lifetimeCredit: 0, lifetimeSpend: 0, lowBalance: 0 },
  );

  return {
    firmId: firm.id,
    firmSlug: firm.slug,
    firmName: firm.name,
    totalCreditBalanceCents: total.balance,
    totalLifetimeCreditCents: total.lifetimeCredit,
    totalLifetimeSpendCents: total.lifetimeSpend,
    activeMemberCount: activeMembers.length,
    pendingMemberCount: pendingMembers.length,
    lowBalanceMemberCount: total.lowBalance,
    members: typed.map(mapMember),
    paymentMethod: pickPaymentMethod(activeMembers),
  };
}

export interface FirmAdminContext {
  advisorId: number;
  firmId: number;
}

export async function resolveFirmAdminContext(
  advisorId: number,
): Promise<FirmAdminContext | null> {
  const admin = createAdminClient();
  const { data: advisor } = await admin
    .from("professionals")
    .select("id, firm_id, is_firm_admin")
    .eq("id", advisorId)
    .single();
  if (!advisor?.is_firm_admin || !advisor.firm_id) return null;
  return { advisorId: advisor.id, firmId: advisor.firm_id };
}

// ───────────────────────────────────────────────────────────────────────────
// Per-seat billing (Firm Lead-Ops mega-session #13) — DORMANT by default.
//
// A flat B2B SaaS subscription: one Stripe subscription per firm, with a
// quantity-based line item where quantity = number of seats. This is the
// "lean lane" expansion lever (a software seat fee), NEVER a percentage of
// advice fees and NEVER consumer money — see docs/strategy/REGULATORY-AVOID-LIST.md.
//
// HARD DORMANCY CONTRACT: NO Stripe API call in this section executes unless
//   (1) the `firm_seat_billing` feature flag is ON, AND
//   (2) the env config exists (STRIPE_FIRM_SEAT_PRICE_ID + Stripe keys).
// `getSeatBillingStatus()` is the single gate every caller must pass through.
// With the flag off OR env unset, the billing UI shows a "contact us"
// fallback (the existing manual seat-request flow) and these helpers no-op.
// ───────────────────────────────────────────────────────────────────────────

import { isFlagEnabled } from "@/lib/feature-flags";
import { logger as _firmBillingLogger } from "@/lib/logger";

const _seatLog = _firmBillingLogger("firm-seat-billing");

/** The feature flag gating ALL per-seat billing. Fail-closed. */
export const FIRM_SEAT_BILLING_FLAG = "firm_seat_billing";

/** Stripe Price ID env var for the per-seat subscription line item. */
export const FIRM_SEAT_PRICE_ENV = "STRIPE_FIRM_SEAT_PRICE_ID";

/** True only when the per-seat Stripe price + secret key are configured. */
export function isSeatBillingConfigured(): boolean {
  return Boolean(
    process.env[FIRM_SEAT_PRICE_ENV] && process.env.STRIPE_SECRET_KEY,
  );
}

export interface SeatBillingStatus {
  /** firm_seat_billing flag is on. */
  flagEnabled: boolean;
  /** Stripe price + key env present. */
  configured: boolean;
  /** Self-serve seat checkout is live (flag AND config). When false the UI
   *  must fall back to the manual "contact us" / seat-request path. */
  available: boolean;
}

/**
 * The single dormancy gate. Returns `available:true` ONLY when the flag is on
 * AND the env config exists. Every Stripe-touching helper below short-circuits
 * unless this returns available:true.
 */
export async function getSeatBillingStatus(): Promise<SeatBillingStatus> {
  const flagEnabled = await isFlagEnabled(FIRM_SEAT_BILLING_FLAG, {
    segment: "advisor",
  });
  const configured = isSeatBillingConfigured();
  return { flagEnabled, configured, available: flagEnabled && configured };
}

export interface SeatSubscriptionResult {
  /** Stripe Checkout URL the firm admin completes to start/expand the sub. */
  url: string;
}

export interface SeatBillingUnavailable {
  unavailable: true;
  /** "dormant" = flag/env gate not satisfied; "no_customer"/"stripe" = config
   *  present but a precondition is missing — callers map to 503/409. */
  reason: "dormant" | "no_customer" | "stripe" | "no_admin";
}

export type SeatBillingOutcome =
  | SeatSubscriptionResult
  | SeatBillingUnavailable;

interface FirmSeatRow {
  id: number;
  stripe_subscription_id: string | null;
  billed_seats: number | null;
}

interface FirmAdminBillingRow {
  id: number;
  email: string | null;
  stripe_customer_id: string | null;
}

/**
 * Load the firm-admin professional who is the firm's billing contact (the
 * "single firm payment method"), plus the firm's current seat-subscription
 * state. Returns null if there's no firm admin to bill against.
 */
async function loadFirmSeatContext(
  firmId: number,
  client?: ReturnType<typeof createAdminClient>,
): Promise<{ firm: FirmSeatRow; admin: FirmAdminBillingRow } | null> {
  const db = client ?? createAdminClient();
  const { data: firmData } = await db
    .from("advisor_firms")
    .select("id, stripe_subscription_id, billed_seats")
    .eq("id", firmId)
    .maybeSingle();
  const firm = firmData as FirmSeatRow | null;
  if (!firm) return null;

  // The firm-admin professional carries the Stripe customer (matches the
  // existing single-firm-payment-method model used by getFirmBillingSummary).
  const { data: adminData } = await db
    .from("professionals")
    .select("id, email, stripe_customer_id")
    .eq("firm_id", firmId)
    .eq("is_firm_admin", true)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  const firmAdmin = adminData as FirmAdminBillingRow | null;
  if (!firmAdmin) return null;

  return { firm, admin: firmAdmin };
}

/**
 * Create (or expand) the firm's per-seat subscription to `seats` seats.
 *
 * DORMANT: returns `{ unavailable:true, reason:"dormant" }` immediately when
 * the flag/env gate isn't satisfied — NO Stripe call is made. When live, it
 * returns a Stripe Checkout URL for a quantity-based subscription line item
 * (mode:"subscription", line_items:[{ price, quantity: seats }]). The webhook
 * (handleFirmSeatSubscription) syncs the resulting subscription id + quantity
 * back onto advisor_firms.
 *
 * We use Checkout (not a bare subscriptions.create) so card capture + SCA are
 * handled by Stripe-hosted UI, mirroring createCheckoutSession in
 * lib/pro-subscription/billing.ts.
 */
export async function createSeatSubscriptionCheckout(input: {
  firmId: number;
  seats: number;
  client?: ReturnType<typeof createAdminClient>;
}): Promise<SeatBillingOutcome> {
  const status = await getSeatBillingStatus();
  if (!status.available) {
    // Flag off or env unset → dormant. No Stripe contact whatsoever.
    return { unavailable: true, reason: "dormant" };
  }

  const priceId = process.env[FIRM_SEAT_PRICE_ENV];
  if (!priceId) return { unavailable: true, reason: "dormant" };

  const seats = Math.max(1, Math.min(200, Math.floor(input.seats)));

  const ctx = await loadFirmSeatContext(input.firmId, input.client);
  if (!ctx) return { unavailable: true, reason: "no_admin" };

  // Lazy-import the Stripe client + helpers so the dormant path never pulls
  // Stripe into the module graph at import time.
  const { getStripe } = await import("@/lib/stripe");
  const { getSiteUrl } = await import("@/lib/url");

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    _seatLog.warn("stripe client unavailable for seat billing", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { unavailable: true, reason: "stripe" };
  }

  // Ensure the firm admin has a Stripe customer (mint one if absent).
  let customerId = ctx.admin.stripe_customer_id;
  if (!customerId) {
    if (!ctx.admin.email) return { unavailable: true, reason: "no_customer" };
    const customer = await stripe.customers.create(
      {
        email: ctx.admin.email,
        metadata: {
          professional_id: String(ctx.admin.id),
          firm_id: String(input.firmId),
        },
      },
      { idempotencyKey: `firm_seat_customer_${ctx.admin.id}` },
    );
    customerId = customer.id;
    const db = input.client ?? createAdminClient();
    await db
      .from("professionals")
      .update({ stripe_customer_id: customer.id } as Record<string, unknown>)
      .eq("id", ctx.admin.id)
      .is("stripe_customer_id", null);
  }

  const siteUrl = getSiteUrl();
  // 10-minute idempotency bucket so a double-click converges on one Checkout
  // but a deliberate retry after cancel gets a fresh one (matches the pro
  // subscription pattern).
  const bucket = Math.floor(Date.now() / (10 * 60 * 1000));

  const session = await stripe.checkout.sessions.create(
    {
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: seats }],
      success_url: `${siteUrl}/advisor-portal?firm_seats=success`,
      cancel_url: `${siteUrl}/advisor-portal?firm_seats=cancelled`,
      subscription_data: {
        metadata: {
          type: "firm_seat_subscription",
          firm_id: String(input.firmId),
        },
      },
      metadata: {
        type: "firm_seat_subscription",
        firm_id: String(input.firmId),
      },
      allow_promotion_codes: true,
    },
    {
      idempotencyKey: `firm_seat_${input.firmId}_${seats}_${bucket}`,
    },
  );

  if (!session.url) {
    return { unavailable: true, reason: "stripe" };
  }
  _seatLog.info("firm seat checkout created", {
    firmId: input.firmId,
    seats,
    sessionId: session.id,
  });
  return { url: session.url };
}

export interface FirmSeatSyncInput {
  firmId: number;
  stripeSubscriptionId: string;
  /** The quantity-derived billed seat count, or null on cancellation. */
  billedSeats: number | null;
  /** Map onto advisor_firms.max_seats too when the sub is active, so the
   *  invite gate honours the paid seat count. Null leaves max_seats as-is. */
  maxSeats: number | null;
  client?: ReturnType<typeof createAdminClient>;
}

/**
 * Sync a firm's seat subscription state onto advisor_firms. Called by the
 * Stripe webhook seat-sync branch. Writes stripe_subscription_id + billed_seats
 * (and, when active, max_seats so the invite gate reflects paid capacity).
 *
 * This is the ONLY writer of advisor_firms.stripe_subscription_id /
 * billed_seats. It does not itself gate on the flag — it runs in response to a
 * real Stripe event, which only exists if billing was live when the checkout
 * happened; replaying it is harmless (idempotent upsert of the same fields).
 */
export async function syncFirmSeatSubscription(
  input: FirmSeatSyncInput,
): Promise<void> {
  const db = input.client ?? createAdminClient();
  const update: Record<string, unknown> = {
    stripe_subscription_id: input.stripeSubscriptionId,
    billed_seats: input.billedSeats,
  };
  if (input.maxSeats !== null) update.max_seats = input.maxSeats;

  const { error } = await db
    .from("advisor_firms")
    .update(update)
    .eq("id", input.firmId);

  if (error) {
    _seatLog.error("firm seat subscription sync failed", {
      firmId: input.firmId,
      error: error.message,
    });
    throw new Error(`Failed to sync firm seat subscription: ${error.message}`);
  }
  _seatLog.info("firm seat subscription synced", {
    firmId: input.firmId,
    billedSeats: input.billedSeats,
  });
}
