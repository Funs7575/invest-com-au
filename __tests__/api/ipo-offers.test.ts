import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

import { GET } from "@/app/api/ipo-offers/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChain(data: unknown, error: unknown = null) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit"]) c[m] = vi.fn(() => c);
  c.then = (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(resolve({ data, error }));
  return c;
}

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/ipo-offers");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const OFFER = {
  id: 1,
  asx_code: "ABC",
  company_name: "Acme Corp",
  sector: "Tech",
  offer_type: "ipo",
  status: "open",
  offer_open_date: "2026-06-01",
  offer_close_date: "2026-06-20",
  listing_date: "2026-07-01",
  issue_price_cents: 200,
  amount_raised_cents: 5000000,
  minimum_application_cents: 200000,
  first_day_return_pct: null,
  note: null,
  description: "An IPO",
  prospectus_url: "https://example.com/p.pdf",
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/ipo-offers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with offers and the CDN cache header", async () => {
    mockFrom.mockReturnValue(makeChain([OFFER]));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=3600, stale-while-revalidate=86400",
    );
    const json = await res.json();
    expect(json.offers).toHaveLength(1);
    expect(json.offers[0]?.asx_code).toBe("ABC");
  });

  it("returns an empty array (not null) when there are no offers", async () => {
    mockFrom.mockReturnValue(makeChain(null));
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.offers).toEqual([]);
  });

  it("only queries published offers (RLS-aligned) from ipo_offers", async () => {
    const chain = makeChain([OFFER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq());
    expect(mockFrom).toHaveBeenCalledWith("ipo_offers");
    expect((chain.eq as ReturnType<typeof vi.fn>).mock.calls).toContainEqual(["is_published", true]);
  });

  it("defaults the limit to 50", async () => {
    const chain = makeChain([OFFER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq());
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe(50);
  });

  it("clamps limit to the 100 max", async () => {
    const chain = makeChain([OFFER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "500" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe(100);
  });

  it("clamps a non-positive limit up to 1", async () => {
    const chain = makeChain([OFFER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "-5" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe(1);
  });

  it("falls back to 50 when limit is non-numeric", async () => {
    const chain = makeChain([OFFER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "lots" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe(50);
  });

  it("applies a valid ?status= filter", async () => {
    const chain = makeChain([OFFER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ status: "open" }));
    expect((chain.eq as ReturnType<typeof vi.fn>).mock.calls).toContainEqual(["status", "open"]);
  });

  it("ignores an invalid ?status= value (no status filter)", async () => {
    const chain = makeChain([OFFER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ status: "bogus" }));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "status")).toBe(false);
  });

  it("returns 500 fetch_failed when the query errors", async () => {
    mockFrom.mockReturnValue(makeChain(null, { message: "db error" }));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("fetch_failed");
  });
});
