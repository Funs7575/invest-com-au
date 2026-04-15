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

const mockStripeCustomersCreate = vi.fn();
const mockStripeCheckoutCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    customers: { create: mockStripeCustomersCreate },
    checkout: { sessions: { create: mockStripeCheckoutCreate } },
  }),
  PLANS: {
    monthly: { priceId: "price_monthly_test", label: "$9/mo" },
    yearly: { priceId: "price_yearly_test", label: "$89/yr" },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

// Import the handler AFTER mocks
import { POST } from "@/app/api/stripe/create-checkout/route";

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
    "is",
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

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/stripe/create-checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const TEST_USER = {
  id: "user-uuid-123",
  email: "test@example.com",
};

// ─── Tests ───────────────────────────────────────────────────────────

describe("POST /api/stripe/create-checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const req = makeRequest({ plan: "monthly" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Not authenticated");
  });

  it("returns 400 when plan not configured", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });

    // Temporarily override PLANS to have null priceId — we can't change the mock,
    // so instead we test with the actual mock which has priceId set.
    // Instead, we mock the module inline to return null priceId.
    // Since vi.mock is hoisted, we use a different approach: mock getStripe inline.
    // Actually, since the PLANS mock is already set with valid priceIds, we need
    // to test this differently. We'll dynamically modify the imported PLANS.
    const stripeMod = await import("@/lib/stripe");
    const originalMonthly = (stripeMod.PLANS as Record<string, { priceId: string; label: string }>).monthly;
    (stripeMod.PLANS as Record<string, { priceId: string; label: string }>).monthly = { priceId: "", label: "$9/mo" };

    const req = makeRequest({ plan: "monthly" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Plan not configured");

    // Restore
    (stripeMod.PLANS as Record<string, { priceId: string; label: string }>).monthly = originalMonthly;
  });

  it("returns 400 when user already has active subscription", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return createChainableBuilder({ stripe_customer_id: "cus_existing" });
      }
      if (table === "subscriptions") {
        return createChainableBuilder({ id: "sub_existing" });
      }
      return createChainableBuilder();
    });

    const req = makeRequest({ plan: "monthly" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("You already have an active subscription");
  });

  it("returns 200 with checkout URL for monthly plan", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return createChainableBuilder({ stripe_customer_id: "cus_test_123" });
      }
      if (table === "subscriptions") {
        return createChainableBuilder(null); // no active sub
      }
      return createChainableBuilder();
    });

    mockStripeCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session_monthly",
    });

    const req = makeRequest({ plan: "monthly" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.stripe.com/session_monthly");

    // Verify correct price was used
    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_test_123",
        mode: "subscription",
        line_items: [{ price: "price_monthly_test", quantity: 1 }],
      }),
      expect.any(Object),
    );
  });

  it("returns 200 with checkout URL for yearly plan", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return createChainableBuilder({ stripe_customer_id: "cus_test_456" });
      }
      if (table === "subscriptions") {
        return createChainableBuilder(null);
      }
      return createChainableBuilder();
    });

    mockStripeCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session_yearly",
    });

    const req = makeRequest({ plan: "yearly" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.stripe.com/session_yearly");

    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_yearly_test", quantity: 1 }],
      }),
      expect.any(Object),
    );
  });

  it("creates Stripe customer if none exists", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return createChainableBuilder({ stripe_customer_id: null });
      }
      if (table === "subscriptions") {
        return createChainableBuilder(null);
      }
      return createChainableBuilder();
    });

    mockStripeCustomersCreate.mockResolvedValue({ id: "cus_new_789" });
    mockStripeCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session_new",
    });

    const req = makeRequest({ plan: "monthly" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Should have created a new Stripe customer
    expect(mockStripeCustomersCreate).toHaveBeenCalledWith(
      {
        email: TEST_USER.email,
        metadata: { supabase_user_id: TEST_USER.id },
      },
      { idempotencyKey: `customer_${TEST_USER.id}` },
    );

    // Should have updated the profile with the new customer ID
    expect(mockAdminFrom).toHaveBeenCalledWith("profiles");

    // Checkout should use the newly created customer
    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_new_789" }),
      expect.any(Object),
    );
  });

  it("uses existing Stripe customer if profile has stripe_customer_id", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return createChainableBuilder({ stripe_customer_id: "cus_existing_abc" });
      }
      if (table === "subscriptions") {
        return createChainableBuilder(null);
      }
      return createChainableBuilder();
    });

    mockStripeCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session_existing",
    });

    const req = makeRequest({ plan: "monthly" });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Should NOT have created a new Stripe customer
    expect(mockStripeCustomersCreate).not.toHaveBeenCalled();

    // Should use existing customer ID
    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing_abc" }),
      expect.any(Object),
    );
  });
});
