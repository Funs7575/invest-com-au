import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock state ─────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();
const mockIsRateLimited = vi.fn(() => Promise.resolve(false));
const mockGetStripe = vi.fn();
const mockCheckoutCreate = vi.fn();
const mockCustomerCreate = vi.fn();

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: (...args: unknown[]) => mockGetStripe(...args),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

vi.mock("@/lib/advisor-billing", () => ({
  DEFAULT_TOPUP_CENTS: 15000,
}));

// ── Import after mocks ─────────────────────────────────────────────────────────

import { POST, GET } from "@/app/api/advisor-auth/topup/route";

// ── Fixtures ───────────────────────────────────────────────────────────────────

const FUTURE = new Date(Date.now() + 3_600_000).toISOString();
const PRO = {
  id: 55,
  name: "Carol",
  email: "carol@inv.com",
  stripe_customer_id: "cus_carol",
};
const CHECKOUT_URL = "https://checkout.stripe.com/pay/cs_topup";

function chain(result: { data: unknown; error?: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "insert", "update", "eq", "or", "in", "order", "limit"])
    c[m] = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve({ data: result.data, error: result.error ?? null }));
  c.maybeSingle = vi.fn(() => Promise.resolve({ data: result.data, error: result.error ?? null }));
  c.then = vi.fn((cb: (v: unknown) => void) => {
    cb({ data: result.data, error: null });
    return Promise.resolve();
  });
  return c;
}

function makePostReq(body: unknown, sessionCookie?: string): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/topup", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
      ...(sessionCookie ? { Cookie: `advisor_session=${sessionCookie}` } : {}),
    },
  });
}

function makeGetReq(sessionCookie?: string): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/topup", {
    method: "GET",
    headers: {
      ...(sessionCookie ? { Cookie: `advisor_session=${sessionCookie}` } : {}),
    },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/topup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no Supabase auth user → falls through to session-cookie auth
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockGetStripe.mockReturnValue({
      checkout: { sessions: { create: mockCheckoutCreate } },
      customers: { create: mockCustomerCreate },
    });
    mockCheckoutCreate.mockResolvedValue({ url: CHECKOUT_URL });
    mockCustomerCreate.mockResolvedValue({ id: "cus_new" });
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("429 — rate limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makePostReq({ pack_slug: "starter" }, "tok"));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: /Too many/ });
  });

  it("401 — no valid session and no auth user", async () => {
    // No cookie + no Supabase user → getAdvisorId returns null
    const res = await POST(makePostReq({ pack_slug: "starter" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Not authenticated" });
  });

  it("400 — custom amount_cents below minimum ($50)", async () => {
    mockAdminFrom.mockReturnValueOnce(
      chain({ data: { professional_id: 55, expires_at: FUTURE } }),
    ); // session
    const res = await POST(makePostReq({ amount_cents: 4999 }, "tok"));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: /between/ });
  });

  it("400 — custom amount_cents above maximum ($2,000)", async () => {
    mockAdminFrom.mockReturnValueOnce(
      chain({ data: { professional_id: 55, expires_at: FUTURE } }),
    );
    const res = await POST(makePostReq({ amount_cents: 200001 }, "tok"));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: /between/ });
  });

  it("404 — professional not found", async () => {
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: { professional_id: 55, expires_at: FUTURE } })) // session
      .mockReturnValueOnce(chain({ data: null })); // professionals lookup
    const res = await POST(makePostReq({ pack_slug: "starter" }, "tok"));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "Professional not found" });
  });

  it("503 — Stripe not configured (getStripe throws)", async () => {
    mockGetStripe.mockImplementationOnce(() => {
      throw new Error("no STRIPE_SECRET_KEY");
    });
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: { professional_id: 55, expires_at: FUTURE } }))
      .mockReturnValueOnce(chain({ data: PRO }));
    const res = await POST(makePostReq({ pack_slug: "starter" }, "tok"));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: /Payment system/ });
  });

  it("200 — pack-based checkout with existing customer", async () => {
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: { professional_id: 55, expires_at: FUTURE } })) // session
      .mockReturnValueOnce(chain({ data: PRO })) // professionals
      .mockReturnValueOnce(chain({ data: { id: 10 } })); // topup insert
    const res = await POST(makePostReq({ pack_slug: "growth" }, "tok"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ url: CHECKOUT_URL });
    expect(mockCustomerCreate).not.toHaveBeenCalled();
  });

  it("200 — custom amount checkout uses DEFAULT_TOPUP_CENTS when no pack_slug or amount given", async () => {
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: { professional_id: 55, expires_at: FUTURE } }))
      .mockReturnValueOnce(chain({ data: PRO }))
      .mockReturnValueOnce(chain({ data: { id: 11 } }));
    const res = await POST(makePostReq({}, "tok")); // no pack_slug, no amount_cents → DEFAULT_TOPUP_CENTS=15000
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ url: CHECKOUT_URL });
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "payment" }),
    );
  });

  it("200 — creates new Stripe customer when stripe_customer_id is null", async () => {
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: { professional_id: 55, expires_at: FUTURE } }))
      .mockReturnValueOnce(chain({ data: { ...PRO, stripe_customer_id: null } }))
      .mockReturnValueOnce(chain({ data: null })) // update stripe_customer_id
      .mockReturnValueOnce(chain({ data: { id: 12 } })); // topup insert
    const res = await POST(makePostReq({ pack_slug: "scale" }, "tok"));
    expect(res.status).toBe(200);
    expect(mockCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: PRO.email, name: PRO.name }),
    );
  });
});

describe("GET /api/advisor-auth/topup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it("401 — not authenticated", async () => {
    const res = await GET(makeGetReq()); // no cookie
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Not authenticated" });
  });

  it("200 — returns credit balance and top-up history", async () => {
    const TOPUPS = [
      { id: 1, amount_cents: 19900, status: "completed", created_at: "2026-01-01T00:00:00Z" },
    ];
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: { professional_id: 55, expires_at: FUTURE } })) // session in getAdvisorId
      .mockReturnValueOnce(
        chain({
          data: {
            credit_balance_cents: 5000,
            lifetime_credit_cents: 20000,
            lifetime_lead_spend_cents: 15000,
            free_leads_used: 1,
            lead_price_cents: 4900,
          },
        }),
      ) // professionals in Promise.all
      .mockReturnValueOnce(chain({ data: TOPUPS })); // advisor_credit_topups in Promise.all
    const res = await GET(makeGetReq("tok"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      balance_cents: 5000,
      free_leads_remaining: 1, // max(0, 2 - 1)
      lead_price_cents: 4900,
      topups: TOPUPS,
    });
  });
});
