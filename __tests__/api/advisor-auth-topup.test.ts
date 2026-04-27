import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

vi.mock("@/lib/advisor-billing", () => ({
  DEFAULT_TOPUP_CENTS: 20000,
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

import { POST, GET } from "@/app/api/advisor-auth/topup/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: Record<string, unknown>, cookie?: string): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookie) headers.cookie = `advisor_session=${cookie}`;
  return new NextRequest("http://localhost/api/advisor-auth/topup", {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
}

function makeGet(cookie?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = `advisor_session=${cookie}`;
  return new NextRequest("http://localhost/api/advisor-auth/topup", {
    method: "GET",
    headers,
  });
}

function authedAdvisor(advisorId = 42) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "u-1", email: "advisor@test.com" } },
  });
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
    if (table === "professionals") {
      b.maybeSingle = vi.fn(() =>
        Promise.resolve({ data: { id: advisorId }, error: null }),
      );
    }
    return b;
  });
}

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/topup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    throwOnGetStripe = false;
    mockServerFrom.mockReset();
    mockAdminFrom.mockReset();
    mockServerFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    mockCustomerCreate.mockResolvedValue({ id: "cus_new_001" });
    mockCheckoutCreate.mockResolvedValue({
      id: "cs_test_001",
      url: "https://checkout.stripe.com/c/cs_test_001",
    });
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const res = await POST(makePost({}));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost({}));
    expect(res.status).toBe(401);
  });

  it("rejects amount < $50", async () => {
    authedAdvisor();
    const res = await POST(makePost({ amount_cents: 100 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/between \$50 and \$2,000/);
  });

  it("rejects amount > $2000", async () => {
    authedAdvisor();
    const res = await POST(makePost({ amount_cents: 300000 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when professional not found", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1", email: "advisor@test.com" } },
    });
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        // First .maybeSingle() returns the advisor id (auth path)
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
        // .single() (the pro-lookup) returns null
        b.single = vi.fn(() =>
          Promise.resolve({ data: null, error: null }),
        );
      }
      return b;
    });

    const res = await POST(makePost({}));
    expect(res.status).toBe(404);
  });

  it("returns 503 when Stripe is not configured", async () => {
    throwOnGetStripe = true;
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1", email: "advisor@test.com" } },
    });
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: 42,
              name: "Advisor",
              email: "advisor@test.com",
              stripe_customer_id: "cus_existing",
            },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await POST(makePost({}));
    expect(res.status).toBe(503);
  });

  it("uses pack pricing when pack_slug=growth", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1", email: "advisor@test.com" } },
    });
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: 42,
              name: "Advisor",
              email: "advisor@test.com",
              stripe_customer_id: "cus_existing",
            },
            error: null,
          }),
        );
      }
      if (table === "advisor_credit_topups") {
        b.single = vi.fn(() =>
          Promise.resolve({ data: { id: 555 }, error: null }),
        );
      }
      return b;
    });

    const res = await POST(makePost({ pack_slug: "growth" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.stripe.com/c/cs_test_001");

    const callArg = mockCheckoutCreate.mock.calls[0][0];
    expect(callArg.line_items[0].price_data.unit_amount).toBe(44900);
    expect(callArg.metadata.type).toBe("advisor_credit_topup");
    expect(callArg.metadata.pack_slug).toBe("growth");
    expect(callArg.metadata.pack_leads).toBe("12");
  });

  it("creates a Stripe customer when stripe_customer_id is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1", email: "advisor@test.com" } },
    });
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: 42,
              name: "Advisor",
              email: "advisor@test.com",
              stripe_customer_id: null,
            },
            error: null,
          }),
        );
      }
      if (table === "advisor_credit_topups") {
        b.single = vi.fn(() =>
          Promise.resolve({ data: { id: 555 }, error: null }),
        );
      }
      return b;
    });

    const res = await POST(makePost({ amount_cents: 50000 }));
    expect(res.status).toBe(200);
    expect(mockCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "advisor@test.com",
        name: "Advisor",
      }),
    );
    const callArg = mockCheckoutCreate.mock.calls[0][0];
    expect(callArg.customer).toBe("cus_new_001");
  });

  it("uses 'advisor_featured' type for featured_monthly pack", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1", email: "advisor@test.com" } },
    });
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: 42,
              name: "Advisor",
              email: "advisor@test.com",
              stripe_customer_id: "cus_existing",
            },
            error: null,
          }),
        );
      }
      if (table === "advisor_credit_topups") {
        b.single = vi.fn(() =>
          Promise.resolve({ data: { id: 555 }, error: null }),
        );
      }
      return b;
    });

    const res = await POST(makePost({ pack_slug: "featured_monthly" }));
    expect(res.status).toBe(200);
    const callArg = mockCheckoutCreate.mock.calls[0][0];
    expect(callArg.metadata.type).toBe("advisor_featured");
    expect(callArg.line_items[0].price_data.unit_amount).toBe(14900);
  });
});

describe("GET /api/advisor-auth/topup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockServerFrom.mockReset();
    mockAdminFrom.mockReset();
    mockServerFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns balance and topup history with derived free_leads_remaining", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1", email: "advisor@test.com" } },
    });
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        let callCount = 0;
        b.maybeSingle = vi.fn(() => {
          callCount++;
          // First call: auth lookup
          if (callCount === 1) {
            return Promise.resolve({ data: { id: 42 }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        });
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              credit_balance_cents: 50000,
              lifetime_credit_cents: 100000,
              lifetime_lead_spend_cents: 49000,
              free_leads_used: 1,
              lead_price_cents: 4900,
            },
            error: null,
          }),
        );
      }
      if (table === "advisor_credit_topups") {
        // Make limit return an array directly (final terminal)
        b.limit = vi.fn(() => {
          supabaseCalls[table]?.push({ method: "limit", args: [] });
          return Promise.resolve({
            data: [
              {
                id: 1,
                amount_cents: 50000,
                status: "completed",
                created_at: "2026-01-01",
              },
            ],
            error: null,
          });
        });
      }
      return b;
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.balance_cents).toBe(50000);
    expect(json.lifetime_credit_cents).toBe(100000);
    expect(json.free_leads_used).toBe(1);
    expect(json.free_leads_remaining).toBe(1);
    expect(json.lead_price_cents).toBe(4900);
    expect(json.topups).toHaveLength(1);
  });

  it("falls back to defaults when professional row is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1", email: "advisor@test.com" } },
    });
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
        b.single = vi.fn(() =>
          Promise.resolve({ data: null, error: null }),
        );
      }
      if (table === "advisor_credit_topups") {
        b.limit = vi.fn(() =>
          Promise.resolve({ data: [], error: null }),
        );
      }
      return b;
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.balance_cents).toBe(0);
    expect(json.free_leads_remaining).toBe(2);
    expect(json.lead_price_cents).toBe(4900);
    expect(json.topups).toEqual([]);
  });
});
