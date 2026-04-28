/**
 * Stripe webhook idempotency replay tests (V-NEW-03).
 *
 * Each scenario replays the same Stripe event 3× and asserts:
 *   1. All calls return HTTP 200 (no crashes on replay).
 *   2. Calls 2 and 3 return { received: true, duplicate: true } — the
 *      stripe_webhook_events state machine short-circuits them.
 *   3. Business-logic DB writes occur exactly once, proving convergence.
 *
 * Coverage for the four event types specified in the DoD:
 *   - customer.subscription.created
 *   - invoice.paid
 *   - invoice.payment_failed
 *   - charge.refunded  (the existing handler for the "refund.created" family)
 *
 * This file also serves as the reference pattern for DD-* stream tests.
 * Copy, adjust the event data and convergence assertions for your handler.
 *
 * // idempotency-tested: stripe
 */

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import {
  createIdempotencyHarness,
  makeStripeEvent,
  makeWebhookRequest,
  type IdempotencyHarness,
} from "@/__tests__/lib/stripe-webhook-idempotency.harness";

// ─── Swappable mock target ────────────────────────────────────────────────────
// vi.mock is hoisted, so all describe blocks share a single mock factory.
// Each describe's beforeEach swaps `activeMockFrom` to its own harness.mockFrom.
let activeMockFrom: ReturnType<typeof vi.fn>;

// ─── Module mocks (must be hoisted before route import) ──────────────────────

const mockConstructEvent = vi.fn();
const mockCustomerRetrieve = vi.fn();
const mockStripe = {
  webhooks: { constructEvent: mockConstructEvent },
  customers: { retrieve: mockCustomerRetrieve },
};

vi.mock("@/lib/stripe", () => ({
  getStripe: () => mockStripe,
  PLANS: { monthly: { label: "$9/month" }, yearly: { label: "$89/year" } },
}));

const mockHandleInvoicePaid = vi.fn();
const mockHandleInvoicePaymentFailed = vi.fn();
vi.mock("@/lib/advisor-billing", () => ({
  handleInvoicePaid: (...args: unknown[]) => mockHandleInvoicePaid(...args),
  handleInvoicePaymentFailed: (...args: unknown[]) => mockHandleInvoicePaymentFailed(...args),
}));

vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (...args: unknown[]) => activeMockFrom(...args) }),
}));

// ─── Route import (after mocks) ──────────────────────────────────────────────
import { POST } from "@/app/api/stripe/webhook/route";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeSubscriptionData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "sub_replay_001",
    customer: "cus_replay_001",
    status: "active",
    items: {
      data: [{ price: { id: "price_monthly", recurring: { interval: "month" } } }],
    },
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
    cancel_at_period_end: false,
    canceled_at: null,
    cancel_at: null,
    ...overrides,
  };
}

function makeInvoiceData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "in_replay_001",
    customer: "cus_replay_001",
    payment_intent: "pi_replay_001",
    amount_due: 999,
    metadata: { type: "advisor_lead" },
    ...overrides,
  };
}

function makeChargeData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "ch_replay_001",
    payment_intent: "pi_replay_001",
    amount_refunded: 999,
    ...overrides,
  };
}

// ─── Shared beforeEach setup helper ──────────────────────────────────────────

function setupBeforeEach(harness: IdempotencyHarness, withCustomerEmail = false) {
  vi.clearAllMocks();
  harness.reset();
  activeMockFrom = harness.mockFrom;
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  mockHandleInvoicePaid.mockResolvedValue(undefined);
  mockHandleInvoicePaymentFailed.mockResolvedValue(undefined);
  if (withCustomerEmail) {
    mockCustomerRetrieve.mockResolvedValue({ id: "cus_replay_001", email: "user@example.com" });
  }
}

// ─── Suite 1: customer.subscription.created ──────────────────────────────────

describe("idempotency: customer.subscription.created", () => {
  const harness = createIdempotencyHarness({ profileData: { id: "user-uuid-sub" } });

  beforeEach(() => { setupBeforeEach(harness, true); });
  afterAll(() => { vi.restoreAllMocks(); });

  it("all 3 replays return HTTP 200", async () => {
    const evt = makeStripeEvent(
      "customer.subscription.created",
      makeSubscriptionData(),
      "evt_sub_created_001",
    );
    mockConstructEvent.mockReturnValue(evt);
    const results = await harness.replay(
      POST as (req: Request) => Promise<Response>,
      () => makeWebhookRequest(JSON.stringify(evt)),
    );
    harness.assertAllSucceeded(results);
  });

  it("replays 2 and 3 are short-circuited as duplicates", async () => {
    const evt = makeStripeEvent(
      "customer.subscription.created",
      makeSubscriptionData(),
      "evt_sub_created_002",
    );
    mockConstructEvent.mockReturnValue(evt);
    const results = await harness.replay(
      POST as (req: Request) => Promise<Response>,
      () => makeWebhookRequest(JSON.stringify(evt)),
    );
    harness.assertDuplicatesShortCircuited(results, 2);
    expect(results[0]!.isDuplicate).toBe(false);
    expect(results[0]!.body.received).toBe(true);
  });

  it("subscription upsert converges to exactly 1 write", async () => {
    const evt = makeStripeEvent(
      "customer.subscription.created",
      makeSubscriptionData(),
      "evt_sub_created_003",
    );
    mockConstructEvent.mockReturnValue(evt);
    await harness.replay(
      POST as (req: Request) => Promise<Response>,
      () => makeWebhookRequest(JSON.stringify(evt)),
    );
    harness.assertConverged("subscriptions", "upsert", 1);
  });

  it("profiles lookup converges to exactly 1 query", async () => {
    const evt = makeStripeEvent(
      "customer.subscription.created",
      makeSubscriptionData(),
      "evt_sub_created_004",
    );
    mockConstructEvent.mockReturnValue(evt);
    await harness.replay(
      POST as (req: Request) => Promise<Response>,
      () => makeWebhookRequest(JSON.stringify(evt)),
    );
    harness.assertConverged("profiles", "single", 1);
  });
});

// ─── Suite 2: invoice.paid ────────────────────────────────────────────────────

describe("idempotency: invoice.paid", () => {
  const harness = createIdempotencyHarness({ profileData: { id: "user-uuid-inv" } });

  beforeEach(() => { setupBeforeEach(harness); });
  afterAll(() => { vi.restoreAllMocks(); });

  it("all 3 replays return HTTP 200", async () => {
    const evt = makeStripeEvent("invoice.paid", makeInvoiceData(), "evt_inv_paid_001");
    mockConstructEvent.mockReturnValue(evt);
    const results = await harness.replay(
      POST as (req: Request) => Promise<Response>,
      () => makeWebhookRequest(JSON.stringify(evt)),
    );
    harness.assertAllSucceeded(results);
  });

  it("replays 2 and 3 are duplicate-detected", async () => {
    const evt = makeStripeEvent("invoice.paid", makeInvoiceData(), "evt_inv_paid_002");
    mockConstructEvent.mockReturnValue(evt);
    const results = await harness.replay(
      POST as (req: Request) => Promise<Response>,
      () => makeWebhookRequest(JSON.stringify(evt)),
    );
    harness.assertDuplicatesShortCircuited(results, 2);
  });

  it("advisor_lead path: handleInvoicePaid converges to exactly 1 call", async () => {
    const evt = makeStripeEvent(
      "invoice.paid",
      makeInvoiceData({ metadata: { type: "advisor_lead" } }),
      "evt_inv_paid_003",
    );
    mockConstructEvent.mockReturnValue(evt);
    await harness.replay(
      POST as (req: Request) => Promise<Response>,
      () => makeWebhookRequest(JSON.stringify(evt)),
    );
    expect(mockHandleInvoicePaid).toHaveBeenCalledTimes(1);
  });

  it("non-advisor invoice: converges without calling handleInvoicePaid", async () => {
    const evt = makeStripeEvent(
      "invoice.paid",
      makeInvoiceData({ metadata: {} }),
      "evt_inv_paid_004",
    );
    mockConstructEvent.mockReturnValue(evt);
    const results = await harness.replay(
      POST as (req: Request) => Promise<Response>,
      () => makeWebhookRequest(JSON.stringify(evt)),
    );
    harness.assertAllSucceeded(results);
    harness.assertDuplicatesShortCircuited(results, 2);
    expect(mockHandleInvoicePaid).not.toHaveBeenCalled();
  });
});

// ─── Suite 3: invoice.payment_failed ─────────────────────────────────────────

describe("idempotency: invoice.payment_failed", () => {
  const harness = createIdempotencyHarness({ profileData: { id: "user-uuid-fail" } });

  beforeEach(() => { setupBeforeEach(harness, true); });
  afterAll(() => { vi.restoreAllMocks(); });

  it("all 3 replays return HTTP 200", async () => {
    const evt = makeStripeEvent(
      "invoice.payment_failed",
      makeInvoiceData({ metadata: {} }),
      "evt_pay_fail_001",
    );
    mockConstructEvent.mockReturnValue(evt);
    const results = await harness.replay(
      POST as (req: Request) => Promise<Response>,
      () => makeWebhookRequest(JSON.stringify(evt)),
    );
    harness.assertAllSucceeded(results);
  });

  it("replays 2 and 3 short-circuit as duplicates", async () => {
    const evt = makeStripeEvent(
      "invoice.payment_failed",
      makeInvoiceData({ metadata: {} }),
      "evt_pay_fail_002",
    );
    mockConstructEvent.mockReturnValue(evt);
    const results = await harness.replay(
      POST as (req: Request) => Promise<Response>,
      () => makeWebhookRequest(JSON.stringify(evt)),
    );
    harness.assertDuplicatesShortCircuited(results, 2);
  });

  it("advisor_lead path: handleInvoicePaymentFailed called exactly once", async () => {
    const evt = makeStripeEvent(
      "invoice.payment_failed",
      makeInvoiceData({ metadata: { type: "advisor_lead" } }),
      "evt_pay_fail_003",
    );
    mockConstructEvent.mockReturnValue(evt);
    await harness.replay(
      POST as (req: Request) => Promise<Response>,
      () => makeWebhookRequest(JSON.stringify(evt)),
    );
    expect(mockHandleInvoicePaymentFailed).toHaveBeenCalledTimes(1);
  });

  it("subscriptions write converges: at most 1 update across all replays", async () => {
    const evt = makeStripeEvent(
      "invoice.payment_failed",
      makeInvoiceData({ metadata: {} }),
      "evt_pay_fail_004",
    );
    mockConstructEvent.mockReturnValue(evt);
    await harness.replay(
      POST as (req: Request) => Promise<Response>,
      () => makeWebhookRequest(JSON.stringify(evt)),
    );
    const subUpdates = harness.getCalls("subscriptions").filter((c) => c.method === "update");
    expect(subUpdates.length).toBeLessThanOrEqual(1);
  });
});

// ─── Suite 4: charge.refunded ─────────────────────────────────────────────────

describe("idempotency: charge.refunded", () => {
  const harness = createIdempotencyHarness({ profileData: null });

  beforeEach(() => { setupBeforeEach(harness); });
  afterAll(() => { vi.restoreAllMocks(); });

  it("all 3 replays return HTTP 200", async () => {
    const evt = makeStripeEvent("charge.refunded", makeChargeData(), "evt_charge_ref_001");
    mockConstructEvent.mockReturnValue(evt);
    const results = await harness.replay(
      POST as (req: Request) => Promise<Response>,
      () => makeWebhookRequest(JSON.stringify(evt)),
    );
    harness.assertAllSucceeded(results);
  });

  it("replays 2 and 3 are duplicate-detected", async () => {
    const evt = makeStripeEvent("charge.refunded", makeChargeData(), "evt_charge_ref_002");
    mockConstructEvent.mockReturnValue(evt);
    const results = await harness.replay(
      POST as (req: Request) => Promise<Response>,
      () => makeWebhookRequest(JSON.stringify(evt)),
    );
    harness.assertDuplicatesShortCircuited(results, 2);
  });

  it("course_purchases write is bounded to at most 1 across all replays", async () => {
    const evt = makeStripeEvent(
      "charge.refunded",
      makeChargeData({ payment_intent: "pi_course_refund" }),
      "evt_charge_ref_003",
    );
    mockConstructEvent.mockReturnValue(evt);
    await harness.replay(
      POST as (req: Request) => Promise<Response>,
      () => makeWebhookRequest(JSON.stringify(evt)),
    );
    const cpWrites = harness.getCalls("course_purchases").filter((c) => c.method === "update");
    expect(cpWrites.length).toBeLessThanOrEqual(1);
  });

  it("null payment_intent: early-exit path is still idempotent", async () => {
    const evt = makeStripeEvent(
      "charge.refunded",
      makeChargeData({ payment_intent: null }),
      "evt_charge_ref_004",
    );
    mockConstructEvent.mockReturnValue(evt);
    const results = await harness.replay(
      POST as (req: Request) => Promise<Response>,
      () => makeWebhookRequest(JSON.stringify(evt)),
    );
    harness.assertAllSucceeded(results);
    harness.assertDuplicatesShortCircuited(results, 2);
  });
});

// ─── Suite 5: state machine edge cases ───────────────────────────────────────

describe("idempotency state machine: edge cases", () => {
  const harness = createIdempotencyHarness({ profileData: { id: "user-edge" } });

  beforeEach(() => { setupBeforeEach(harness, true); });
  afterAll(() => { vi.restoreAllMocks(); });

  it("different event IDs are independent: each processes exactly once", async () => {
    const evtA = makeStripeEvent(
      "customer.subscription.created",
      makeSubscriptionData({ id: "sub_a" }),
      "evt_independent_A",
    );
    const evtB = makeStripeEvent(
      "customer.subscription.created",
      makeSubscriptionData({ id: "sub_b" }),
      "evt_independent_B",
    );

    mockConstructEvent.mockReturnValueOnce(evtA).mockReturnValueOnce(evtB);

    const resA = await POST(makeWebhookRequest(JSON.stringify(evtA)));
    const resB = await POST(makeWebhookRequest(JSON.stringify(evtB)));

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    const bodyA = (await resA.json()) as Record<string, unknown>;
    const bodyB = (await resB.json()) as Record<string, unknown>;
    expect(bodyA.duplicate).toBeUndefined();
    expect(bodyB.duplicate).toBeUndefined();
    // Both subscriptions upserted once each
    harness.assertConverged("subscriptions", "upsert", 2);
  });

  it("5 replays of the same event: only the first processes; 4 are duplicates", async () => {
    const evt = makeStripeEvent(
      "invoice.paid",
      makeInvoiceData(),
      "evt_five_replays",
    );
    mockConstructEvent.mockReturnValue(evt);
    const results = await harness.replay(
      POST as (req: Request) => Promise<Response>,
      () => makeWebhookRequest(JSON.stringify(evt)),
      5,
    );
    harness.assertAllSucceeded(results);
    harness.assertDuplicatesShortCircuited(results, 4);
    expect(mockHandleInvoicePaid).toHaveBeenCalledTimes(1);
  });
});
