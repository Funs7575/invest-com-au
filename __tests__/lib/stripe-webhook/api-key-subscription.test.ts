/**
 * Tests for lib/stripe-webhook/handlers/api-key-subscription.ts
 *
 * Covers:
 *  - subscription.created  → upgrades key tier + rate limits
 *  - subscription.updated  → re-applies tier on active/trialing
 *  - subscription.deleted  → downgrades key to free
 *  - non-API-key subscriptions are passed through (handled: false)
 *  - email confirmation is sent (fire-and-forget)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";
import type { WebhookContext } from "@/lib/stripe-webhook/types";

// ── Module mocks ──────────────────────────────────────────────────────────────

// Mock the api-tiers module so price-ID → tier resolution works without
// requiring real Stripe price IDs in env vars (which aren't set in CI).
const { mockTierFromPriceId } = vi.hoisted(() => ({
  mockTierFromPriceId: vi.fn((priceId: string) => {
    if (priceId === "price_basic_test") return "basic";
    if (priceId === "price_pro_test") return "pro";
    return null;
  }),
}));

vi.mock("@/lib/api-tiers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-tiers")>();
  return {
    ...actual,
    tierFromPriceId: (priceId: string) => mockTierFromPriceId(priceId),
  };
});

const mockSendTransactionalEmail = vi.fn().mockResolvedValue(undefined);
const mockEmailWrapper = vi.fn().mockReturnValue("<html/>");
vi.mock("@/lib/stripe-webhook/lib/email", () => ({
  sendTransactionalEmail: (...args: unknown[]) => mockSendTransactionalEmail(...args),
  emailWrapper: (...args: unknown[]) => mockEmailWrapper(...args),
}));

vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: string) => s }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

import {
  handleApiKeySubscriptionCreated,
  handleApiKeySubscriptionUpdated,
  handleApiKeySubscriptionDeleted,
} from "@/lib/stripe-webhook/handlers/api-key-subscription";
import { API_TIER_CONFIGS } from "@/lib/api-tiers";

// ── Test helpers ──────────────────────────────────────────────────────────────

// Capture DB calls
type UpdateCall = { table: string; payload: Record<string, unknown>; filters: Record<string, unknown> };
type UpsertCall = { table: string; payload: Record<string, unknown> };

let updateCalls: UpdateCall[] = [];
let upsertCalls: UpsertCall[] = [];
let selectResult: Record<string, unknown> | null = null;
let updateError: { message: string } | null = null;

function makeCtxAdmin() {
  return {
    from: (table: string) => ({
      update: (payload: Record<string, unknown>) => {
        const filters: Record<string, unknown> = {};
        const chain = {
          eq: (col: string, val: unknown) => {
            filters[col] = val;
            return chain;
          },
          not: (_col: string, _op: string, _val: unknown) => chain,
          is: (_col: string, _val: unknown) => chain,
          // final awaitable
          then: (resolve: (v: { error: { message: string } | null }) => void) => {
            updateCalls.push({ table, payload, filters });
            resolve({ error: updateError });
          },
        };
        return chain;
      },
      upsert: (payload: Record<string, unknown>) => {
        upsertCalls.push({ table, payload });
        return {
          eq: () => ({ error: null }),
          then: (resolve: (v: { error: null }) => void) => resolve({ error: null }),
        };
      },
      select: (_cols: string) => ({
        eq: (_col: string, _val: unknown) => ({
          maybeSingle: async () => ({ data: selectResult, error: null }),
          single: async () => ({ data: selectResult, error: null }),
        }),
      }),
    }),
  };
}

function makeCtx(): WebhookContext {
  return {
    admin: makeCtxAdmin() as unknown as WebhookContext["admin"],
    stripe: {} as unknown as WebhookContext["stripe"],
    log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  };
}

function makeApiKeySub(
  overrides: Partial<Stripe.Subscription> = {},
): Stripe.Subscription {
  return {
    id: "sub_api_test",
    customer: "cus_test",
    status: "active",
    metadata: {
      type: "api_key_subscription",
      api_key_id: "k-api-001",
      tier: "basic",
    },
    items: {
      data: [{ price: { id: "price_basic_test", recurring: { interval: "month" } } }],
    },
    current_period_start: Math.floor(Date.now() / 1000),
    ...overrides,
  } as unknown as Stripe.Subscription;
}

function makeConsumerSub(): Stripe.Subscription {
  return {
    id: "sub_consumer",
    customer: "cus_consumer",
    status: "active",
    metadata: { supabase_user_id: "user123" }, // no type: "api_key_subscription"
    items: { data: [{ price: { id: "price_monthly", recurring: { interval: "month" } } }] },
  } as unknown as Stripe.Subscription;
}

function makeEvent(type: string, sub: Stripe.Subscription): Stripe.Event {
  return {
    id: `evt_${type}_${Date.now()}`,
    type,
    data: { object: sub },
  } as unknown as Stripe.Event;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("handleApiKeySubscriptionCreated", () => {
  beforeEach(() => {
    updateCalls = [];
    upsertCalls = [];
    selectResult = {
      owner_email: "dev@example.com",
      owner_name: "Dev User",
      name: "My API Key",
      key_prefix: "ica_1234",
    };
    updateError = null;
    vi.clearAllMocks();
  });

  it("returns { handled: false } for a non-API-key subscription", async () => {
    const result = await handleApiKeySubscriptionCreated(
      makeEvent("customer.subscription.created", makeConsumerSub()),
      makeCtx(),
    );
    expect(result.handled).toBe(false);
    expect(updateCalls).toHaveLength(0);
  });

  it("upgrades api_keys row to basic tier when price matches STRIPE_API_BASIC_PRICE_ID", async () => {
    const sub = makeApiKeySub({ items: { data: [{ price: { id: "price_basic_test" } }] } as unknown as Stripe.Subscription["items"] });
    const result = await handleApiKeySubscriptionCreated(
      makeEvent("customer.subscription.created", sub),
      makeCtx(),
    );
    expect(result.handled).toBe(true);

    // Find the update call on api_keys
    const keyUpdate = updateCalls.find((c) => c.table === "api_keys");
    expect(keyUpdate).toBeDefined();
    expect(keyUpdate!.payload.tier).toBe("basic");
    expect(keyUpdate!.payload.rate_limit_per_minute).toBe(
      API_TIER_CONFIGS.basic.rateLimitPerMinute,
    );
    expect(keyUpdate!.payload.rate_limit_per_day).toBe(
      API_TIER_CONFIGS.basic.rateLimitPerDay,
    );
    expect(keyUpdate!.payload.allowed_endpoints).toEqual(
      API_TIER_CONFIGS.basic.allowedEndpoints,
    );
    expect(keyUpdate!.payload.stripe_subscription_id).toBe("sub_api_test");
    expect(keyUpdate!.filters.id).toBe("k-api-001");
  });

  it("upgrades to pro tier when price matches STRIPE_API_PRO_PRICE_ID", async () => {
    const sub = makeApiKeySub({ items: { data: [{ price: { id: "price_pro_test" } }] } as unknown as Stripe.Subscription["items"] });
    const result = await handleApiKeySubscriptionCreated(
      makeEvent("customer.subscription.created", sub),
      makeCtx(),
    );
    expect(result.handled).toBe(true);
    const keyUpdate = updateCalls.find((c) => c.table === "api_keys");
    expect(keyUpdate!.payload.tier).toBe("pro");
    expect(keyUpdate!.payload.rate_limit_per_minute).toBe(
      API_TIER_CONFIGS.pro.rateLimitPerMinute,
    );
  });

  it("upserts a row in api_key_subscriptions", async () => {
    await handleApiKeySubscriptionCreated(
      makeEvent("customer.subscription.created", makeApiKeySub()),
      makeCtx(),
    );
    const joinUpsert = upsertCalls.find((c) => c.table === "api_key_subscriptions");
    expect(joinUpsert).toBeDefined();
    expect(joinUpsert!.payload.api_key_id).toBe("k-api-001");
    expect(joinUpsert!.payload.stripe_subscription_id).toBe("sub_api_test");
    expect(joinUpsert!.payload.status).toBe("active");
  });

  it("throws when the api_keys update fails", async () => {
    updateError = { message: "constraint violation" };
    await expect(
      handleApiKeySubscriptionCreated(
        makeEvent("customer.subscription.created", makeApiKeySub()),
        makeCtx(),
      ),
    ).rejects.toThrow("Failed to update api_keys");
  });

  it("fires a confirmation email (fire-and-forget)", async () => {
    await handleApiKeySubscriptionCreated(
      makeEvent("customer.subscription.created", makeApiKeySub()),
      makeCtx(),
    );
    expect(mockSendTransactionalEmail).toHaveBeenCalledWith(
      "dev@example.com",
      expect.stringContaining("upgraded to Basic"),
      expect.any(String),
    );
  });
});

describe("handleApiKeySubscriptionUpdated", () => {
  beforeEach(() => {
    updateCalls = [];
    upsertCalls = [];
    selectResult = null;
    updateError = null;
    vi.clearAllMocks();
  });

  it("returns { handled: false } for a non-API-key subscription", async () => {
    const result = await handleApiKeySubscriptionUpdated(
      makeEvent("customer.subscription.updated", makeConsumerSub()),
      makeCtx(),
    );
    expect(result.handled).toBe(false);
  });

  it("re-applies tier when subscription is active", async () => {
    const sub = makeApiKeySub({ status: "active" });
    const result = await handleApiKeySubscriptionUpdated(
      makeEvent("customer.subscription.updated", sub),
      makeCtx(),
    );
    expect(result.handled).toBe(true);
    const keyUpdate = updateCalls.find((c) => c.table === "api_keys");
    expect(keyUpdate!.payload.tier).toBe("basic");
  });

  it("re-applies tier when subscription is trialing", async () => {
    const sub = makeApiKeySub({ status: "trialing" });
    const result = await handleApiKeySubscriptionUpdated(
      makeEvent("customer.subscription.updated", sub),
      makeCtx(),
    );
    expect(result.handled).toBe(true);
    const keyUpdate = updateCalls.find((c) => c.table === "api_keys");
    expect(keyUpdate!.payload.tier).toBe("basic");
  });

  it("downgrades to free when subscription is canceled", async () => {
    const sub = makeApiKeySub({ status: "canceled" });
    const result = await handleApiKeySubscriptionUpdated(
      makeEvent("customer.subscription.updated", sub),
      makeCtx(),
    );
    expect(result.handled).toBe(true);
    const keyUpdate = updateCalls.find((c) => c.table === "api_keys");
    expect(keyUpdate!.payload.tier).toBe("free");
    expect(keyUpdate!.payload.rate_limit_per_minute).toBe(
      API_TIER_CONFIGS.free.rateLimitPerMinute,
    );
    expect(keyUpdate!.payload.rate_limit_per_day).toBe(
      API_TIER_CONFIGS.free.rateLimitPerDay,
    );
    expect(keyUpdate!.payload.stripe_subscription_id).toBeNull();
  });

  it("downgrades to free when subscription is unpaid", async () => {
    const sub = makeApiKeySub({ status: "unpaid" });
    const result = await handleApiKeySubscriptionUpdated(
      makeEvent("customer.subscription.updated", sub),
      makeCtx(),
    );
    expect(result.handled).toBe(true);
    const keyUpdate = updateCalls.find((c) => c.table === "api_keys");
    expect(keyUpdate!.payload.tier).toBe("free");
  });
});

describe("handleApiKeySubscriptionDeleted", () => {
  beforeEach(() => {
    updateCalls = [];
    upsertCalls = [];
    updateError = null;
    vi.clearAllMocks();
  });

  it("returns { handled: false } for a non-API-key subscription", async () => {
    const result = await handleApiKeySubscriptionDeleted(
      makeEvent("customer.subscription.deleted", makeConsumerSub()),
      makeCtx(),
    );
    expect(result.handled).toBe(false);
  });

  it("downgrades key to free tier on deletion", async () => {
    const result = await handleApiKeySubscriptionDeleted(
      makeEvent("customer.subscription.deleted", makeApiKeySub()),
      makeCtx(),
    );
    expect(result.handled).toBe(true);
    const keyUpdate = updateCalls.find((c) => c.table === "api_keys");
    expect(keyUpdate!.payload.tier).toBe("free");
    expect(keyUpdate!.payload.stripe_subscription_id).toBeNull();
    expect(keyUpdate!.payload.billing_period_start).toBeNull();
    expect(keyUpdate!.payload.rate_limit_per_minute).toBe(
      API_TIER_CONFIGS.free.rateLimitPerMinute,
    );
    expect(keyUpdate!.payload.allowed_endpoints).toEqual(
      API_TIER_CONFIGS.free.allowedEndpoints,
    );
  });

  it("marks the api_key_subscriptions row as canceled", async () => {
    await handleApiKeySubscriptionDeleted(
      makeEvent("customer.subscription.deleted", makeApiKeySub()),
      makeCtx(),
    );
    // The update is chained on api_key_subscriptions — check that a cancel
    // update call occurred.
    const cancelUpdate = updateCalls.find(
      (c) => c.table === "api_key_subscriptions",
    );
    expect(cancelUpdate!.payload.status).toBe("canceled");
  });

  it("throws when the api_keys downgrade update fails", async () => {
    updateError = { message: "write timeout" };
    await expect(
      handleApiKeySubscriptionDeleted(
        makeEvent("customer.subscription.deleted", makeApiKeySub()),
        makeCtx(),
      ),
    ).rejects.toThrow("Failed to downgrade api_keys");
  });
});
