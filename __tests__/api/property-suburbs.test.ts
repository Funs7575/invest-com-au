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

import { GET } from "@/app/api/property/suburbs/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/property/suburbs");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

const SUBURBS = [
  {
    slug: "surry-hills-nsw",
    suburb: "Surry Hills",
    state: "NSW",
    postcode: "2010",
    median_price_house: 1850000,
    median_price_unit: 780000,
    rental_yield_house: 2.8,
    rental_yield_unit: 4.1,
    vacancy_rate: 1.5,
    capital_growth_1yr: 5.2,
    capital_growth_3yr: 12.1,
    capital_growth_5yr: 24.5,
    capital_growth_10yr: 63.0,
    population: 14200,
    population_growth: 1.2,
    median_age: 32,
    median_income: 85000,
    distance_to_cbd_km: 2.5,
  },
];

function makeQueryChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.order = vi.fn(() => c);
  c.ilike = vi.fn(() => c);
  c.limit = vi.fn().mockResolvedValue(result);
  return c;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/property/suburbs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockServerFrom.mockReturnValue(makeQueryChain({ data: SUBURBS, error: null }));
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns all suburbs when no query param", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(1);
  });

  it("returns empty array when no suburbs found", async () => {
    mockServerFrom.mockReturnValue(makeQueryChain({ data: null, error: null }));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it("applies ilike filter when q param has 2+ chars", async () => {
    const chain = makeQueryChain({ data: SUBURBS, error: null });
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ q: "surry" }));
    expect(chain.ilike).toHaveBeenCalledWith("suburb", "%surry%");
  });

  it("skips ilike filter when q is shorter than 2 chars", async () => {
    const chain = makeQueryChain({ data: SUBURBS, error: null });
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ q: "s" }));
    expect(chain.ilike).not.toHaveBeenCalled();
  });

  it("returns 500 when DB error occurs", async () => {
    mockServerFrom.mockReturnValue(makeQueryChain({ data: null, error: { message: "DB error" } }));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("queries suburb_data table", async () => {
    await GET(makeGet());
    expect(mockServerFrom).toHaveBeenCalledWith("suburb_data");
  });
});
