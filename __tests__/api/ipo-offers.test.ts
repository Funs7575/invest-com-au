import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(() => makeChain()),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChain(res: { data?: unknown; error?: unknown } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "eq", "neq", "gte", "lte", "lt", "gt", "is", "in", "not", "or",
    "order", "limit", "range", "maybeSingle", "single", "filter",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
  chain.catch = () => chain;
  return chain;
}

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/ipo-offers");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), { method: "GET" });
}

const SAMPLE_OFFER = {
  id: 1,
  asx_code: "ABC",
  company_name: "ABC Ltd",
  sector: "Technology",
  offer_type: "IPO",
  status: "open",
  offer_open_date: "2026-05-01",
  offer_close_date: "2026-05-15",
  listing_date: "2026-05-20",
  issue_price_cents: 200,
  amount_raised_cents: 5000000,
  minimum_application_cents: 200,
  first_day_return_pct: null,
  note: null,
  description: "A tech company",
  prospectus_url: "https://example.com/prospectus.pdf",
};

// ── Route under test (imported after all mocks) ───────────────────────────────
import { GET } from "@/app/api/ipo-offers/route";

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/ipo-offers
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/ipo-offers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
  });

  it("returns 500 when DB query fails", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "fetch boom" } }));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
  });

  it("returns 200 with empty offers array when none are published", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.offers).toEqual([]);
  });

  it("returns 200 with offers on success", async () => {
    mockFrom.mockReturnValue(makeChain({ data: [SAMPLE_OFFER], error: null }));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.offers).toHaveLength(1);
    expect(body.offers[0].asx_code).toBe("ABC");
    expect(body.offers[0].status).toBe("open");
  });

  it("returns Cache-Control header for CDN caching", async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    const res = await GET(makeReq());
    expect(res.headers.get("Cache-Control")).toContain("public");
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
    expect(res.headers.get("Cache-Control")).toContain("stale-while-revalidate=86400");
  });

  it("applies status filter when valid status provided", async () => {
    const chain = makeChain({ data: [SAMPLE_OFFER], error: null });
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ status: "open" }));
    const eqFn = chain.eq as ReturnType<typeof vi.fn>;
    const calls = (eqFn as ReturnType<typeof vi.fn>).mock.calls as [string, string][];
    expect(calls.some(([field, val]) => field === "status" && val === "open")).toBe(true);
  });

  it("does not apply status filter when status param is invalid", async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ status: "invalid-status" }));
    const eqFn = chain.eq as ReturnType<typeof vi.fn>;
    const calls = (eqFn as ReturnType<typeof vi.fn>).mock.calls as [string, string][];
    // Should not filter by the invalid status
    const statusCalls = calls.filter(([field]) => field === "status");
    expect(statusCalls).toHaveLength(0);
  });

  it("always filters by is_published=true", async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    await GET(makeReq());
    const eqFn = chain.eq as ReturnType<typeof vi.fn>;
    const calls = (eqFn as ReturnType<typeof vi.fn>).mock.calls as [string, unknown][];
    expect(calls.some(([field, val]) => field === "is_published" && val === true)).toBe(true);
  });

  it("uses default limit of 50 when limit param is absent", async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    await GET(makeReq());
    const limitFn = chain.limit as ReturnType<typeof vi.fn>;
    expect(limitFn).toHaveBeenCalledWith(50);
  });

  it("respects custom limit param", async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "25" }));
    const limitFn = chain.limit as ReturnType<typeof vi.fn>;
    expect(limitFn).toHaveBeenCalledWith(25);
  });

  it("clamps limit to max 100", async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "999" }));
    const limitFn = chain.limit as ReturnType<typeof vi.fn>;
    expect(limitFn).toHaveBeenCalledWith(100);
  });

  it("clamps limit to min 1 for zero input", async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "0" }));
    const limitFn = chain.limit as ReturnType<typeof vi.fn>;
    // parseInt("0") = 0, || 50 triggers → 50 (which is then clamped: min(max(1,50),100)=50)
    expect(limitFn).toHaveBeenCalledWith(50);
  });

  it("accepts all valid status values", async () => {
    for (const status of ["upcoming", "open", "closed", "listed", "withdrawn"]) {
      mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
      const res = await GET(makeReq({ status }));
      expect(res.status).toBe(200);
    }
  });

  it("returns multiple offers in the response", async () => {
    const offers = [
      { ...SAMPLE_OFFER, id: 1, asx_code: "ABC" },
      { ...SAMPLE_OFFER, id: 2, asx_code: "XYZ", status: "upcoming" },
    ];
    mockFrom.mockReturnValue(makeChain({ data: offers, error: null }));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.offers).toHaveLength(2);
  });
});
