import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: { getUser: mockGetUser } })),
}));

// Admin client: table-keyed responses so subscription lookup and audit-log
// insert can behave independently.
type AdminResponse = { data: unknown; error: null | { message: string } };
const adminTableResponses: Record<string, AdminResponse> = {};

const mockAdminFrom = vi.fn((table: string) => {
  const response = adminTableResponses[table] ?? { data: null, error: null };
  const builder: Record<string, unknown> = {};
  const chainMethods = ["select", "insert", "eq", "neq", "in", "order", "limit", "update", "upsert"];
  for (const m of chainMethods) {
    builder[m] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(response));
  // insert returns a promise-like for the audit-log path
  const insertOrig = builder.insert as ReturnType<typeof vi.fn>;
  insertOrig.mockReturnValue(Promise.resolve({ data: null, error: null }));
  return builder;
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

// Stripe mock — individual function mocks allow per-test control.
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

// Resend fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import handler AFTER mocks
import { POST } from "@/app/api/stripe/refund-subscription/route";

// ─── Helpers ─────────────────────────────────────────────────────────

const TEST_USER = { id: "user-uuid-001", email: "tester@example.com" };

const RECENT_SUB = {
  stripe_subscription_id: "sub_abc123",
  stripe_customer_id: "cus_abc123",
  status: "active",
  created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
};

const INVOICE_WITH_PI_STRING = {
  payment_intent: "pi_string_001",
};

const INVOICE_WITH_PI_OBJECT = {
  payment_intent: { id: "pi_object_001" },
};

function setupAuthUser(user = TEST_USER) {
  mockGetUser.mockResolvedValue({ data: { user } });
}

function setupAuthNone() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

function setupSubscription(sub: unknown) {
  adminTableResponses["subscriptions"] = { data: sub, error: null };
}

function setupNotRefunded() {
  mockChargesList.mockResolvedValue({ data: [{ refunded: false }] });
}

function setupStripeSuccess() {
  mockInvoicesList.mockResolvedValue({ data: [INVOICE_WITH_PI_STRING] });
  setupNotRefunded();
  mockRefundsCreate.mockResolvedValue({ id: "re_001" });
  mockSubscriptionsCancel.mockResolvedValue({ id: "sub_abc123", status: "canceled" });
  mockFetch.mockResolvedValue({ ok: true });
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("POST /api/stripe/refund-subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset table responses
    for (const k of Object.keys(adminTableResponses)) {
      delete adminTableResponses[k];
    }
    process.env.RESEND_API_KEY = "test-resend-key";
  });

  afterAll(() => {
    vi.restoreAllMocks();
    delete process.env.RESEND_API_KEY;
  });

  // ─── Auth ─────────────────────────────────────────────────────────

  it("returns 401 when not authenticated", async () => {
    setupAuthNone();
    const res = await POST();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Not authenticated");
  });

  // ─── Subscription lookup ──────────────────────────────────────────

  it("returns 404 when no active subscription found", async () => {
    setupAuthUser();
    setupSubscription(null);
    const res = await POST();
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("No active subscription found");
  });

  // ─── Refund window ────────────────────────────────────────────────

  it("returns 400 when subscription is older than 7 days", async () => {
    setupAuthUser();
    setupSubscription({
      ...RECENT_SUB,
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
    });
    const res = await POST();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Refund window has expired/);
  });

  it("allows refund exactly at 7-day boundary (6.9 days)", async () => {
    setupAuthUser();
    setupSubscription({
      ...RECENT_SUB,
      created_at: new Date(Date.now() - 6.9 * 24 * 60 * 60 * 1000).toISOString(),
    });
    setupStripeSuccess();
    const res = await POST();
    expect(res.status).toBe(200);
  });

  // ─── Invoice checks ───────────────────────────────────────────────

  it("returns 400 when no invoice found for the subscription", async () => {
    setupAuthUser();
    setupSubscription(RECENT_SUB);
    mockInvoicesList.mockResolvedValue({ data: [] });
    const res = await POST();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("No payment found to refund");
  });

  it("returns 400 when invoice has no payment_intent", async () => {
    setupAuthUser();
    setupSubscription(RECENT_SUB);
    mockInvoicesList.mockResolvedValue({ data: [{ payment_intent: null }] });
    const res = await POST();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("No payment found to refund");
  });

  // ─── Already refunded check ───────────────────────────────────────

  it("returns 400 when subscription has already been refunded", async () => {
    setupAuthUser();
    setupSubscription(RECENT_SUB);
    mockInvoicesList.mockResolvedValue({ data: [INVOICE_WITH_PI_STRING] });
    mockChargesList.mockResolvedValue({ data: [{ refunded: true }] });
    const res = await POST();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("This subscription has already been refunded");
  });

  // ─── Success paths ────────────────────────────────────────────────

  it("returns 200 on success with payment_intent as string", async () => {
    setupAuthUser();
    setupSubscription(RECENT_SUB);
    setupStripeSuccess();
    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("calls Stripe refunds.create with correct payment intent ID (string path)", async () => {
    setupAuthUser();
    setupSubscription(RECENT_SUB);
    setupStripeSuccess();
    await POST();
    expect(mockRefundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: "pi_string_001" }),
      expect.objectContaining({ idempotencyKey: expect.stringContaining("sub_abc123") }),
    );
  });

  it("calls Stripe subscriptions.cancel after issuing refund", async () => {
    setupAuthUser();
    setupSubscription(RECENT_SUB);
    setupStripeSuccess();
    await POST();
    expect(mockSubscriptionsCancel).toHaveBeenCalledWith(
      RECENT_SUB.stripe_subscription_id,
      { prorate: false },
    );
  });

  it("returns 200 on success with payment_intent as object (extracts .id)", async () => {
    setupAuthUser();
    setupSubscription(RECENT_SUB);
    mockInvoicesList.mockResolvedValue({ data: [INVOICE_WITH_PI_OBJECT] });
    setupNotRefunded();
    mockRefundsCreate.mockResolvedValue({ id: "re_002" });
    mockSubscriptionsCancel.mockResolvedValue({ id: "sub_abc123" });
    mockFetch.mockResolvedValue({ ok: true });
    const res = await POST();
    expect(res.status).toBe(200);
    // Verify the extracted ID was used
    expect(mockRefundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: "pi_object_001" }),
      expect.any(Object),
    );
  });

  // ─── Fire-and-forget email ────────────────────────────────────────

  it("returns 200 even when the confirmation email fetch throws", async () => {
    setupAuthUser();
    setupSubscription(RECENT_SUB);
    mockInvoicesList.mockResolvedValue({ data: [INVOICE_WITH_PI_STRING] });
    setupNotRefunded();
    mockRefundsCreate.mockResolvedValue({ id: "re_003" });
    mockSubscriptionsCancel.mockResolvedValue({ id: "sub_abc123" });
    mockFetch.mockRejectedValue(new Error("Resend network error"));
    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("skips email send when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    setupAuthUser();
    setupSubscription(RECENT_SUB);
    setupStripeSuccess();
    mockFetch.mockClear();
    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ─── Error / 500 paths ────────────────────────────────────────────

  it("returns 500 when Stripe refunds.create throws", async () => {
    setupAuthUser();
    setupSubscription(RECENT_SUB);
    mockInvoicesList.mockResolvedValue({ data: [INVOICE_WITH_PI_STRING] });
    setupNotRefunded();
    mockRefundsCreate.mockRejectedValue(new Error("Stripe refund error"));
    const res = await POST();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to process refund/);
  });

  it("returns 500 when Stripe subscriptions.cancel throws", async () => {
    setupAuthUser();
    setupSubscription(RECENT_SUB);
    mockInvoicesList.mockResolvedValue({ data: [INVOICE_WITH_PI_STRING] });
    setupNotRefunded();
    mockRefundsCreate.mockResolvedValue({ id: "re_004" });
    mockSubscriptionsCancel.mockRejectedValue(new Error("Stripe cancel error"));
    const res = await POST();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to process refund/);
  });

  it("returns 500 when Stripe invoices.list throws", async () => {
    setupAuthUser();
    setupSubscription(RECENT_SUB);
    mockInvoicesList.mockRejectedValue(new Error("Stripe invoices error"));
    const res = await POST();
    expect(res.status).toBe(500);
  });

  // ─── Idempotency key shape ────────────────────────────────────────

  it("refund idempotency key includes both subscription and payment-intent ID", async () => {
    setupAuthUser();
    setupSubscription(RECENT_SUB);
    setupStripeSuccess();
    await POST();
    const [, opts] = mockRefundsCreate.mock.calls[0] as [unknown, { idempotencyKey: string }];
    expect(opts.idempotencyKey).toBe(
      `refund_${RECENT_SUB.stripe_subscription_id}_pi_string_001`,
    );
  });
});
