import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockIsAllowed = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<boolean>>());
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "1.2.3.4",
}));

const mockServerFrom = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockServerFrom }),
}));

import { GET } from "@/app/api/property/listings/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/property/listings");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

const SAMPLE_LISTINGS = [
  {
    id: 1,
    title: "Bayside Apartments",
    city: "Melbourne",
    property_type: "apartment",
    price_from_cents: 50000000,
    status: "active",
    sponsored: true,
    featured: false,
    property_developers: { name: "Luxe", logo_url: null, slug: "luxe" },
  },
  {
    id: 2,
    title: "Northside Townhouses",
    city: "Sydney",
    property_type: "townhouse",
    price_from_cents: 75000000,
    status: "coming_soon",
    sponsored: false,
    featured: true,
    property_developers: { name: "Premium", logo_url: null, slug: "premium" },
  },
];

function makeQueryChain(data: unknown, count: number | null, error: unknown = null) {
  const result = { data, count, error };
  const c: Record<string, unknown> = {};
  // All methods return the same chainable object (lazy query builder pattern)
  c.select = vi.fn(() => c);
  c.in = vi.fn(() => c);
  c.order = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.gte = vi.fn(() => c);
  c.lte = vi.fn(() => c);
  c.contains = vi.fn(() => c);
  c.range = vi.fn(() => c);
  // Thenable so `await query` resolves to the result
  c.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/property/listings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockServerFrom.mockReturnValue(makeQueryChain(SAMPLE_LISTINGS, 2));
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns 200 with listings array and pagination metadata on success", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.listings).toHaveLength(2);
    expect(json.total).toBe(2);
    expect(json.page).toBe(1);
    expect(json.per_page).toBe(12);
    expect(json.total_pages).toBe(1);
  });

  it("returns empty array when no listings found", async () => {
    mockServerFrom.mockReturnValue(makeQueryChain(null, null));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.listings).toEqual([]);
    expect(json.total).toBe(0);
  });

  it("returns 500 on DB error", async () => {
    mockServerFrom.mockReturnValue(makeQueryChain(null, null, { message: "db error" }));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("respects page param for offset calculation", async () => {
    const chain = makeQueryChain([], 0);
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ page: "3" }));
    expect(chain.range).toHaveBeenCalledWith(24, 35);
  });

  it("applies city filter when city != All", async () => {
    const chain = makeQueryChain([], 0);
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ city: "Melbourne" }));
    expect(chain.eq).toHaveBeenCalledWith("city", "Melbourne");
  });

  it("does not apply city filter when city = All", async () => {
    const chain = makeQueryChain([], 0);
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ city: "All" }));
    // eq should not have been called with 'city'
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    const cityCalls = eqCalls.filter((c: unknown[]) => c[0] === "city");
    expect(cityCalls).toHaveLength(0);
  });

  it("applies price_min and price_max filters", async () => {
    const chain = makeQueryChain([], 0);
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ price_min: "30000000", price_max: "80000000" }));
    expect(chain.gte).toHaveBeenCalledWith("price_from_cents", 30000000);
    expect(chain.lte).toHaveBeenCalledWith("price_from_cents", 80000000);
  });

  it("applies firb_approved filter when set to true", async () => {
    const chain = makeQueryChain([], 0);
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ firb_approved: "true" }));
    expect(chain.eq).toHaveBeenCalledWith("firb_approved", true);
  });

  it("applies price_asc sort ordering", async () => {
    const chain = makeQueryChain([], 0);
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ sort: "price_asc" }));
    expect(chain.order).toHaveBeenCalledWith("price_from_cents", { ascending: true });
  });

  it("applies price_desc sort ordering", async () => {
    const chain = makeQueryChain([], 0);
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ sort: "price_desc" }));
    expect(chain.order).toHaveBeenCalledWith("price_from_cents", { ascending: false });
  });

  it("defaults to newest sort (created_at desc)", async () => {
    const chain = makeQueryChain(SAMPLE_LISTINGS, 2);
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet());
    expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("total_pages rounds up correctly for partial pages", async () => {
    mockServerFrom.mockReturnValue(makeQueryChain([], 25));
    const res = await GET(makeGet());
    const json = await res.json();
    expect(json.total_pages).toBe(3);
  });
});
