import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WebhookContext } from "@/lib/stripe-webhook/types";
import type Stripe from "stripe";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

// Mock the firm-billing sync helper so we assert delegation without touching
// the DB. (firm-billing imports the admin client + feature flags otherwise.)
const { mockSync } = vi.hoisted(() => ({
  mockSync: vi.fn<(input: unknown) => Promise<void>>().mockResolvedValue(undefined),
}));
vi.mock("@/lib/firm-billing", () => ({
  syncFirmSeatSubscription: (input: unknown) => mockSync(input),
}));

import {
  handleFirmSeatSubscriptionCreated,
  handleFirmSeatSubscriptionUpdated,
  handleFirmSeatSubscriptionDeleted,
} from "@/lib/stripe-webhook/handlers/firm-seat-subscription";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeCtx(): WebhookContext {
  return {
    admin: { from: vi.fn() } as unknown as WebhookContext["admin"],
    stripe: {} as unknown as WebhookContext["stripe"],
    log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  };
}

function makeEvent(opts: {
  type: string;
  metadata?: Record<string, string>;
  status?: Stripe.Subscription.Status;
  quantity?: number;
  subscriptionId?: string;
}): Stripe.Event {
  const {
    type,
    metadata = {},
    status = "active",
    quantity = 1,
    subscriptionId = "sub_firm_1",
  } = opts;
  return {
    id: "evt_1",
    type,
    data: {
      object: {
        id: subscriptionId,
        object: "subscription",
        customer: "cus_1",
        status,
        metadata,
        items: { data: [{ quantity, price: { id: "price_seat" } }] },
      } as unknown as Stripe.Subscription,
    },
  } as unknown as Stripe.Event;
}

const FIRM_META = { type: "firm_seat_subscription", firm_id: "42" };

beforeEach(() => {
  vi.clearAllMocks();
  mockSync.mockResolvedValue(undefined);
});

// ── Non-firm subscriptions pass through (additive guarantee) ─────────────────

describe("firm-seat handlers — non-firm subscriptions", () => {
  it("created returns { handled: false } for a non-firm subscription", async () => {
    const res = await handleFirmSeatSubscriptionCreated(
      makeEvent({ type: "customer.subscription.created", metadata: {} }),
      makeCtx(),
    );
    expect(res).toEqual({ handled: false });
    expect(mockSync).not.toHaveBeenCalled();
  });

  it("updated returns { handled: false } for an API-key subscription", async () => {
    const res = await handleFirmSeatSubscriptionUpdated(
      makeEvent({
        type: "customer.subscription.updated",
        metadata: { type: "api_key_subscription", api_key_id: "k1" },
      }),
      makeCtx(),
    );
    expect(res).toEqual({ handled: false });
    expect(mockSync).not.toHaveBeenCalled();
  });

  it("deleted returns { handled: false } for a non-firm subscription", async () => {
    const res = await handleFirmSeatSubscriptionDeleted(
      makeEvent({ type: "customer.subscription.deleted", metadata: {} }),
      makeCtx(),
    );
    expect(res).toEqual({ handled: false });
    expect(mockSync).not.toHaveBeenCalled();
  });
});

// ── Firm subscriptions are handled ───────────────────────────────────────────

describe("firm-seat handlers — created", () => {
  it("syncs seats from quantity when active", async () => {
    const res = await handleFirmSeatSubscriptionCreated(
      makeEvent({ type: "customer.subscription.created", metadata: FIRM_META, status: "active", quantity: 6 }),
      makeCtx(),
    );
    expect(res).toEqual({ handled: true });
    expect(mockSync).toHaveBeenCalledWith(
      expect.objectContaining({
        firmId: 42,
        stripeSubscriptionId: "sub_firm_1",
        billedSeats: 6,
        maxSeats: 6,
      }),
    );
  });

  it("handles a missing firm_id without throwing (handled:true, no sync)", async () => {
    const res = await handleFirmSeatSubscriptionCreated(
      makeEvent({ type: "customer.subscription.created", metadata: { type: "firm_seat_subscription", firm_id: "" } }),
      makeCtx(),
    );
    // metadata.firm_id is "" → isFirmSeatSubscription false → handled:false.
    expect(res).toEqual({ handled: false });
  });

  it("does not sync when created with a non-active status", async () => {
    const res = await handleFirmSeatSubscriptionCreated(
      makeEvent({ type: "customer.subscription.created", metadata: FIRM_META, status: "incomplete" }),
      makeCtx(),
    );
    expect(res).toEqual({ handled: true });
    expect(mockSync).not.toHaveBeenCalled();
  });
});

describe("firm-seat handlers — updated", () => {
  it("syncs seats when status is active", async () => {
    await handleFirmSeatSubscriptionUpdated(
      makeEvent({ type: "customer.subscription.updated", metadata: FIRM_META, status: "active", quantity: 10 }),
      makeCtx(),
    );
    expect(mockSync).toHaveBeenCalledWith(
      expect.objectContaining({ firmId: 42, billedSeats: 10, maxSeats: 10 }),
    );
  });

  it("clears seats (billed_seats null, max_seats null) when canceled", async () => {
    await handleFirmSeatSubscriptionUpdated(
      makeEvent({ type: "customer.subscription.updated", metadata: FIRM_META, status: "canceled" }),
      makeCtx(),
    );
    expect(mockSync).toHaveBeenCalledWith(
      expect.objectContaining({ firmId: 42, billedSeats: null, maxSeats: null }),
    );
  });

  it("clears seats when unpaid", async () => {
    await handleFirmSeatSubscriptionUpdated(
      makeEvent({ type: "customer.subscription.updated", metadata: FIRM_META, status: "unpaid" }),
      makeCtx(),
    );
    expect(mockSync).toHaveBeenCalledWith(
      expect.objectContaining({ billedSeats: null }),
    );
  });

  it("takes no action for an intermediate status (e.g. past_due)", async () => {
    const res = await handleFirmSeatSubscriptionUpdated(
      makeEvent({ type: "customer.subscription.updated", metadata: FIRM_META, status: "past_due" }),
      makeCtx(),
    );
    expect(res).toEqual({ handled: true });
    expect(mockSync).not.toHaveBeenCalled();
  });
});

describe("firm-seat handlers — deleted", () => {
  it("clears seats", async () => {
    await handleFirmSeatSubscriptionDeleted(
      makeEvent({ type: "customer.subscription.deleted", metadata: FIRM_META }),
      makeCtx(),
    );
    expect(mockSync).toHaveBeenCalledWith(
      expect.objectContaining({ firmId: 42, billedSeats: null, maxSeats: null }),
    );
  });
});
