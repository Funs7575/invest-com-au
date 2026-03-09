import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import type Stripe from "stripe";

// ─── Mocks ───────────────────────────────────────────────────────────

// Mock Stripe
const mockConstructEvent = vi.fn();
const mockCustomerRetrieve = vi.fn();
const mockStripe = {
  webhooks: { constructEvent: mockConstructEvent },
  customers: { retrieve: mockCustomerRetrieve },
};

vi.mock("@/lib/stripe", () => ({
  getStripe: () => mockStripe,
  PLANS: {
    monthly: { label: "$9/month" },
    yearly: { label: "$89/year" },
  },
}));

// Track Supabase calls per table
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

function createChainableBuilder(tableName: string) {
  const calls = supabaseCalls[tableName] || [];
  supabaseCalls[tableName] = calls;

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
    builder[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    });
  }

  builder.single = vi.fn(() => {
    calls.push({ method: "single", args: [] });
    return Promise.resolve({ data: null, error: null });
  });

  builder.maybeSingle = vi.fn(() => {
    calls.push({ method: "maybeSingle", args: [] });
    return Promise.resolve({ data: null, error: null });
  });

  return builder;
}

const mockFrom = vi.fn((table: string) => createChainableBuilder(table));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}));

// Mock advisor-billing helpers
const mockHandleInvoicePaid = vi.fn();
const mockHandleInvoicePaymentFailed = vi.fn();

vi.mock("@/lib/advisor-billing", () => ({
  handleInvoicePaid: (...args: unknown[]) => mockHandleInvoicePaid(...args),
  handleInvoicePaymentFailed: (...args: unknown[]) =>
    mockHandleInvoicePaymentFailed(...args),
}));

// Mock Sentry (imported transitively via logger)
vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

// Import the handler AFTER mocks
import { POST } from "@/app/api/stripe/webhook/route";

// ─── Helpers ─────────────────────────────────────────────────────────

function makeWebhookRequest(
  body: string,
  signature = "whsec_test_signature",
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (signature) {
    headers["stripe-signature"] = signature;
  }
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers,
  });
}

function makeWebhookRequestWithoutSig(body: string): NextRequest {
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
  });
}

function fakeStripeEvent(type: string, data: Record<string, unknown>): Stripe.Event {
  return {
    id: `evt_test_${Date.now()}`,
    object: "event",
    api_version: "2023-10-16",
    created: Math.floor(Date.now() / 1000),
    type,
    data: { object: data },
    livemode: false,
    pending_webhooks: 0,
    request: null,
  } as unknown as Stripe.Event;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(supabaseCalls)) {
      delete supabaseCalls[key];
    }
    mockHandleInvoicePaid.mockResolvedValue(undefined);
    mockHandleInvoicePaymentFailed.mockResolvedValue(undefined);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  // ── Signature verification ──

  it("returns 400 when stripe-signature header is missing", async () => {
    const req = makeWebhookRequestWithoutSig('{"type":"test"}');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing stripe-signature header");
  });

  it("returns 400 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const req = makeWebhookRequest('{"type":"test"}', "bad_sig");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid signature");
  });

  // ── customer.subscription.created ──

  describe("customer.subscription.created", () => {
    it("upserts subscription and sends welcome email for active subscription", async () => {
      const event = fakeStripeEvent("customer.subscription.created", {
        id: "sub_test_123",
        customer: "cus_test_abc",
        status: "active",
        items: {
          data: [
            {
              price: {
                id: "price_monthly",
                recurring: { interval: "month" },
              },
            },
          ],
        },
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        cancel_at_period_end: false,
        canceled_at: null,
      });

      mockConstructEvent.mockReturnValue(event);
      mockCustomerRetrieve.mockResolvedValue({
        id: "cus_test_abc",
        email: "advisor@test.com",
      });

      // Make profiles.single return a user
      mockFrom.mockImplementation((table: string) => {
        const builder = createChainableBuilder(table);
        if (table === "profiles") {
          builder.single = vi.fn(() =>
            Promise.resolve({ data: { id: "user-uuid-1" }, error: null })
          );
        }
        return builder;
      });

      const req = makeWebhookRequest(JSON.stringify(event));
      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.received).toBe(true);

      // Should have looked up the profile
      expect(mockFrom).toHaveBeenCalledWith("profiles");
      // Should have upserted the subscription
      expect(mockFrom).toHaveBeenCalledWith("subscriptions");
      // Should have retrieved the Stripe customer for email
      expect(mockCustomerRetrieve).toHaveBeenCalledWith("cus_test_abc");
    });
  });

  // ── customer.subscription.updated ──

  describe("customer.subscription.updated", () => {
    it("upserts subscription on update", async () => {
      const event = fakeStripeEvent("customer.subscription.updated", {
        id: "sub_test_456",
        customer: "cus_test_def",
        status: "past_due",
        items: {
          data: [
            {
              price: {
                id: "price_yearly",
                recurring: { interval: "year" },
              },
            },
          ],
        },
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 365 * 86400,
        cancel_at_period_end: false,
        canceled_at: null,
      });

      mockConstructEvent.mockReturnValue(event);

      mockFrom.mockImplementation((table: string) => {
        const builder = createChainableBuilder(table);
        if (table === "profiles") {
          builder.single = vi.fn(() =>
            Promise.resolve({ data: { id: "user-uuid-2" }, error: null })
          );
        }
        return builder;
      });

      const req = makeWebhookRequest(JSON.stringify(event));
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockFrom).toHaveBeenCalledWith("subscriptions");
    });
  });

  // ── customer.subscription.deleted ──

  describe("customer.subscription.deleted", () => {
    it("upserts subscription on cancellation", async () => {
      const event = fakeStripeEvent("customer.subscription.deleted", {
        id: "sub_test_789",
        customer: "cus_test_ghi",
        status: "canceled",
        items: { data: [{ price: { id: "price_monthly", recurring: { interval: "month" } } }] },
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        cancel_at_period_end: true,
        canceled_at: Math.floor(Date.now() / 1000),
      });

      mockConstructEvent.mockReturnValue(event);

      mockFrom.mockImplementation((table: string) => {
        const builder = createChainableBuilder(table);
        if (table === "profiles") {
          builder.single = vi.fn(() =>
            Promise.resolve({ data: { id: "user-uuid-3" }, error: null })
          );
        }
        return builder;
      });

      const req = makeWebhookRequest(JSON.stringify(event));
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockFrom).toHaveBeenCalledWith("subscriptions");
    });
  });

  // ── invoice.paid (advisor lead billing) ──

  describe("invoice.paid", () => {
    it("calls handleInvoicePaid for advisor_lead invoices", async () => {
      const event = fakeStripeEvent("invoice.paid", {
        id: "in_test_lead_001",
        customer: "cus_advisor_1",
        payment_intent: "pi_test_lead_001",
        metadata: { type: "advisor_lead", billing_id: "42" },
        status: "paid",
      });

      mockConstructEvent.mockReturnValue(event);

      const req = makeWebhookRequest(JSON.stringify(event));
      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(mockHandleInvoicePaid).toHaveBeenCalledWith(
        "in_test_lead_001",
        "pi_test_lead_001"
      );
    });

    it("does not call handleInvoicePaid for non-advisor invoices", async () => {
      const event = fakeStripeEvent("invoice.paid", {
        id: "in_test_sub_001",
        customer: "cus_sub_1",
        payment_intent: "pi_test_sub_001",
        metadata: {},
        status: "paid",
      });

      mockConstructEvent.mockReturnValue(event);

      const req = makeWebhookRequest(JSON.stringify(event));
      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(mockHandleInvoicePaid).not.toHaveBeenCalled();
    });

    it("handles payment_intent as object reference", async () => {
      const event = fakeStripeEvent("invoice.paid", {
        id: "in_test_lead_002",
        customer: "cus_advisor_2",
        payment_intent: { id: "pi_test_lead_002" },
        metadata: { type: "advisor_lead" },
        status: "paid",
      });

      mockConstructEvent.mockReturnValue(event);

      const req = makeWebhookRequest(JSON.stringify(event));
      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(mockHandleInvoicePaid).toHaveBeenCalledWith(
        "in_test_lead_002",
        "pi_test_lead_002"
      );
    });
  });

  // ── invoice.payment_failed (advisor lead billing) ──

  describe("invoice.payment_failed", () => {
    it("calls handleInvoicePaymentFailed for advisor_lead invoices", async () => {
      const event = fakeStripeEvent("invoice.payment_failed", {
        id: "in_test_fail_001",
        customer: "cus_advisor_fail",
        payment_intent: "pi_test_fail_001",
        metadata: { type: "advisor_lead", billing_id: "99" },
      });

      mockConstructEvent.mockReturnValue(event);

      const req = makeWebhookRequest(JSON.stringify(event));
      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(mockHandleInvoicePaymentFailed).toHaveBeenCalledWith(
        "in_test_fail_001"
      );
    });

    it("does not call handleInvoicePaymentFailed for subscription invoices", async () => {
      const event = fakeStripeEvent("invoice.payment_failed", {
        id: "in_test_sub_fail",
        customer: "cus_sub_fail",
        payment_intent: "pi_sub_fail",
        metadata: {},
      });

      mockConstructEvent.mockReturnValue(event);

      const req = makeWebhookRequest(JSON.stringify(event));
      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(mockHandleInvoicePaymentFailed).not.toHaveBeenCalled();
    });
  });

  // ── checkout.session.completed (course) ──

  describe("checkout.session.completed (course)", () => {
    it("upserts course purchase and tracks revenue", async () => {
      const event = fakeStripeEvent("checkout.session.completed", {
        id: "cs_test_course",
        mode: "payment",
        payment_intent: "pi_test_course",
        amount_total: 9900,
        customer_email: "student@test.com",
        customer_details: { email: "student@test.com" },
        metadata: {
          type: "course",
          supabase_user_id: "user-uuid-student",
          course_slug: "investing-101",
        },
      });

      mockConstructEvent.mockReturnValue(event);

      // Return course data for revenue tracking
      mockFrom.mockImplementation((table: string) => {
        const builder = createChainableBuilder(table);
        if (table === "courses") {
          builder.maybeSingle = vi.fn(() =>
            Promise.resolve({
              data: {
                id: 1,
                title: "Investing 101",
                creator_id: "creator-uuid",
                revenue_share_percent: 70,
              },
              error: null,
            })
          );
        }
        if (table === "course_purchases") {
          builder.single = vi.fn(() =>
            Promise.resolve({ data: { id: 10 }, error: null })
          );
        }
        return builder;
      });

      const req = makeWebhookRequest(JSON.stringify(event));
      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(mockFrom).toHaveBeenCalledWith("course_purchases");
      expect(mockFrom).toHaveBeenCalledWith("courses");
    });
  });

  // ── checkout.session.completed (consultation) ──

  describe("checkout.session.completed (consultation)", () => {
    it("creates a consultation booking", async () => {
      const event = fakeStripeEvent("checkout.session.completed", {
        id: "cs_test_consult",
        mode: "payment",
        payment_intent: "pi_test_consult",
        amount_total: 19900,
        customer_email: "client@test.com",
        customer_details: { email: "client@test.com" },
        metadata: {
          type: "consultation",
          supabase_user_id: "user-uuid-client",
          consultation_slug: "retirement-planning",
        },
      });

      mockConstructEvent.mockReturnValue(event);

      mockFrom.mockImplementation((table: string) => {
        const builder = createChainableBuilder(table);
        if (table === "consultations") {
          builder.maybeSingle = vi.fn(() =>
            Promise.resolve({
              data: { id: 5, title: "Retirement Planning" },
              error: null,
            })
          );
        }
        return builder;
      });

      const req = makeWebhookRequest(JSON.stringify(event));
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockFrom).toHaveBeenCalledWith("consultation_bookings");
    });
  });

  // ── charge.refunded ──

  describe("charge.refunded", () => {
    it("revokes course purchase on refund", async () => {
      const event = fakeStripeEvent("charge.refunded", {
        id: "ch_test_refund",
        payment_intent: "pi_test_refund",
        amount_refunded: 9900,
      });

      mockConstructEvent.mockReturnValue(event);

      mockFrom.mockImplementation((table: string) => {
        const builder = createChainableBuilder(table);
        if (table === "course_purchases") {
          builder.maybeSingle = vi.fn(() =>
            Promise.resolve({
              data: {
                id: 10,
                user_id: "user-uuid-student",
                course_slug: "investing-101",
                amount_paid: 9900,
              },
              error: null,
            })
          );
        }
        return builder;
      });

      const req = makeWebhookRequest(JSON.stringify(event));
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockFrom).toHaveBeenCalledWith("course_purchases");
      expect(mockFrom).toHaveBeenCalledWith("course_revenue");
      expect(mockFrom).toHaveBeenCalledWith("admin_audit_log");
    });
  });

  // ── charge.dispute.created ──

  describe("charge.dispute.created", () => {
    it("logs the dispute and creates audit entry", async () => {
      const event = fakeStripeEvent("charge.dispute.created", {
        id: "dp_test_001",
        charge: "ch_test_disputed",
        amount: 9900,
        reason: "fraudulent",
        status: "needs_response",
      });

      mockConstructEvent.mockReturnValue(event);

      const req = makeWebhookRequest(JSON.stringify(event));
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockFrom).toHaveBeenCalledWith("admin_audit_log");
    });
  });

  // ── Unhandled event types ──

  describe("unhandled event types", () => {
    it("returns 200 for unknown event types", async () => {
      const event = fakeStripeEvent("some.unknown.event", {
        id: "obj_test",
      });

      mockConstructEvent.mockReturnValue(event);

      const req = makeWebhookRequest(JSON.stringify(event));
      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.received).toBe(true);
    });
  });

  // ── Error handling ──

  describe("error handling", () => {
    it("returns 500 when handler throws an unexpected error", async () => {
      const event = fakeStripeEvent("customer.subscription.created", {
        id: "sub_error",
        customer: "cus_error",
        status: "active",
        items: { data: [{ price: { id: "p", recurring: { interval: "month" } } }] },
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 86400,
        cancel_at_period_end: false,
        canceled_at: null,
      });

      mockConstructEvent.mockReturnValue(event);

      // Make the profiles query throw
      mockFrom.mockImplementation((table: string) => {
        if (table === "profiles") {
          const builder = createChainableBuilder(table);
          builder.single = vi.fn(() => {
            throw new Error("Database connection lost");
          });
          return builder;
        }
        return createChainableBuilder(table);
      });

      const req = makeWebhookRequest(JSON.stringify(event));
      const res = await POST(req);
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.error).toBe("Webhook handler failed");
    });
  });
});
