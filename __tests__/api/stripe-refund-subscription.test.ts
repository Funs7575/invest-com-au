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

const mockInvoicesList = vi.fn();
const mockChargesList = vi.fn();
const mockRefundsCreate = vi.fn();
const mockSubscriptionsCancel = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    invoices: { list: mockInvoicesList },
    charges: { list: mockChargesList },
    refunds: { create: mockRefundsCreate },
    subscriptions: { cancel: mockSubscriptionsCancel },
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

// Import handler AFTER mocks
import { POST } from "@/app/api/stripe/refund-subscription/route";

// ─── Helpers ─────────────────────────────────────────────────────────

function createChainableBuilder(resolveData: unknown = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  const chainMethods = [
    "select", "insert", "upsert", "update", "delete",
    "eq", "neq", "order", "limit", "gte", "lte", "in",
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }

  builder.single = vi.fn(() => Promise.resolve({ data: resolveData, error: null }));
  builder.maybeSingle = vi.fn(() => Promise.resolve({ data: resolveData, error: null }));

  return builder;
}

const TEST_USER = { id: "user-uuid-123", email: "test@example.com" };

// 3 days ago — within the 7-day window
const WITHIN_WINDOW_DATE = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
// 8 days ago — outside the 7-day window
const OUTSIDE_WINDOW_DATE = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

const TEST_SUB = {
  stripe_subscription_id: "sub_test_123",
  stripe_customer_id: "cus_test_456",
  status: "active",
  created_at: WITHIN_WINDOW_DATE,
};

const TEST_INVOICE = { payment_intent: "pi_test_789" };

function setupHappyPath() {
  mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "subscriptions") return createChainableBuilder(TEST_SUB);
    return createChainableBuilder(null);
  });
  mockInvoicesList.mockResolvedValue({ data: [TEST_INVOICE] });
  mockChargesList.mockResolvedValue({ data: [{ refunded: false }] });
  mockRefundsCreate.mockResolvedValue({ id: "re_test_abc" });
  mockSubscriptionsCancel.mockResolvedValue({ id: "sub_test_123" });
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("POST /api/stripe/refund-subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Not authenticated");
  });

  it("returns 404 when no active subscription found", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation(() => createChainableBuilder(null));
    const res = await POST();
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("No active subscription found");
  });

  it("returns 400 when beyond the 7-day refund window", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return createChainableBuilder({ ...TEST_SUB, created_at: OUTSIDE_WINDOW_DATE });
      }
      return createChainableBuilder(null);
    });
    const res = await POST();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Refund window has expired");
  });

  it("returns 400 when no invoice found for the subscription", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return createChainableBuilder(TEST_SUB);
      return createChainableBuilder(null);
    });
    mockInvoicesList.mockResolvedValue({ data: [] });
    const res = await POST();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("No payment found to refund");
  });

  it("returns 400 when invoice has no payment_intent", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return createChainableBuilder(TEST_SUB);
      return createChainableBuilder(null);
    });
    mockInvoicesList.mockResolvedValue({ data: [{ payment_intent: null }] });
    const res = await POST();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("No payment found to refund");
  });

  it("returns 400 when charge has already been refunded", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return createChainableBuilder(TEST_SUB);
      return createChainableBuilder(null);
    });
    mockInvoicesList.mockResolvedValue({ data: [TEST_INVOICE] });
    mockChargesList.mockResolvedValue({ data: [{ refunded: true }] });
    const res = await POST();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("This subscription has already been refunded");
  });

  it("returns 200 and calls Stripe with correct args on success", async () => {
    setupHappyPath();
    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    expect(mockRefundsCreate).toHaveBeenCalledWith(
      { payment_intent: "pi_test_789", reason: "requested_by_customer" },
      { idempotencyKey: "refund_sub_test_123_pi_test_789" },
    );
    expect(mockSubscriptionsCancel).toHaveBeenCalledWith("sub_test_123", {
      prorate: false,
    });
  });

  it("resolves payment_intent when returned as an object rather than string", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return createChainableBuilder(TEST_SUB);
      return createChainableBuilder(null);
    });
    mockInvoicesList.mockResolvedValue({
      data: [{ payment_intent: { id: "pi_object_456" } }],
    });
    mockChargesList.mockResolvedValue({ data: [{ refunded: false }] });
    mockRefundsCreate.mockResolvedValue({ id: "re_obj_abc" });
    mockSubscriptionsCancel.mockResolvedValue({ id: "sub_test_123" });

    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockRefundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: "pi_object_456" }),
      expect.any(Object),
    );
  });

  it("writes audit log with action=self_service_refund on success", async () => {
    let auditInsertArgs: unknown = null;
    const auditBuilder = createChainableBuilder(null);
    auditBuilder.insert = vi.fn((data: unknown) => {
      auditInsertArgs = data;
      return auditBuilder;
    });

    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return createChainableBuilder(TEST_SUB);
      if (table === "admin_audit_log") return auditBuilder;
      return createChainableBuilder(null);
    });
    mockInvoicesList.mockResolvedValue({ data: [TEST_INVOICE] });
    mockChargesList.mockResolvedValue({ data: [{ refunded: false }] });
    mockRefundsCreate.mockResolvedValue({ id: "re_test_abc" });
    mockSubscriptionsCancel.mockResolvedValue({ id: "sub_test_123" });

    await POST();
    expect(auditInsertArgs).toMatchObject({
      action: "self_service_refund",
      entity_type: "subscription",
      entity_id: "sub_test_123",
    });
  });

  it("returns 200 even when Resend email call throws", async () => {
    setupHappyPath();
    vi.stubEnv("RESEND_API_KEY", "test-resend-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const res = await POST();
    expect(res.status).toBe(200);

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns 500 on unexpected Stripe error", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") return createChainableBuilder(TEST_SUB);
      return createChainableBuilder(null);
    });
    mockInvoicesList.mockResolvedValue({ data: [TEST_INVOICE] });
    mockChargesList.mockResolvedValue({ data: [{ refunded: false }] });
    mockRefundsCreate.mockRejectedValue(new Error("Stripe internal error"));

    const res = await POST();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("Failed to process refund");
  });

  it("processes refund for trialing subscriptions", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "subscriptions") {
        return createChainableBuilder({ ...TEST_SUB, status: "trialing" });
      }
      return createChainableBuilder(null);
    });
    mockInvoicesList.mockResolvedValue({ data: [TEST_INVOICE] });
    mockChargesList.mockResolvedValue({ data: [{ refunded: false }] });
    mockRefundsCreate.mockResolvedValue({ id: "re_trial_abc" });
    mockSubscriptionsCancel.mockResolvedValue({ id: "sub_test_123" });

    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockRefundsCreate).toHaveBeenCalled();
  });
});
