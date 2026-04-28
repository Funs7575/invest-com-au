import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
const mockRpc = vi.fn();
const mockServerFrom = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    rpc: mockRpc,
    from: mockServerFrom,
  })),
}));

import { GET } from "@/app/api/advisor-search/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/advisor-search");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url, {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

function makeProfessionalsChain(result: {
  data: unknown[] | null;
  error: { message: string } | null;
  count?: number;
}) {
  const chain = createChainableBuilder("professionals", {});
  chain.then = vi.fn((cb: (v: unknown) => void) => {
    const val = {
      data: result.data,
      error: result.error,
      count: result.count ?? (result.data?.length ?? 0),
    };
    cb(val);
    return Promise.resolve(val);
  });
  return chain;
}

describe("GET /api/advisor-search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns advisors list with pagination for standard query", async () => {
    const advisors = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
    mockServerFrom.mockReturnValue(
      makeProfessionalsChain({ data: advisors, error: null, count: 2 }),
    );
    const res = await GET(makeGet({ sort: "rating" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.advisors).toHaveLength(2);
    expect(json.total).toBe(2);
    expect(json.page).toBe(1);
    expect(json.totalPages).toBe(1);
  });

  it("returns 500 on standard query DB error", async () => {
    mockServerFrom.mockReturnValue(
      makeProfessionalsChain({ data: null, error: { message: "DB down" } }),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("uses PostGIS RPC when lat and lng are provided", async () => {
    mockRpc.mockResolvedValue({
      data: [{ id: 10, name: "Near Advisor" }],
      error: null,
    });
    const res = await GET(makeGet({ lat: "-33.8688", lng: "151.2093" }));
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith(
      "search_advisors_nearby",
      expect.objectContaining({ p_lat: -33.8688, p_lng: 151.2093 }),
    );
    const json = await res.json();
    expect(json.advisors).toHaveLength(1);
  });

  it("returns 500 when PostGIS RPC fails", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "PostGIS error" } });
    const res = await GET(makeGet({ lat: "-33.0", lng: "151.0" }));
    expect(res.status).toBe(500);
  });

  it("computes correct offset and range for page 3 limit 5", async () => {
    const advisors = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));
    const chain = makeProfessionalsChain({ data: advisors, error: null, count: 100 });
    mockServerFrom.mockReturnValue(chain);
    const res = await GET(makeGet({ page: "3", limit: "5", sort: "rating" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.page).toBe(3);
    expect(json.totalPages).toBe(20);
    const rangeCall = (chain.range as ReturnType<typeof vi.fn>).mock.calls[0] as [
      number,
      number,
    ];
    expect(rangeCall).toEqual([10, 14]);
  });

  it("clamps limit to MAX_LIMIT=50", async () => {
    const chain = makeProfessionalsChain({ data: [], error: null, count: 0 });
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ limit: "999", sort: "rating" }));
    const rangeCall = (chain.range as ReturnType<typeof vi.fn>).mock.calls[0] as [
      number,
      number,
    ];
    expect(rangeCall[1]).toBe(49);
  });

  it("applies type filter when provided", async () => {
    const chain = makeProfessionalsChain({ data: [], error: null, count: 0 });
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ type: "financial-planner", sort: "rating" }));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls as [string, unknown][];
    expect(eqCalls.some(([col, val]) => col === "type" && val === "financial-planner")).toBe(
      true,
    );
  });

  it("applies verified=true filter", async () => {
    const chain = makeProfessionalsChain({ data: [], error: null, count: 0 });
    mockServerFrom.mockReturnValue(chain);
    await GET(makeGet({ verified: "true", sort: "rating" }));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls as [string, unknown][];
    expect(eqCalls.some(([col, val]) => col === "verified" && val === true)).toBe(true);
  });

  it("appends feeStats when include_stats=true", async () => {
    mockServerFrom.mockReturnValue(makeProfessionalsChain({ data: [], error: null, count: 0 }));
    mockRpc.mockResolvedValue({ data: { avg_hourly: 250 }, error: null });
    const res = await GET(makeGet({ include_stats: "true", sort: "rating" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.feeStats).toEqual({ avg_hourly: 250 });
    expect(mockRpc).toHaveBeenCalledWith("advisor_fee_stats");
  });

  it("sorts by composite relevance score: highest-score advisor first", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const advisors = [
      {
        id: 1,
        rating: 2,
        review_count: 1,
        avg_response_minutes: 9999,
        verified: false,
        featured_until: null,
        total_leads: 0,
      },
      {
        id: 2,
        rating: 5,
        review_count: 25,
        avg_response_minutes: 60,
        verified: true,
        featured_until: future,
        total_leads: 10,
      },
    ];
    mockServerFrom.mockReturnValue(
      makeProfessionalsChain({ data: advisors, error: null, count: 2 }),
    );
    const res = await GET(makeGet({ sort: "relevance" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect((json.advisors[0] as { id: number }).id).toBe(2);
  });

  it("returns 500 on unexpected throw", async () => {
    mockServerFrom.mockImplementation(() => {
      throw new Error("unexpected");
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });
});
