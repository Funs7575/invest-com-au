import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockAuth = { getUser: vi.fn() };
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: mockAuth })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

const mockSubscriptionsUpdate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    subscriptions: { update: mockSubscriptionsUpdate },
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

// Import the handler AFTER mocks
import { POST } from "@/app/api/stripe/cancel-subscription/route";

// ─── Helpers ─────────────────────────────────────────────────────────

function createChainableBuilder(resolveData: unknown = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  const chainMethods = [
    "select",
    "insert",
    "upsert",
    "update",
    "delete",
    "eq",
    "neq",
    "order",
    "limit",
    "gte",
    "lte",
    "in",
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }

  builder.single = vi.fn(() =>
    Promise.resolve({ data: resolveData, error: null }),
  );

  builder.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: resolveData, error: null }),
  );

  return builder;
}

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/stripe/cancel-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

const TEST_USER = {
  id: "user-uuid-123",
  email: "test@example.com",
};

// ─── Tests ───────────────────────────────────────────────────────────

describe("POST /api/stripe/cancel-subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const req = makeRequest();
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Not authenticated");
  });

  it("returns 404 when no active subscription found", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });

    mockAdminFrom.mockImplementation(() => {
      return createChainableBuilder(null); // no subscription found
    });

    const req = makeRequest();
    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("No active subscription found");
  });

  it("returns 400 when subscription already set to cancel", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });

    mockAdminFrom.mockImplementation(() => {
      return createChainableBuilder({
        stripe_subscription_id: "sub_test_123",
        status: "active",
        cancel_at_period_end: true,
      });
    });

    const req = makeRequest();
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Subscription is already set to cancel");
  });

  it("returns 200 and calls Stripe subscriptions.update with cancel_at_period_end: true", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });

    mockAdminFrom.mockImplementation(() => {
      return createChainableBuilder({
        stripe_subscription_id: "sub_active_456",
        status: "active",
        cancel_at_period_end: false,
      });
    });

    mockSubscriptionsUpdate.mockResolvedValue({ id: "sub_active_456" });

    const req = makeRequest();
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(
      "sub_active_456",
      { cancel_at_period_end: true },
      expect.objectContaining({
        idempotencyKey: expect.stringContaining("cancel_sub_active_456_"),
      }),
    );
  });

  it("passes correct subscription ID to Stripe", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });

    const subscriptionId = "sub_specific_789";

    mockAdminFrom.mockImplementation(() => {
      return createChainableBuilder({
        stripe_subscription_id: subscriptionId,
        status: "active",
        cancel_at_period_end: false,
      });
    });

    mockSubscriptionsUpdate.mockResolvedValue({ id: subscriptionId });

    const req = makeRequest();
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify the first argument (subscription ID) is correct
    expect(mockSubscriptionsUpdate.mock.calls[0][0]).toBe(subscriptionId);
  });
});
