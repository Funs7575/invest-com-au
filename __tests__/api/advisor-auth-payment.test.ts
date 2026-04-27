import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock state ─────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();
const mockGetStripe = vi.fn();
const mockCheckoutCreate = vi.fn();
const mockCustomerCreate = vi.fn();

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: (...args: unknown[]) => mockGetStripe(...args),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn() })),
}));

// ── Import after mocks ─────────────────────────────────────────────────────────

import { POST } from "@/app/api/advisor-auth/payment/route";

// ── Fixtures ───────────────────────────────────────────────────────────────────

const FUTURE = new Date(Date.now() + 3_600_000).toISOString();
const SESSION = { professional_id: 99, expires_at: FUTURE };
const ADVISOR = { id: 99, name: "Alice", email: "alice@inv.com", stripe_customer_id: "cus_exist", status: "active" };
const CHECKOUT_URL = "https://checkout.stripe.com/pay/cs_test_abc";

function chain(result: { data: unknown; error?: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "insert", "update", "eq", "or", "in", "gt", "order", "limit"])
    c[m] = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve({ data: result.data, error: result.error ?? null }));
  c.maybeSingle = vi.fn(() => Promise.resolve({ data: result.data, error: result.error ?? null }));
  c.then = vi.fn((cb: (v: unknown) => void) => {
    cb({ data: result.data, error: null });
    return Promise.resolve();
  });
  return c;
}

function post(body: unknown, sessionCookie?: string): Promise<Response> {
  return POST(
    new NextRequest("http://localhost/api/advisor-auth/payment", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        ...(sessionCookie ? { Cookie: `advisor_session=${sessionCookie}` } : {}),
      },
    }),
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStripe.mockReturnValue({
      checkout: { sessions: { create: mockCheckoutCreate } },
      customers: { create: mockCustomerCreate },
    });
    mockCheckoutCreate.mockResolvedValue({ url: CHECKOUT_URL });
    mockCustomerCreate.mockResolvedValue({ id: "cus_new" });
  });

  it("401 — no advisor_session cookie", async () => {
    const res = await post({ advisor_id: 99, credit_pack: "starter" });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Authentication required" });
  });

  it("401 — session not found in DB", async () => {
    mockAdminFrom.mockReturnValueOnce(chain({ data: null }));
    const res = await post({ advisor_id: 99, credit_pack: "starter" }, "tok");
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Invalid or expired session" });
  });

  it("400 — invalid JSON body", async () => {
    mockAdminFrom.mockReturnValueOnce(chain({ data: SESSION }));
    const res = await POST(
      new NextRequest("http://localhost/api/advisor-auth/payment", {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json", Cookie: "advisor_session=tok" },
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid JSON body." });
  });

  it("400 — advisor_id missing", async () => {
    mockAdminFrom.mockReturnValueOnce(chain({ data: SESSION }));
    const res = await post({ credit_pack: "starter" }, "tok");
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: /advisor_id/ });
  });

  it("400 — invalid credit_pack value", async () => {
    mockAdminFrom.mockReturnValueOnce(chain({ data: SESSION }));
    const res = await post({ advisor_id: 99, credit_pack: "ultra" }, "tok");
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: /credit_pack/ });
  });

  it("403 — advisor_id doesn't match session professional_id", async () => {
    mockAdminFrom.mockReturnValueOnce(chain({ data: { ...SESSION, professional_id: 1 } }));
    const res = await post({ advisor_id: 99, credit_pack: "starter" }, "tok");
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "Forbidden" });
  });

  it("404 — advisor not found in professionals", async () => {
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: SESSION }))
      .mockReturnValueOnce(chain({ data: null, error: { code: "PGRST116" } }));
    const res = await post({ advisor_id: 99, credit_pack: "starter" }, "tok");
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "Advisor not found." });
  });

  it("403 — advisor status is suspended", async () => {
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: SESSION }))
      .mockReturnValueOnce(chain({ data: { ...ADVISOR, status: "suspended" } }));
    const res = await post({ advisor_id: 99, credit_pack: "starter" }, "tok");
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "Advisor account is not active." });
  });

  it("503 — Stripe not configured (getStripe throws)", async () => {
    mockGetStripe.mockImplementationOnce(() => {
      throw new Error("no STRIPE_SECRET_KEY");
    });
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: SESSION }))
      .mockReturnValueOnce(chain({ data: ADVISOR }));
    const res = await post({ advisor_id: 99, credit_pack: "starter" }, "tok");
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: /Payment system/ });
  });

  it("200 — success with existing stripe_customer_id (no customer create)", async () => {
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: SESSION }))
      .mockReturnValueOnce(chain({ data: ADVISOR }))
      .mockReturnValueOnce(chain({ data: { id: 5 } })); // topup insert
    const res = await post({ advisor_id: 99, credit_pack: "growth" }, "tok");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ url: CHECKOUT_URL });
    expect(mockCustomerCreate).not.toHaveBeenCalled();
  });

  it("200 — creates Stripe customer when stripe_customer_id is null", async () => {
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: SESSION }))
      .mockReturnValueOnce(chain({ data: { ...ADVISOR, stripe_customer_id: null } }))
      .mockReturnValueOnce(chain({ data: null })) // update stripe_customer_id
      .mockReturnValueOnce(chain({ data: { id: 6 } })); // topup insert
    const res = await post({ advisor_id: 99, credit_pack: "scale" }, "tok");
    expect(res.status).toBe(200);
    expect(mockCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: ADVISOR.email, name: ADVISOR.name }),
    );
  });

  it("500 — Stripe checkout.sessions.create throws", async () => {
    mockCheckoutCreate.mockRejectedValueOnce(new Error("Stripe network error"));
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: SESSION }))
      .mockReturnValueOnce(chain({ data: ADVISOR }))
      .mockReturnValueOnce(chain({ data: { id: 7 } }));
    const res = await post({ advisor_id: 99, credit_pack: "starter" }, "tok");
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Failed to create checkout session." });
  });
});
