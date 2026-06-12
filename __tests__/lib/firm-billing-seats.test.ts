import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockIsFlagEnabled } = vi.hoisted(() => ({
  mockIsFlagEnabled: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
}));
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (..._: unknown[]) => mockIsFlagEnabled(),
}));

// Stripe client mock — we assert it is NEVER constructed/called in dormant
// paths. The factory functions are captured so each test can inspect them.
const { mockCheckoutCreate, mockCustomerCreate, mockGetStripe } = vi.hoisted(() => {
  const mockCheckoutCreate = vi.fn();
  const mockCustomerCreate = vi.fn();
  const mockGetStripe = vi.fn(() => ({
    checkout: { sessions: { create: mockCheckoutCreate } },
    customers: { create: mockCustomerCreate },
  }));
  return { mockCheckoutCreate, mockCustomerCreate, mockGetStripe };
});
vi.mock("@/lib/stripe", () => ({ getStripe: mockGetStripe }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));

// Admin client — configured per-test.
const { state } = vi.hoisted(() => ({
  state: {
    handlers: {} as Record<string, () => unknown>,
    updates: [] as { table: string; payload: Record<string, unknown> }[],
  },
}));
function makeAdmin() {
  return {
    from: vi.fn((table: string) => {
      const handler = state.handlers[table];
      return handler ? handler() : {};
    }),
  };
}
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => makeAdmin()),
}));

import {
  getSeatBillingStatus,
  isSeatBillingConfigured,
  createSeatSubscriptionCheckout,
  syncFirmSeatSubscription,
  FIRM_SEAT_PRICE_ENV,
} from "@/lib/firm-billing";

// ── Builders ────────────────────────────────────────────────────────────────

function single(data: unknown) {
  return () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
  });
}
function updateRecorder(table: string, error: { message: string } | null = null) {
  return () => ({
    update: vi.fn((payload: Record<string, unknown>) => {
      state.updates.push({ table, payload });
      return { eq: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ error }) }) };
    }),
  });
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  state.handlers = {};
  state.updates = [];
  mockIsFlagEnabled.mockResolvedValue(false);
  delete process.env[FIRM_SEAT_PRICE_ENV];
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

// ── isSeatBillingConfigured / getSeatBillingStatus ───────────────────────────

describe("seat billing configuration gate", () => {
  it("isSeatBillingConfigured requires both price id and secret key", () => {
    expect(isSeatBillingConfigured()).toBe(false); // price id unset
    process.env[FIRM_SEAT_PRICE_ENV] = "price_seat";
    expect(isSeatBillingConfigured()).toBe(true);
    delete process.env.STRIPE_SECRET_KEY;
    expect(isSeatBillingConfigured()).toBe(false);
  });

  it("getSeatBillingStatus is available ONLY when flag on AND configured", async () => {
    // flag off + unconfigured
    expect(await getSeatBillingStatus()).toEqual({
      flagEnabled: false,
      configured: false,
      available: false,
    });

    // flag on but still unconfigured (no price id)
    mockIsFlagEnabled.mockResolvedValue(true);
    expect((await getSeatBillingStatus()).available).toBe(false);

    // flag on AND configured
    process.env[FIRM_SEAT_PRICE_ENV] = "price_seat";
    const status = await getSeatBillingStatus();
    expect(status).toEqual({ flagEnabled: true, configured: true, available: true });
  });
});

// ── createSeatSubscriptionCheckout — DORMANCY ────────────────────────────────

describe("createSeatSubscriptionCheckout — dormant", () => {
  it("returns dormant and makes NO Stripe call when the flag is off", async () => {
    process.env[FIRM_SEAT_PRICE_ENV] = "price_seat"; // configured, but flag off
    const out = await createSeatSubscriptionCheckout({ firmId: 1, seats: 12 });
    expect(out).toEqual({ unavailable: true, reason: "dormant" });
    expect(mockGetStripe).not.toHaveBeenCalled();
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
    expect(mockCustomerCreate).not.toHaveBeenCalled();
  });

  it("returns dormant and makes NO Stripe call when the price env is unset", async () => {
    mockIsFlagEnabled.mockResolvedValue(true); // flag on, but no price id
    const out = await createSeatSubscriptionCheckout({ firmId: 1, seats: 12 });
    expect(out).toEqual({ unavailable: true, reason: "dormant" });
    expect(mockGetStripe).not.toHaveBeenCalled();
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });
});

// ── createSeatSubscriptionCheckout — LIVE ────────────────────────────────────

describe("createSeatSubscriptionCheckout — live", () => {
  beforeEach(() => {
    mockIsFlagEnabled.mockResolvedValue(true);
    process.env[FIRM_SEAT_PRICE_ENV] = "price_seat";
  });

  it("returns no_admin when the firm has no firm-admin billing contact", async () => {
    state.handlers["advisor_firms"] = single({ id: 1, stripe_subscription_id: null, billed_seats: null });
    state.handlers["professionals"] = single(null); // no firm admin
    const out = await createSeatSubscriptionCheckout({ firmId: 1, seats: 12 });
    expect(out).toEqual({ unavailable: true, reason: "no_admin" });
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });

  it("creates a quantity-based subscription Checkout when admin already has a customer", async () => {
    state.handlers["advisor_firms"] = single({ id: 1, stripe_subscription_id: null, billed_seats: null });
    state.handlers["professionals"] = single({
      id: 7,
      email: "admin@firm.test",
      stripe_customer_id: "cus_existing",
    });
    mockCheckoutCreate.mockResolvedValue({ id: "cs_1", url: "https://stripe/checkout/cs_1" });

    const out = await createSeatSubscriptionCheckout({ firmId: 1, seats: 12 });
    expect(out).toEqual({ url: "https://stripe/checkout/cs_1" });

    // No new customer minted (already had one).
    expect(mockCustomerCreate).not.toHaveBeenCalled();
    // Subscription mode, quantity = seats, firm metadata.
    const arg = mockCheckoutCreate.mock.calls[0]?.[0];
    expect(arg).toMatchObject({
      customer: "cus_existing",
      mode: "subscription",
      line_items: [{ price: "price_seat", quantity: 12 }],
    });
    expect(arg.subscription_data.metadata).toMatchObject({
      type: "firm_seat_subscription",
      firm_id: "1",
    });
  });

  it("mints a Stripe customer when the firm admin has none, then checks out", async () => {
    state.handlers["advisor_firms"] = single({ id: 2, stripe_subscription_id: null, billed_seats: null });
    state.handlers["professionals"] = single({ id: 9, email: "a@firm.test", stripe_customer_id: null });
    state.handlers["professionals_update"] = updateRecorder("professionals");
    // professionals is read (single) and then updated — our makeAdmin returns
    // the same handler; route the update through a combined builder:
    state.handlers["professionals"] = () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 9, email: "a@firm.test", stripe_customer_id: null },
      }),
      update: vi.fn((payload: Record<string, unknown>) => {
        state.updates.push({ table: "professionals", payload });
        return { eq: vi.fn().mockReturnValue({ is: vi.fn().mockResolvedValue({ error: null }) }) };
      }),
    });
    mockCustomerCreate.mockResolvedValue({ id: "cus_new" });
    mockCheckoutCreate.mockResolvedValue({ id: "cs_2", url: "https://stripe/checkout/cs_2" });

    const out = await createSeatSubscriptionCheckout({ firmId: 2, seats: 5 });
    expect(out).toEqual({ url: "https://stripe/checkout/cs_2" });
    expect(mockCustomerCreate).toHaveBeenCalledTimes(1);
    expect(mockCheckoutCreate.mock.calls[0]?.[0].customer).toBe("cus_new");
  });

  it("clamps seats into [1,200]", async () => {
    state.handlers["advisor_firms"] = single({ id: 1, stripe_subscription_id: null, billed_seats: null });
    state.handlers["professionals"] = single({ id: 7, email: "a@f.test", stripe_customer_id: "cus_x" });
    mockCheckoutCreate.mockResolvedValue({ id: "cs", url: "https://x" });
    await createSeatSubscriptionCheckout({ firmId: 1, seats: 9999 });
    expect(mockCheckoutCreate.mock.calls[0]?.[0].line_items[0].quantity).toBe(200);
  });
});

// ── syncFirmSeatSubscription ─────────────────────────────────────────────────

describe("syncFirmSeatSubscription", () => {
  it("writes stripe_subscription_id, billed_seats and max_seats when active", async () => {
    let captured: Record<string, unknown> | null = null;
    state.handlers["advisor_firms"] = () => ({
      update: vi.fn((payload: Record<string, unknown>) => {
        captured = payload;
        return { eq: vi.fn().mockResolvedValue({ error: null }) };
      }),
    });
    await syncFirmSeatSubscription({
      firmId: 4,
      stripeSubscriptionId: "sub_1",
      billedSeats: 8,
      maxSeats: 8,
    });
    expect(captured).toEqual({
      stripe_subscription_id: "sub_1",
      billed_seats: 8,
      max_seats: 8,
    });
  });

  it("omits max_seats from the update when null (cancellation)", async () => {
    let captured: Record<string, unknown> | null = null;
    state.handlers["advisor_firms"] = () => ({
      update: vi.fn((payload: Record<string, unknown>) => {
        captured = payload;
        return { eq: vi.fn().mockResolvedValue({ error: null }) };
      }),
    });
    await syncFirmSeatSubscription({
      firmId: 4,
      stripeSubscriptionId: "sub_1",
      billedSeats: null,
      maxSeats: null,
    });
    expect(captured).toEqual({
      stripe_subscription_id: "sub_1",
      billed_seats: null,
    });
    expect(captured).not.toHaveProperty("max_seats");
  });

  it("throws when the DB update errors (so the webhook retries)", async () => {
    state.handlers["advisor_firms"] = () => ({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: { message: "db down" } }),
      })),
    });
    await expect(
      syncFirmSeatSubscription({
        firmId: 4,
        stripeSubscriptionId: "sub_1",
        billedSeats: 8,
        maxSeats: 8,
      }),
    ).rejects.toThrow(/db down/);
  });
});
