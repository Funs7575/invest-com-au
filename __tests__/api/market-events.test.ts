import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

import { GET } from "@/app/api/market-events/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Then-able chain that records calls and resolves to {data, error}.
function makeChain(data: unknown, error: unknown = null) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "lte", "order", "limit"]) c[m] = vi.fn(() => c);
  c.then = (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(resolve({ data, error }));
  return c;
}

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/market-events");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const EVENT = {
  id: 1,
  event_date: "2026-06-03",
  event_type: "rba",
  title: "RBA Rate Decision",
  description: "Cash rate target announcement",
  source_url: "https://rba.gov.au",
  is_all_day: false,
  start_time: "14:30",
  timezone: "Australia/Sydney",
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/market-events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with events + resolved date window and CDN cache header", async () => {
    mockFrom.mockReturnValue(makeChain([EVENT]));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=3600, stale-while-revalidate=86400",
    );
    const json = await res.json();
    expect(json.events).toHaveLength(1);
    expect(json.events[0]?.title).toBe("RBA Rate Decision");
    expect(json.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(json.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns an empty array (not null) when there are no events", async () => {
    mockFrom.mockReturnValue(makeChain(null));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.events).toEqual([]);
  });

  it("only queries published events within the date range", async () => {
    const chain = makeChain([EVENT]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq());
    expect(mockFrom).toHaveBeenCalledWith("market_events");
    expect((chain.eq as ReturnType<typeof vi.fn>).mock.calls).toContainEqual(["is_published", true]);
    expect((chain.gte as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe("event_date");
    expect((chain.lte as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe("event_date");
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe(200);
  });

  it("honours valid from/to params verbatim", async () => {
    const chain = makeChain([EVENT]);
    mockFrom.mockReturnValue(chain);
    const res = await GET(makeReq({ from: "2026-01-01", to: "2026-03-31" }));
    const json = await res.json();
    expect(json.from).toBe("2026-01-01");
    expect(json.to).toBe("2026-03-31");
    expect((chain.gte as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual(["event_date", "2026-01-01"]);
    expect((chain.lte as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual(["event_date", "2026-03-31"]);
  });

  it("ignores malformed from/to params and falls back to defaults", async () => {
    const chain = makeChain([EVENT]);
    mockFrom.mockReturnValue(chain);
    const res = await GET(makeReq({ from: "01-01-2026", to: "garbage" }));
    const json = await res.json();
    // Defaults are today and today+90d — both valid ISO dates, not the bad input.
    expect(json.from).not.toBe("01-01-2026");
    expect(json.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(json.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("applies the event_type filter for a valid ?type=", async () => {
    const chain = makeChain([EVENT]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ type: "rba" }));
    expect((chain.eq as ReturnType<typeof vi.fn>).mock.calls).toContainEqual(["event_type", "rba"]);
  });

  it("ignores an invalid ?type= value (no event_type filter)", async () => {
    const chain = makeChain([EVENT]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ type: "not-a-type" }));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "event_type")).toBe(false);
  });

  it("returns 500 fetch_failed when the query errors", async () => {
    mockFrom.mockReturnValue(makeChain(null, { message: "db error" }));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("fetch_failed");
  });
});
