import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockAuth = { getUser: vi.fn() };
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: mockAuth })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

const mockPortalSessionsCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    billingPortal: { sessions: { create: mockPortalSessionsCreate } },
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

// Import the handler AFTER mocks
import { POST } from "@/app/api/stripe/create-portal/route";

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

const TEST_USER = {
  id: "user-uuid-portal-123",
  email: "portal-user@example.com",
};

const TEST_CUSTOMER_ID = "cus_portal_test_456";

// ─── Tests ───────────────────────────────────────────────────────────

describe("POST /api/stripe/create-portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const res = await POST();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Not authenticated");
  });

  it("returns 404 when profile query returns null (no profile row)", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation(() => createChainableBuilder(null));

    const res = await POST();
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("No billing account found");
  });

  it("returns 404 when profile has no stripe_customer_id", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation(() =>
      createChainableBuilder({ stripe_customer_id: null }),
    );

    const res = await POST();
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("No billing account found");
  });

  it("returns 200 with portal URL on success", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation(() =>
      createChainableBuilder({ stripe_customer_id: TEST_CUSTOMER_ID }),
    );
    mockPortalSessionsCreate.mockResolvedValue({
      url: "https://billing.stripe.com/session/test_session_abc",
    });

    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://billing.stripe.com/session/test_session_abc");
  });

  it("calls billingPortal.sessions.create with correct customer ID", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation(() =>
      createChainableBuilder({ stripe_customer_id: TEST_CUSTOMER_ID }),
    );
    mockPortalSessionsCreate.mockResolvedValue({ url: "https://billing.stripe.com/p/test" });

    await POST();

    expect(mockPortalSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: TEST_CUSTOMER_ID }),
      expect.anything(),
    );
  });

  it("calls billingPortal.sessions.create with return_url from NEXT_PUBLIC_SITE_URL", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.invest.com.au";
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation(() =>
      createChainableBuilder({ stripe_customer_id: TEST_CUSTOMER_ID }),
    );
    mockPortalSessionsCreate.mockResolvedValue({ url: "https://billing.stripe.com/p/test" });

    await POST();

    expect(mockPortalSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        return_url: "https://staging.invest.com.au/account",
      }),
      expect.anything(),
    );
  });

  it("falls back to https://invest.com.au/account when NEXT_PUBLIC_SITE_URL is unset", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation(() =>
      createChainableBuilder({ stripe_customer_id: TEST_CUSTOMER_ID }),
    );
    mockPortalSessionsCreate.mockResolvedValue({ url: "https://billing.stripe.com/p/test" });

    await POST();

    expect(mockPortalSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        return_url: "https://invest.com.au/account",
      }),
      expect.anything(),
    );
  });

  it("idempotency key is formatted as portal_<userId>_<timestamp>", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation(() =>
      createChainableBuilder({ stripe_customer_id: TEST_CUSTOMER_ID }),
    );
    mockPortalSessionsCreate.mockResolvedValue({ url: "https://billing.stripe.com/p/test" });

    await POST();

    const [, options] = mockPortalSessionsCreate.mock.calls[0] as [unknown, { idempotencyKey: string }];
    expect(options.idempotencyKey).toMatch(
      new RegExp(`^portal_${TEST_USER.id}_\\d+$`),
    );
  });

  it("queries profiles table scoped to authenticated user ID", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    const builder = createChainableBuilder({ stripe_customer_id: TEST_CUSTOMER_ID });
    mockAdminFrom.mockImplementation(() => builder);
    mockPortalSessionsCreate.mockResolvedValue({ url: "https://billing.stripe.com/p/test" });

    await POST();

    expect(mockAdminFrom).toHaveBeenCalledWith("profiles");
    expect(builder.eq).toHaveBeenCalledWith("id", TEST_USER.id);
  });

  it("selects only stripe_customer_id from profiles (minimal column projection)", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    const builder = createChainableBuilder({ stripe_customer_id: TEST_CUSTOMER_ID });
    mockAdminFrom.mockImplementation(() => builder);
    mockPortalSessionsCreate.mockResolvedValue({ url: "https://billing.stripe.com/p/test" });

    await POST();

    expect(builder.select).toHaveBeenCalledWith("stripe_customer_id");
  });

  it("returns 500 when Stripe billingPortal.sessions.create throws", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation(() =>
      createChainableBuilder({ stripe_customer_id: TEST_CUSTOMER_ID }),
    );
    mockPortalSessionsCreate.mockRejectedValue(new Error("Stripe network error"));

    const res = await POST();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to create portal session");
  });

  it("returns 500 when admin DB lookup throws unexpectedly", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation(() => {
      const builder = createChainableBuilder(null);
      builder.single = vi.fn().mockRejectedValue(new Error("DB connection failed"));
      return builder;
    });

    const res = await POST();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to create portal session");
  });
});
