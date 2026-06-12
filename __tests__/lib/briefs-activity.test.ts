import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

// Table-aware admin mock with a per-call result queue (count + data).
type QueuedResult = { data?: unknown; error?: unknown; count?: number | null };
const { tableQueues, mockFrom, upsertCalls } = vi.hoisted(() => {
  const tableQueues = new Map<string, QueuedResult[]>();
  const upsertCalls: { table: string; rows: unknown; options: unknown }[] = [];
  function makeBuilder(table: string, result: QueuedResult) {
    const b: Record<string, unknown> = {};
    for (const m of ["select","insert","update","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle"]) {
      b[m] = vi.fn(() => b);
    }
    b.upsert = vi.fn((rows: unknown, options: unknown) => {
      upsertCalls.push({ table, rows, options });
      return b;
    });
    b.then = (cb: (v: unknown) => unknown) =>
      Promise.resolve(cb({ data: null, error: null, count: null, ...result }));
    return b;
  }
  const mockFrom = vi.fn((table: string) => {
    const queue = tableQueues.get(table);
    const result = queue && queue.length > 0 ? queue.shift()! : {};
    return makeBuilder(table, result);
  });
  return { tableQueues, mockFrom, upsertCalls };
});
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  medianAcceptHours,
  recordBriefReach,
  recordBriefView,
  getBriefActivity,
  getMedianAcceptHours,
  clearMedianCacheForTests,
  MEDIAN_MIN_SAMPLE,
} from "@/lib/briefs/activity";

function queue(table: string, ...results: QueuedResult[]) {
  tableQueues.set(table, [...(tableQueues.get(table) ?? []), ...results]);
}

function acceptRow(hours: number) {
  const created = new Date("2026-06-01T00:00:00.000Z");
  return {
    created_at: created.toISOString(),
    accepted_at: new Date(created.getTime() + hours * 3_600_000).toISOString(),
  };
}

describe("medianAcceptHours (pure)", () => {
  it("returns null for empty input", () => {
    expect(medianAcceptHours([])).toBeNull();
  });

  it("returns the middle value for odd-length input", () => {
    expect(medianAcceptHours([acceptRow(2), acceptRow(50), acceptRow(6)])).toBe(6);
  });

  it("averages the middle pair for even-length input", () => {
    expect(medianAcceptHours([acceptRow(2), acceptRow(4), acceptRow(8), acceptRow(100)])).toBe(6);
  });

  it("filters negative/garbage deltas and floors at 1 hour", () => {
    const garbage = { created_at: "2026-06-02T00:00:00.000Z", accepted_at: "2026-06-01T00:00:00.000Z" };
    expect(medianAcceptHours([garbage])).toBeNull();
    expect(medianAcceptHours([acceptRow(0.2)])).toBe(1);
  });
});

describe("recordBriefReach", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableQueues.clear();
    upsertCalls.length = 0;
  });

  it("no-ops on an empty id list", async () => {
    await recordBriefReach([], 42);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("batch-upserts one reached row per brief with ignoreDuplicates", async () => {
    await recordBriefReach([1, 2, 3], 42);
    expect(upsertCalls).toHaveLength(1);
    const call = upsertCalls[0]!;
    expect(call.table).toBe("brief_views");
    expect(call.rows).toEqual([
      { brief_id: 1, professional_id: 42, kind: "reached" },
      { brief_id: 2, professional_id: 42, kind: "reached" },
      { brief_id: 3, professional_id: 42, kind: "reached" },
    ]);
    expect(call.options).toMatchObject({ ignoreDuplicates: true });
  });
});

describe("recordBriefView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableQueues.clear();
    upsertCalls.length = 0;
  });

  it("reports the first distinct adviser view of a brief", async () => {
    // upsert result, then count=1
    queue("brief_views", { data: null }, { count: 1 });
    const res = await recordBriefView(7, 42);
    expect(res.firstViewOfBrief).toBe(true);
  });

  it("is not 'first' when other advisers already viewed", async () => {
    queue("brief_views", { data: null }, { count: 3 });
    const res = await recordBriefView(7, 42);
    expect(res.firstViewOfBrief).toBe(false);
  });

  it("degrades to false when the table is unavailable", async () => {
    queue("brief_views", { error: { message: "missing" } });
    const res = await recordBriefView(7, 42);
    expect(res.firstViewOfBrief).toBe(false);
  });
});

describe("getBriefActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableQueues.clear();
  });

  it("returns reached/viewed counts", async () => {
    queue("brief_views", { count: 14 }, { count: 3 });
    expect(await getBriefActivity(7)).toEqual({ reached: 14, viewed: 3 });
  });

  it("degrades to zeros on error", async () => {
    queue("brief_views", { error: { message: "missing" } });
    expect(await getBriefActivity(7)).toEqual({ reached: 0, viewed: 0 });
  });
});

describe("getMedianAcceptHours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableQueues.clear();
    clearMedianCacheForTests();
  });

  it("computes the template median when the sample is big enough", async () => {
    queue("advisor_auctions", {
      data: [acceptRow(2), acceptRow(4), acceptRow(6), acceptRow(8), acceptRow(10)],
    });
    expect(await getMedianAcceptHours("smsf_property")).toBe(6);
  });

  it("falls back to the all-templates median below the minimum sample", async () => {
    // Template query returns a thin sample, then the all-templates query.
    queue(
      "advisor_auctions",
      { data: [acceptRow(2)] },
      { data: Array.from({ length: MEDIAN_MIN_SAMPLE }, () => acceptRow(12)) },
    );
    expect(await getMedianAcceptHours("smsf_property")).toBe(12);
  });

  it("returns null when even the fallback sample is too thin, and caches", async () => {
    queue("advisor_auctions", { data: [acceptRow(2)] }, { data: [] });
    expect(await getMedianAcceptHours("tax")).toBeNull();
    // Cached: no further queries on the repeat call.
    const callsAfterFirst = mockFrom.mock.calls.length;
    expect(await getMedianAcceptHours("tax")).toBeNull();
    expect(mockFrom.mock.calls.length).toBe(callsAfterFirst);
  });
});
