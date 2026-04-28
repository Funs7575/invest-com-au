import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockAuth = { getUser: vi.fn() };
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: mockAuth })),
}));

// Server-client for broker_accounts lookup
const mockServerFrom = vi.fn();
const mockServerClient = { auth: mockAuth, from: mockServerFrom };
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockServerClient)),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockSessionsCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { create: mockSessionsCreate } } }),
}));

import { POST } from "@/app/api/marketplace/wallet-topup/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const TEST_USER = { id: "broker-user-id-abc" };
const BROKER_ACCOUNT = {
  broker_slug: "commsec",
  company_name: "CommSec",
  email: "admin@commsec.com.au",
};

function makePost(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/marketplace/wallet-topup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeBrokerChain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq"]) {
    c[m] = vi.fn(() => c);
  }
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  return c;
}

function makeInvoiceChain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["insert", "update", "select", "eq"]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve(result));
  c.then = (cb: (v: unknown) => void) => {
    cb({ error: null });
    return Promise.resolve({ error: null });
  };
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/marketplace/wallet-topup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockServerFrom.mockReturnValue(makeBrokerChain({ data: BROKER_ACCOUNT, error: null }));
    mockAdminFrom.mockReturnValue(makeInvoiceChain({ data: { id: 42 }, error: null }));
    mockSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/wallet" });
    process.env.NEXT_PUBLIC_SITE_URL = "https://invest.com.au";
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost({ amount: 100 }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/not authenticated/i);
  });

  it("returns 403 when no active broker account", async () => {
    mockServerFrom.mockReturnValue(makeBrokerChain({ data: null, error: null }));
    const res = await POST(makePost({ amount: 100 }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/no active broker account/i);
  });

  it("returns 400 when amount is below $50", async () => {
    const res = await POST(makePost({ amount: 49 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/50.*50,000/);
  });

  it("returns 400 when amount exceeds $50,000", async () => {
    const res = await POST(makePost({ amount: 50001 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/50.*50,000/);
  });

  it("returns 400 when amount is missing", async () => {
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/50.*50,000/);
  });

  it("returns 500 when invoice DB insert fails", async () => {
    mockAdminFrom.mockReturnValue(
      makeInvoiceChain({ data: null, error: { message: "constraint" } }),
    );
    const res = await POST(makePost({ amount: 100 }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to create invoice/i);
  });

  it("returns 500 when Stripe session creation throws", async () => {
    mockSessionsCreate.mockRejectedValue(new Error("Stripe down"));
    const res = await POST(makePost({ amount: 100 }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to create checkout session/i);
  });

  it("returns 200 with checkout URL on success", async () => {
    const res = await POST(makePost({ amount: 500 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.stripe.com/pay/wallet");
  });

  it("passes amount in cents to Stripe (dollars × 100)", async () => {
    await POST(makePost({ amount: 200 }));
    const call = mockSessionsCreate.mock.calls[0][0] as {
      line_items: Array<{ price_data: { unit_amount: number } }>;
    };
    expect(call.line_items[0].price_data.unit_amount).toBe(20_000);
  });

  it("idempotency key is formatted as wallet_topup_<slug>_<invoiceId>", async () => {
    await POST(makePost({ amount: 100 }));
    const [, options] = mockSessionsCreate.mock.calls[0] as [unknown, { idempotencyKey: string }];
    expect(options.idempotencyKey).toMatch(/^wallet_topup_commsec_42$/);
  });

  it("session metadata includes wallet_topup type, broker_slug, invoice_id, amount_cents", async () => {
    await POST(makePost({ amount: 150 }));
    const call = mockSessionsCreate.mock.calls[0][0] as { metadata: Record<string, string> };
    expect(call.metadata.type).toBe("wallet_topup");
    expect(call.metadata.broker_slug).toBe("commsec");
    expect(call.metadata.invoice_id).toBe("42");
    expect(call.metadata.amount_cents).toBe("15000");
  });
});
