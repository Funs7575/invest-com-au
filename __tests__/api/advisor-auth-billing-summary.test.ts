import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockRequireAdvisorSession = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 42);

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter","contains"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: vi.fn(() => makeBuilder()),
  })),
}));

const mockGetLedgerPage = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ rows: [], total: 0 }));
const mockGetExpiringSoonCents = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 0);

vi.mock("@/lib/advisor-credit-ledger", () => ({
  getLedgerPage: (...args: unknown[]) => mockGetLedgerPage(...args),
  getExpiringSoonCents: (...args: unknown[]) => mockGetExpiringSoonCents(...args),
}));

import { GET } from "@/app/api/advisor-auth/billing-summary/route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/advisor-auth/billing-summary", {
    method: "GET",
  }) as unknown as NextRequest;
}

const mockPro = {
  credit_balance_cents: 10000,
  lifetime_credit_cents: 50000,
  lifetime_lead_spend_cents: 40000,
  free_leads_used: 1,
  lead_price_cents: 4900,
  advisor_tier: "starter",
  stripe_customer_id: null,
  pending_tier: null,
  pending_tier_effective_at: null,
};

describe("/api/advisor-auth/billing-summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockGetLedgerPage.mockResolvedValue({ rows: [], total: 0 });
    mockGetExpiringSoonCents.mockResolvedValue(0);
    mockFrom.mockImplementation(() => makeBuilder({ data: mockPro, error: null }));
  });

  it("rejects unauthenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 404 when advisor not found", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const res = await GET(makeReq());
    expect(res.status).toBe(404);
  });

  it("returns billing summary for authenticated advisor", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("balance_cents");
    expect(json).toHaveProperty("lifetime_credit_cents");
    expect(json).toHaveProperty("lifetime_spend_cents");
    expect(json).toHaveProperty("free_leads_remaining");
    expect(json).toHaveProperty("lead_price_cents");
    expect(json).toHaveProperty("has_payment_method");
    expect(json).toHaveProperty("ledger_first_page");
    expect(json).toHaveProperty("ledger_total");
  });

  it("computes free_leads_remaining correctly", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: { ...mockPro, free_leads_used: 1 }, error: null }));
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.free_leads_remaining).toBe(2);
  });
});
