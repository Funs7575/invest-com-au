import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

const mockRequireCronAuth = vi.fn();
vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: (...args: unknown[]) => mockRequireCronAuth(...args),
}));

vi.mock("@/lib/cron-run-log", () => ({
  // withCronRunLog<T> unwraps { response: T } from the callback and returns T.
  withCronRunLog: vi.fn(
    async (_name: string, fn: () => Promise<{ response: unknown }>) => {
      const result = await fn();
      return result.response;
    },
  ),
}));

// Build a chainable Supabase query mock.
// Each call to supabase.from() returns a fresh chain so multiple queries
// in the same handler can return different data.
function makeChain(data: unknown, error: unknown = null) {
  const terminal = { data, error, count: Array.isArray(data) ? (data as unknown[]).length : null };
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(terminal)),
  };
  for (const m of ["select", "eq", "gte", "lt", "not", "order", "limit"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain["maybeSingle"] = vi.fn(async () => terminal);
  chain["upsert"] = vi.fn(async () => ({ data: null, error: null }));
  return chain;
}

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET } from "@/app/api/cron/invest-score/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/cron/invest-score", {
    headers: { authorization: "Bearer test-cron-secret" },
  });
}

const SNAPSHOT_ROW = { rate_bps: 450, captured_at: "2026-05-26T02:00:00Z" };
const RATE_CHANGE_ROW = { change_bps: 25 };
const METRIC_ROW = { enquiry_count: 5 };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/cron/invest-score", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null); // auth passes

    // Default mock: savings snapshots, rate changes, metrics, broker count, upsert
    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      switch (callIndex) {
        case 1: // latest snapshot batch — get captured_at
          return makeChain([SNAPSHOT_ROW]);
        case 2: // batch rates for that captured_at
          return makeChain([{ rate_bps: 450 }, { rate_bps: 420 }, { rate_bps: 480 }]);
        case 3: // rate_change_log last 30d
          return makeChain([RATE_CHANGE_ROW, RATE_CHANGE_ROW]);
        case 4: // advisor_metrics_daily last 7d
          return makeChain([METRIC_ROW, METRIC_ROW]);
        case 5: // advisor_metrics_daily days 8–30
          return makeChain([METRIC_ROW]);
        case 6: // brokers count
          return { ...makeChain(null), count: 30 };
        case 7: // upsert
          return makeChain(null);
        default:
          return makeChain([]);
      }
    });
  });

  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 200 with score on success", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json).toHaveProperty("score");
    expect(typeof json.score).toBe("number");
    expect(json.score).toBeGreaterThanOrEqual(0);
    expect(json.score).toBeLessThanOrEqual(100);
  });

  it("includes label and components in response", async () => {
    const res = await GET(makeGet());
    const json = await res.json();
    expect(json).toHaveProperty("label");
    expect(json).toHaveProperty("components");
    expect(json.components).toHaveProperty("rateLevel");
    expect(json.components).toHaveProperty("rateMomentum");
    expect(json.components).toHaveProperty("platformActivity");
    expect(json.components).toHaveProperty("marketBreadth");
  });

  it("includes date in response", async () => {
    const res = await GET(makeGet());
    const json = await res.json();
    expect(json).toHaveProperty("date");
    expect(typeof json.date).toBe("string");
    expect(json.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns 500 when upsert fails", async () => {
    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 7) return { ...makeChain(null), upsert: vi.fn(async () => ({ error: { message: "upsert failed" } })) };
      if (callIndex === 1) return makeChain([SNAPSHOT_ROW]);
      if (callIndex === 2) return makeChain([{ rate_bps: 450 }]);
      if (callIndex === 3) return makeChain([]);
      if (callIndex === 4) return makeChain([]);
      if (callIndex === 5) return makeChain([]);
      if (callIndex === 6) return { ...makeChain(null), count: 10 };
      return makeChain([]);
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("handles missing snapshot data gracefully (null avgSavingsRateBps)", async () => {
    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return makeChain([]); // no snapshots
      if (callIndex === 2) return makeChain([]);
      if (callIndex === 3) return makeChain([]);
      if (callIndex === 4) return makeChain([]);
      if (callIndex === 5) return makeChain([]);
      if (callIndex === 6) return { ...makeChain(null), count: 20 };
      return { ...makeChain(null), upsert: vi.fn(async () => ({ error: null })) };
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("handles missing rate change log gracefully", async () => {
    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return makeChain([SNAPSHOT_ROW]);
      if (callIndex === 2) return makeChain([{ rate_bps: 450 }]);
      if (callIndex === 3) return makeChain([]); // no rate changes
      if (callIndex === 4) return makeChain([METRIC_ROW]);
      if (callIndex === 5) return makeChain([METRIC_ROW]);
      if (callIndex === 6) return { ...makeChain(null), count: 25 };
      return { ...makeChain(null), upsert: vi.fn(async () => ({ error: null })) };
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
