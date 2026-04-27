import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

const mockCustomerCreate = vi.fn();
const mockCheckoutCreate = vi.fn();
let throwOnGetStripe = false;
vi.mock("@/lib/stripe", () => ({
  getStripe: () => {
    if (throwOnGetStripe) throw new Error("Stripe not configured");
    return {
      customers: { create: mockCustomerCreate },
      checkout: { sessions: { create: mockCheckoutCreate } },
    };
  },
}));

import { POST } from "@/app/api/advisor-auth/payment/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown, cookie?: string): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookie) headers.cookie = `advisor_session=${cookie}`;
  return new NextRequest("http://localhost/api/advisor-auth/payment", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers,
  });
}

function withSessionAndAdvisor(
  professionalId = 42,
  advisorOverrides: Record<string, unknown> = {},
) {
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
    if (table === "advisor_sessions") {
      b.single = vi.fn(() =>
        Promise.resolve({
          data: {
            professional_id: professionalId,
            expires_at: new Date(Date.now() + 86400 * 1000).toISOString(),
          },
          error: null,
        }),
      );
    }
    if (table === "professionals") {
      b.single = vi.fn(() =>
        Promise.resolve({
          data: {
            id: professionalId,
            name: "Advisor",
            email: "advisor@test.com",
            stripe_customer_id: "cus_existing",
            status: "active",
            ...advisorOverrides,
          },
          error: null,
        }),
      );
    }
    if (table === "advisor_credit_topups") {
      b.single = vi.fn(() =>
        Promise.resolve({ data: { id: 99 }, error: null }),
      );
    }
    return b;
  });
}

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    throwOnGetStripe = false;
    mockAdminFrom.mockReset();
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockCustomerCreate.mockResolvedValue({ id: "cus_new" });
    mockCheckoutCreate.mockResolvedValue({
      id: "cs_payment_001",
      url: "https://checkout.stripe.com/c/cs_payment_001",
    });
  });

  it("returns 401 when no session cookie", async () => {
    const res = await POST(
      makePost({ advisor_id: 42, credit_pack: "starter" }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when session is invalid/expired", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_sessions") {
        b.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
      }
      return b;
    });

    const res = await POST(
      makePost({ advisor_id: 42, credit_pack: "starter" }, "stale-token"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_sessions") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              professional_id: 42,
              expires_at: new Date(Date.now() + 86400 * 1000).toISOString(),
            },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await POST(makePost("{not-json", "valid-token"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when advisor_id is missing", async () => {
    withSessionAndAdvisor();
    const res = await POST(makePost({ credit_pack: "starter" }, "valid"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when credit_pack is invalid", async () => {
    withSessionAndAdvisor();
    const res = await POST(
      makePost({ advisor_id: 42, credit_pack: "bogus" }, "valid"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when advisor_id doesn't match session", async () => {
    withSessionAndAdvisor(42);
    const res = await POST(
      makePost({ advisor_id: 99, credit_pack: "starter" }, "valid"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when advisor row not found", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_sessions") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              professional_id: 42,
              expires_at: new Date(Date.now() + 86400 * 1000).toISOString(),
            },
            error: null,
          }),
        );
      }
      if (table === "professionals") {
        b.single = vi.fn(() =>
          Promise.resolve({ data: null, error: null }),
        );
      }
      return b;
    });

    const res = await POST(
      makePost({ advisor_id: 42, credit_pack: "starter" }, "valid"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when advisor account is suspended", async () => {
    withSessionAndAdvisor(42, { status: "suspended" });
    const res = await POST(
      makePost({ advisor_id: 42, credit_pack: "starter" }, "valid"),
    );
    expect(res.status).toBe(403);
  });

  it("returns 503 when Stripe is not configured", async () => {
    throwOnGetStripe = true;
    withSessionAndAdvisor();
    const res = await POST(
      makePost({ advisor_id: 42, credit_pack: "starter" }, "valid"),
    );
    expect(res.status).toBe(503);
  });

  it("creates a checkout session for starter pack", async () => {
    withSessionAndAdvisor();
    const res = await POST(
      makePost({ advisor_id: 42, credit_pack: "starter" }, "valid"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.stripe.com/c/cs_payment_001");

    const callArg = mockCheckoutCreate.mock.calls[0][0];
    expect(callArg.line_items[0].price_data.unit_amount).toBe(19900);
    expect(callArg.metadata.type).toBe("advisor_credit_topup");
    expect(callArg.metadata.credits).toBe("5");
  });

  it("creates a Stripe customer when stripe_customer_id is null", async () => {
    withSessionAndAdvisor(42, { stripe_customer_id: null });
    const res = await POST(
      makePost({ advisor_id: 42, credit_pack: "scale" }, "valid"),
    );
    expect(res.status).toBe(200);
    expect(mockCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "advisor@test.com",
        name: "Advisor",
      }),
    );
    const callArg = mockCheckoutCreate.mock.calls[0][0];
    expect(callArg.customer).toBe("cus_new");
    expect(callArg.line_items[0].price_data.unit_amount).toBe(79900);
  });

  it("returns 500 on unexpected error", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("DB unreachable");
    });
    const res = await POST(
      makePost({ advisor_id: 42, credit_pack: "starter" }, "valid"),
    );
    expect(res.status).toBe(500);
  });
});
