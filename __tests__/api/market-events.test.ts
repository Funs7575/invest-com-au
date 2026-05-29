import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockServerFrom } = vi.hoisted(() => ({ mockServerFrom: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockServerFrom })),
}));

import { GET } from "@/app/api/market-events/route";

// ─── Builder helper ───────────────────────────────────────────────────────────

function makeBuilder(data: unknown = [], error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "eq", "gte", "lte", "order", "limit",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

const EVENT_ROW = {
  id: 1,
  event_date: "2026-06-10",
  event_type: "rba",
  title: "RBA Cash Rate Decision",
  description: "RBA decision",
  source_url: "https://rba.gov.au",
  is_all_day: true,
  start_time: null,
  timezone: "Australia/Sydney",
};

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/market-events");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/market-events — response shape", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with JSON content-type", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([EVENT_ROW]));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.events)).toBe(true);
  });

  it("returns Cache-Control public header", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([EVENT_ROW]));
    const res = await GET(makeReq());
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
    expect(res.headers.get("Cache-Control")).toContain("stale-while-revalidate");
  });

  it("returns 500 with error key on DB error", async () => {
    mockServerFrom.mockReturnValue(makeBuilder(null, { message: "db fail" }));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
  });

  it("returns empty events array when no rows match", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([]));
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.events).toEqual([]);
  });

  it("includes from and to in the response body", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([EVENT_ROW]));
    const res = await GET(makeReq({ from: "2026-06-01", to: "2026-09-01" }));
    const body = await res.json();
    expect(body.from).toBe("2026-06-01");
    expect(body.to).toBe("2026-09-01");
  });
});

describe("GET /api/market-events — date param validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts valid ?from= and ?to= params", async () => {
    const chain = makeBuilder([EVENT_ROW]);
    mockServerFrom.mockReturnValue(chain);
    await GET(makeReq({ from: "2026-06-01", to: "2026-09-01" }));
    const gteCalls = (chain.gte as ReturnType<typeof vi.fn>).mock.calls;
    const lteCalls = (chain.lte as ReturnType<typeof vi.fn>).mock.calls;
    expect(gteCalls.some((c) => c[1] === "2026-06-01")).toBe(true);
    expect(lteCalls.some((c) => c[1] === "2026-09-01")).toBe(true);
  });

  it("falls back to today when ?from= is invalid format", async () => {
    const chain = makeBuilder([EVENT_ROW]);
    mockServerFrom.mockReturnValue(chain);
    const res = await GET(makeReq({ from: "not-a-date" }));
    const body = await res.json();
    // Should use today's date (YYYY-MM-DD), not "not-a-date"
    expect(body.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.from).not.toBe("not-a-date");
  });

  it("falls back to 90 days from now when ?to= is invalid", async () => {
    const chain = makeBuilder([EVENT_ROW]);
    mockServerFrom.mockReturnValue(chain);
    const res = await GET(makeReq({ to: "bad" }));
    const body = await res.json();
    expect(body.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.to).not.toBe("bad");
  });

  it("uses defaults (today to 90d) when no params given", async () => {
    const chain = makeBuilder([EVENT_ROW]);
    mockServerFrom.mockReturnValue(chain);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const fromDate = new Date(body.from as string);
    const toDate = new Date(body.to as string);
    expect(toDate.getTime()).toBeGreaterThan(fromDate.getTime());
  });
});

describe("GET /api/market-events — type filter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("applies type filter when a valid ?type= is passed", async () => {
    const chain = makeBuilder([EVENT_ROW]);
    mockServerFrom.mockReturnValue(chain);
    await GET(makeReq({ type: "rba" }));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "event_type" && c[1] === "rba")).toBe(true);
  });

  it("does NOT apply type filter for an unknown type value", async () => {
    const chain = makeBuilder([EVENT_ROW]);
    mockServerFrom.mockReturnValue(chain);
    await GET(makeReq({ type: "mystery" }));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "event_type")).toBe(false);
  });

  it("accepts all valid event types", async () => {
    const validTypes = ["rba", "asx", "earnings", "economic", "dividend", "ipo", "other"];
    for (const type of validTypes) {
      vi.clearAllMocks();
      const chain = makeBuilder([EVENT_ROW]);
      mockServerFrom.mockReturnValue(chain);
      await GET(makeReq({ type }));
      const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
      expect(eqCalls.some((c) => c[0] === "event_type" && c[1] === type)).toBe(true);
    }
  });
});

describe("GET /api/market-events — query constraints", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries only published events (is_published=true)", async () => {
    const chain = makeBuilder([EVENT_ROW]);
    mockServerFrom.mockReturnValue(chain);
    await GET(makeReq());
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "is_published" && c[1] === true)).toBe(true);
  });

  it("applies a limit of 200", async () => {
    const chain = makeBuilder([EVENT_ROW]);
    mockServerFrom.mockReturnValue(chain);
    await GET(makeReq());
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(200);
  });

  it("orders results by event_date ascending", async () => {
    const chain = makeBuilder([EVENT_ROW]);
    mockServerFrom.mockReturnValue(chain);
    await GET(makeReq());
    const orderCalls = (chain.order as ReturnType<typeof vi.fn>).mock.calls;
    expect(orderCalls[0]).toEqual(["event_date", { ascending: true }]);
  });
});
