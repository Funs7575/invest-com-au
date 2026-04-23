import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

/**
 * Exercises captureSample + rollupYesterday (the DB-facing halves
 * of lib/web-vitals). The pure classification + percentile helpers
 * are covered by web-vitals.test.ts.
 */

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

let sampleInsertError: { message: string } | null = null;
let sampleInsertThrows = false;
let samplesToReturn: Array<{
  metric: string;
  value: number;
  rating: string | null;
  page_path: string;
  device_kind: string | null;
}> = [];
let rollupFetchError: { message: string } | null = null;
let upsertError: { message: string } | null = null;

const insertCalls: Record<string, unknown>[] = [];
const upsertCalls: Record<string, unknown>[] = [];

const mockFrom = vi.fn((table: string) => {
  if (table === "web_vitals_samples") {
    return {
      insert: async (row: Record<string, unknown>) => {
        if (sampleInsertThrows) throw new Error("network dead");
        insertCalls.push(row);
        return { data: null, error: sampleInsertError };
      },
      select: () => ({
        gte: () => ({
          lte: () => ({
            limit: async () =>
              rollupFetchError
                ? { data: null, error: rollupFetchError }
                : { data: samplesToReturn, error: null },
          }),
        }),
      }),
    };
  }
  if (table === "web_vitals_daily_rollup") {
    return {
      upsert: async (row: Record<string, unknown>) => {
        upsertCalls.push(row);
        return { data: null, error: upsertError };
      },
    };
  }
  throw new Error(`unexpected table: ${table}`);
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { captureSample, rollupYesterday } from "@/lib/web-vitals";

describe("captureSample", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sampleInsertError = null;
    sampleInsertThrows = false;
    insertCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("rejects an invalid metric", async () => {
    const res = await captureSample({
      metric: "FPS" as unknown as "LCP",
      value: 100,
      pagePath: "/x",
    });
    expect(res).toEqual({ ok: false, error: "invalid_metric" });
    expect(insertCalls).toHaveLength(0);
  });

  it("rejects a non-finite or negative value", async () => {
    expect(
      await captureSample({ metric: "LCP", value: NaN, pagePath: "/x" }),
    ).toEqual({ ok: false, error: "invalid_value" });
    expect(
      await captureSample({ metric: "LCP", value: -1, pagePath: "/x" }),
    ).toEqual({ ok: false, error: "invalid_value" });
  });

  it("rejects out-of-range values per metric cap", async () => {
    // LCP max 60_000ms → 60_001 is out of range
    const res = await captureSample({ metric: "LCP", value: 60_001, pagePath: "/x" });
    expect(res).toEqual({ ok: false, error: "value_out_of_range" });
  });

  it("rejects missing or oversized page_path", async () => {
    expect(
      await captureSample({ metric: "LCP", value: 1000, pagePath: "" }),
    ).toEqual({ ok: false, error: "invalid_page_path" });
    expect(
      await captureSample({
        metric: "LCP",
        value: 1000,
        pagePath: "/" + "x".repeat(501),
      }),
    ).toEqual({ ok: false, error: "invalid_page_path" });
  });

  it("inserts a classified, hashed-session sample on happy path", async () => {
    const res = await captureSample({
      metric: "LCP",
      value: 2000,
      pagePath: "/home",
      deviceKind: "mobile",
      sessionId: "sess-123",
    });
    expect(res).toEqual({ ok: true });
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({
      metric: "LCP",
      value: 2000,
      rating: "good",
      page_path: "/home",
      device_kind: "mobile",
    });
    // sessionId is hashed (no raw session leaks to DB)
    const hash = insertCalls[0]?.session_hash as string;
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).not.toContain("sess-123");
  });

  it("defaults deviceKind to 'desktop' when omitted", async () => {
    await captureSample({ metric: "CLS", value: 0.05, pagePath: "/x" });
    expect(insertCalls[0]?.device_kind).toBe("desktop");
  });

  it("returns ok:false + error message when DB insert errors", async () => {
    sampleInsertError = { message: "constraint violation" };
    const res = await captureSample({
      metric: "CLS",
      value: 0.05,
      pagePath: "/x",
    });
    expect(res).toEqual({ ok: false, error: "constraint violation" });
  });

  it("catches thrown errors during insert", async () => {
    sampleInsertThrows = true;
    const res = await captureSample({
      metric: "CLS",
      value: 0.05,
      pagePath: "/x",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("network dead");
  });

  it("leaves session_hash null when sessionId is absent", async () => {
    await captureSample({ metric: "TTFB", value: 500, pagePath: "/x" });
    expect(insertCalls[0]?.session_hash).toBeNull();
  });
});

describe("rollupYesterday", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    samplesToReturn = [];
    rollupFetchError = null;
    upsertError = null;
    insertCalls.length = 0;
    upsertCalls.length = 0;
  });

  it("returns zeros on fetch error", async () => {
    rollupFetchError = { message: "down" };
    const r = await rollupYesterday();
    expect(r.groups).toBe(0);
    expect(r.samples).toBe(0);
    expect(r.inserted).toBe(0);
    expect(upsertCalls).toHaveLength(0);
  });

  it("returns zeros when there are no samples", async () => {
    samplesToReturn = [];
    const r = await rollupYesterday();
    expect(r.groups).toBe(0);
    expect(r.samples).toBe(0);
    expect(r.inserted).toBe(0);
  });

  it("aggregates multiple samples per (metric,page,device) into one rollup", async () => {
    samplesToReturn = [
      { metric: "LCP", value: 2000, rating: "good", page_path: "/", device_kind: "desktop" },
      { metric: "LCP", value: 2500, rating: "good", page_path: "/", device_kind: "desktop" },
      { metric: "LCP", value: 3200, rating: "needs-improvement", page_path: "/", device_kind: "desktop" },
      { metric: "LCP", value: 4500, rating: "poor", page_path: "/", device_kind: "desktop" },
      { metric: "CLS", value: 0.01, rating: "good", page_path: "/", device_kind: "mobile" },
    ];

    const r = await rollupYesterday();
    // 2 buckets (LCP desktop /, CLS mobile /), 5 samples total
    expect(r.groups).toBe(2);
    expect(r.samples).toBe(5);
    expect(r.inserted).toBe(2);
    expect(upsertCalls).toHaveLength(2);

    const lcp = upsertCalls.find(
      (c) => c.metric === "LCP" && c.device_kind === "desktop",
    );
    expect(lcp?.sample_count).toBe(4);
    // p50 of [2000,2500,3200,4500] — sorted, index floor(3*0.5)=1 → 2500
    expect(lcp?.p50).toBe(2500);
    expect(lcp?.good_pct).toBe(50);
    expect(lcp?.poor_pct).toBe(25);
  });

  it("defaults device_kind to 'desktop' when the row is null", async () => {
    samplesToReturn = [
      { metric: "LCP", value: 2000, rating: "good", page_path: "/", device_kind: null },
    ];
    await rollupYesterday();
    expect(upsertCalls[0]?.device_kind).toBe("desktop");
  });

  it("skips the inserted counter when an upsert fails, still counts the bucket", async () => {
    samplesToReturn = [
      { metric: "LCP", value: 2000, rating: "good", page_path: "/", device_kind: "desktop" },
    ];
    upsertError = { message: "constraint" };
    const r = await rollupYesterday();
    expect(r.groups).toBe(1);
    expect(r.samples).toBe(1);
    expect(r.inserted).toBe(0);
  });
});
