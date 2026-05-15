import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type Stripe from "stripe";

// ── Hoisted mocks ─────────────────────────────────────────────────────────
const {
  mockFrom,
  mockSetProSubscriptionTier,
  mockGetStripe,
  mockGetSiteUrl,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSetProSubscriptionTier: vi.fn(),
  mockGetStripe: vi.fn(),
  mockGetSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: mockGetStripe,
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: mockGetSiteUrl,
}));

vi.mock("@/lib/pro-subscription", async () => {
  // Re-export SUBSCRIPTION_CONFIGS / types from a partial mock — only
  // `setProSubscriptionTier` is mocked since the billing module writes
  // through it. The other exports are kept real so the billing module
  // can call `SUBSCRIPTION_CONFIGS[tier].monthlyPriceCents` from
  // `getUpgradeableTiers()`.
  const actual = await vi.importActual<typeof import("@/lib/pro-subscription")>(
    "@/lib/pro-subscription",
  );
  return {
    ...actual,
    setProSubscriptionTier: (...args: unknown[]) =>
      mockSetProSubscriptionTier(...args),
  };
});

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import {
  createBillingPortalUrl,
  createCheckoutSession,
  getPriceIdForTier,
  getTierForPriceId,
  getUpgradeableTiers,
  handleSubscriptionWebhook,
} from "@/lib/pro-subscription/billing";

// ── Helpers ───────────────────────────────────────────────────────────────

function stubProRow(row: {
  id: number;
  email: string | null;
  stripe_customer_id: string | null;
}) {
  // Two consecutive `.from("professionals").select(...).eq(...).maybeSingle()`
  // calls: first to read pro, optionally second to read after ensure-customer.
  // We make `maybeSingle` always return the row by default.
  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  }));
}

function makeStripeClient(overrides: {
  customersCreate?: ReturnType<typeof vi.fn>;
  checkoutCreate?: ReturnType<typeof vi.fn>;
  portalCreate?: ReturnType<typeof vi.fn>;
  subscriptionsRetrieve?: ReturnType<typeof vi.fn>;
} = {}) {
  return {
    customers: {
      create:
        overrides.customersCreate ??
        vi.fn().mockResolvedValue({ id: "cus_new" } as Stripe.Customer),
    },
    checkout: {
      sessions: {
        create:
          overrides.checkoutCreate ??
          vi.fn().mockResolvedValue({
            id: "cs_test",
            url: "https://checkout.stripe.com/c/cs_test",
          }),
      },
    },
    billingPortal: {
      sessions: {
        create:
          overrides.portalCreate ??
          vi.fn().mockResolvedValue({
            id: "bps_test",
            url: "https://billing.stripe.com/portal_test",
          }),
      },
    },
    subscriptions: {
      retrieve:
        overrides.subscriptionsRetrieve ??
        vi.fn().mockResolvedValue({
          id: "sub_test",
          status: "active",
          customer: "cus_test",
          current_period_end: 1_700_000_000,
          items: { data: [{ price: { id: "price_starter_test" } }] },
          metadata: { professional_id: "42" },
        }),
    },
  };
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = {
    ...ORIGINAL_ENV,
    STRIPE_PRICE_ID_STARTER: "price_starter_test",
    STRIPE_PRICE_ID_GROWTH: "price_growth_test",
    STRIPE_PRICE_ID_SCALE: "price_scale_test",
  };
  mockSetProSubscriptionTier.mockResolvedValue(undefined);
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

// ── getPriceIdForTier / getTierForPriceId ─────────────────────────────────

describe("price id helpers", () => {
  it("maps tier → env price id", () => {
    expect(getPriceIdForTier("starter")).toBe("price_starter_test");
    expect(getPriceIdForTier("growth")).toBe("price_growth_test");
    expect(getPriceIdForTier("scale")).toBe("price_scale_test");
  });

  it("returns null when env var is unset", () => {
    delete process.env.STRIPE_PRICE_ID_GROWTH;
    expect(getPriceIdForTier("growth")).toBeNull();
  });

  it("reverse-maps price id → tier", () => {
    expect(getTierForPriceId("price_starter_test")).toBe("starter");
    expect(getTierForPriceId("price_growth_test")).toBe("growth");
    expect(getTierForPriceId("price_scale_test")).toBe("scale");
    expect(getTierForPriceId("price_unknown")).toBeNull();
    expect(getTierForPriceId(null)).toBeNull();
  });
});

// ── createCheckoutSession ─────────────────────────────────────────────────

describe("createCheckoutSession", () => {
  it("returns a Stripe Checkout URL", async () => {
    stubProRow({ id: 42, email: "pro@test.com", stripe_customer_id: "cus_test" });
    const stripe = makeStripeClient();
    mockGetStripe.mockReturnValue(stripe);

    const outcome = await createCheckoutSession({
      professionalId: 42,
      tier: "starter",
    });

    expect("url" in outcome && outcome.url).toBe(
      "https://checkout.stripe.com/c/cs_test",
    );
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_test",
        line_items: [{ price: "price_starter_test", quantity: 1 }],
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringContaining("pro_subscribe_42_starter_"),
      }),
    );
  });

  it("returns unavailable when the price id env var is unset", async () => {
    delete process.env.STRIPE_PRICE_ID_GROWTH;
    const outcome = await createCheckoutSession({
      professionalId: 42,
      tier: "growth",
    });
    expect("unavailable" in outcome && outcome.unavailable).toBe(true);
    expect(mockGetStripe).not.toHaveBeenCalled();
  });

  it("returns unavailable when Stripe throws (e.g. secret missing)", async () => {
    mockGetStripe.mockImplementation(() => {
      throw new Error("STRIPE_SECRET_KEY is not set");
    });
    const outcome = await createCheckoutSession({
      professionalId: 42,
      tier: "starter",
    });
    expect("unavailable" in outcome && outcome.unavailable).toBe(true);
  });

  it("creates a Stripe customer when the pro has none", async () => {
    const created = { id: "cus_created" } as Stripe.Customer;

    // 1st call: select pro row (no customer id).
    // 2nd call: update pro row.
    // 3rd call: re-select to get the customer id (race converge).
    const selectMaybeSingle = vi
      .fn()
      // First select: pro has no customer
      .mockResolvedValueOnce({
        data: { id: 42, email: "p@t.com", stripe_customer_id: null },
        error: null,
      })
      // Second select: after update, customer id is now present
      .mockResolvedValueOnce({
        data: { stripe_customer_id: "cus_created" },
        error: null,
      });
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: selectMaybeSingle,
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }));

    const stripe = makeStripeClient({
      customersCreate: vi.fn().mockResolvedValue(created),
    });
    mockGetStripe.mockReturnValue(stripe);

    const outcome = await createCheckoutSession({
      professionalId: 42,
      tier: "starter",
    });
    expect("url" in outcome).toBe(true);
    expect(stripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "p@t.com" }),
      expect.objectContaining({ idempotencyKey: "pro_customer_42" }),
    );
  });
});

// ── createBillingPortalUrl ────────────────────────────────────────────────

describe("createBillingPortalUrl", () => {
  it("returns a Portal URL when the pro has a customer", async () => {
    stubProRow({ id: 42, email: "p@t.com", stripe_customer_id: "cus_test" });
    const stripe = makeStripeClient();
    mockGetStripe.mockReturnValue(stripe);

    const outcome = await createBillingPortalUrl(42);
    expect("url" in outcome && outcome.url).toContain("billing.stripe.com");
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: "cus_test",
      return_url: "https://invest.com.au/pros/billing",
    });
  });

  it("returns unavailable when the pro has no customer", async () => {
    stubProRow({ id: 42, email: "p@t.com", stripe_customer_id: null });
    mockGetStripe.mockReturnValue(makeStripeClient());

    const outcome = await createBillingPortalUrl(42);
    expect("unavailable" in outcome && outcome.unavailable).toBe(true);
    expect("unavailable" in outcome && outcome.reason).toContain(
      "No billing account",
    );
  });
});

// ── handleSubscriptionWebhook ─────────────────────────────────────────────

function makeSubscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_test",
    object: "subscription",
    customer: "cus_test",
    status: "active",
    current_period_end: 1_700_000_000,
    items: { data: [{ price: { id: "price_starter_test" } }] },
    metadata: { professional_id: "42", pro_tier: "starter" },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

describe("handleSubscriptionWebhook", () => {
  it("flips tier to free on customer.subscription.deleted", async () => {
    const event: Stripe.Event = {
      id: "evt_del",
      type: "customer.subscription.deleted",
      data: { object: makeSubscription({ status: "canceled" }) },
    } as unknown as Stripe.Event;

    const result = await handleSubscriptionWebhook(event);
    expect(result.handled).toBe(true);
    expect(mockSetProSubscriptionTier).toHaveBeenCalledWith(
      expect.objectContaining({
        professionalId: 42,
        tier: "free",
        status: "canceled",
        stripeId: null,
      }),
    );
  });

  it("flips status to past_due on invoice.payment_failed", async () => {
    const subscription = makeSubscription({ status: "past_due" });
    mockGetStripe.mockReturnValue(
      makeStripeClient({
        subscriptionsRetrieve: vi.fn().mockResolvedValue(subscription),
      }),
    );
    const event: Stripe.Event = {
      id: "evt_invoice_fail",
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_test",
          subscription: "sub_test",
          customer: "cus_test",
        } as unknown as Stripe.Invoice,
      },
    } as unknown as Stripe.Event;

    const result = await handleSubscriptionWebhook(event);
    expect(result.handled).toBe(true);
    expect(mockSetProSubscriptionTier).toHaveBeenCalledWith(
      expect.objectContaining({
        professionalId: 42,
        tier: "starter",
        status: "past_due",
      }),
    );
  });

  it("upgrades to the matching tier on checkout.session.completed (subscription mode)", async () => {
    const subscription = makeSubscription();
    mockGetStripe.mockReturnValue(
      makeStripeClient({
        subscriptionsRetrieve: vi.fn().mockResolvedValue(subscription),
      }),
    );
    const event: Stripe.Event = {
      id: "evt_co",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          mode: "subscription",
          subscription: "sub_test",
          metadata: { professional_id: "42", pro_tier: "starter" },
        } as unknown as Stripe.Checkout.Session,
      },
    } as unknown as Stripe.Event;

    const result = await handleSubscriptionWebhook(event);
    expect(result.handled).toBe(true);
    expect(mockSetProSubscriptionTier).toHaveBeenCalledWith(
      expect.objectContaining({
        professionalId: 42,
        tier: "starter",
        status: "active",
        stripeId: "sub_test",
      }),
    );
  });

  it("ignores checkout.session.completed when mode is payment (not subscription)", async () => {
    const event: Stripe.Event = {
      id: "evt_co_payment",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          mode: "payment",
          metadata: { type: "advisor_credit_topup" },
        } as unknown as Stripe.Checkout.Session,
      },
    } as unknown as Stripe.Event;

    const result = await handleSubscriptionWebhook(event);
    expect(result.handled).toBe(false);
    expect(mockSetProSubscriptionTier).not.toHaveBeenCalled();
  });

  it("is idempotent: replaying the same event keeps the final state stable", async () => {
    // The webhook route dedupes by event.id before this is called. But
    // even if a duplicate slipped through, the handler boils down to a
    // single UPDATE — calling it twice with the same event should result
    // in identical setProSubscriptionTier args both times.
    const event: Stripe.Event = {
      id: "evt_dup",
      type: "customer.subscription.deleted",
      data: { object: makeSubscription({ status: "canceled" }) },
    } as unknown as Stripe.Event;

    await handleSubscriptionWebhook(event);
    await handleSubscriptionWebhook(event);

    expect(mockSetProSubscriptionTier).toHaveBeenCalledTimes(2);
    const calls = mockSetProSubscriptionTier.mock.calls.map((c) => c[0]);
    expect(calls[0]).toEqual(calls[1]);
  });

  it("returns handled:false for event types it doesn't own", async () => {
    const event: Stripe.Event = {
      id: "evt_dispute",
      type: "charge.dispute.created",
      data: { object: {} },
    } as unknown as Stripe.Event;
    const result = await handleSubscriptionWebhook(event);
    expect(result.handled).toBe(false);
  });
});

// ── getUpgradeableTiers ───────────────────────────────────────────────────

describe("getUpgradeableTiers", () => {
  it("returns the three paid tiers in order", () => {
    const tiers = getUpgradeableTiers();
    expect(tiers.map((t) => t.tier)).toEqual(["starter", "growth", "scale"]);
    expect(tiers[0]?.priceCents).toBe(2900);
    expect(tiers[1]?.priceCents).toBe(9900);
    expect(tiers[2]?.priceCents).toBe(24900);
  });
});
