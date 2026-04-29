import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
const mockServerFrom = vi.fn();

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "1.2.3.4",
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockServerFrom(...args),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET } from "@/app/api/property/listings/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/property/listings");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

const LISTINGS = [
  {
    id: 1,
    title: "Sydney Apartments",
    status: "active",
    city: "Sydney",
    property_type: "apartment",
    price_from_cents: 70000000,
    sponsored: true,
    featured: false,
    property_developers: { name: "Dev Co", logo_url: null, slug: "dev-co" },
  },
];

function makeQueryChain(result: { data: unknown; count: number | null; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "in", "range", "order", "eq", "gte", "lte"] as const;
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Make the chain awaitable: `await chain` triggers `.then`
  (chain as { then: (r: (v: unknown) => unknown, j?: (e: unknown) => unknown) => Promise<unknown> }).then =
    (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/property/listings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockServerFrom.mockReturnValue(makeQueryChain({ data: LISTINGS, count: 1, error: null }));
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns listings with correct pagination metadata", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.listings).toEqual(LISTINGS);
    expect(json.total).toBe(1);
    expect(json.page).toBe(1);
    expect(json.per_page).toBe(12);
    expect(json.total_pages).toBe(1);
  });

  it("uses page=2 offset (12-23)", async () => {
    const chain = makeQueryChain({ data: LISTINGS, count: 25, error: null });
    mockServerFrom.mockReturnValue(chain);
    const res = await GET(makeGet({ page: "2" }));
    expect(res.status).toBe(200);
    expect(chain.range).toHaveBeenCalledWith(12, 23);
  });

  it("calculates total_pages correctly for count=25", async () => {
    mockServerFrom.mockReturnValue(makeQueryChain({ data: LISTINGS, count: 25, error: null }));
    const res = await GET(makeGet());
    const json = await res.json();
    expect(json.total_pages).toBe(3); // ceil(25/12)
  });

  it("applies price_asc sort ordering", async () => {
    const chain = makeQueryChain({ data: LISTINGS, count: 1, error: null });
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ sort: "price_asc" }));
    expect(chain.order).toHaveBeenCalledWith("price_from_cents", { ascending: true });
  });

  it("applies price_desc sort ordering", async () => {
    const chain = makeQueryChain({ data: LISTINGS, count: 1, error: null });
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ sort: "price_desc" }));
    expect(chain.order).toHaveBeenCalledWith("price_from_cents", { ascending: false });
  });

  it("applies yield_desc sort by rental_yield_estimate", async () => {
    const chain = makeQueryChain({ data: LISTINGS, count: 1, error: null });
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ sort: "yield_desc" }));
    expect(chain.order).toHaveBeenCalledWith("rental_yield_estimate", {
      ascending: false,
      nullsFirst: false,
    });
  });

  it("applies city filter when city is not 'All'", async () => {
    const chain = makeQueryChain({ data: LISTINGS, count: 1, error: null });
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ city: "Melbourne" }));
    expect(chain.eq).toHaveBeenCalledWith("city", "Melbourne");
  });

  it("skips city filter when city=All", async () => {
    const chain = makeQueryChain({ data: LISTINGS, count: 1, error: null });
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ city: "All" }));
    expect(chain.eq).not.toHaveBeenCalledWith("city", "All");
  });

  it("applies firb_approved=true filter", async () => {
    const chain = makeQueryChain({ data: LISTINGS, count: 1, error: null });
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ firb_approved: "true" }));
    expect(chain.eq).toHaveBeenCalledWith("firb_approved", true);
  });

  it("applies price range with gte + lte", async () => {
    const chain = makeQueryChain({ data: LISTINGS, count: 1, error: null });
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ price_min: "50000000", price_max: "200000000" }));
    expect(chain.gte).toHaveBeenCalledWith("price_from_cents", 50000000);
    expect(chain.lte).toHaveBeenCalledWith("price_from_cents", 200000000);
  });

  it("returns 500 on DB error", async () => {
    mockServerFrom.mockReturnValue(
      makeQueryChain({ data: null, count: null, error: { message: "DB fail" } })
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("queries property_listings table", async () => {
    await GET(makeGet());
    expect(mockServerFrom).toHaveBeenCalledWith("property_listings");
  });
});
