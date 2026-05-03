import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────
// Must be declared before the module import so vitest's hoisting applies.
const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import {
  computeHealth,
  FEATURE_CONFIG,
  AUTOMATION_FEATURES,
  getLatestCronRun,
  getLeadDisputeOverview,
  getAdvisorApplicationOverview,
  getMarketplaceCampaignOverview,
  getAllFeatureOverviews,
} from "@/lib/admin/automation-metrics";

// ── Chain helper ──────────────────────────────────────────────────────────────
/**
 * Returns a fluent Supabase-style builder where every method returns `this`
 * so test code can write `.from().select().eq()` etc without setting up every
 * mock individually.  Terminal methods (`maybeSingle`, `single`) resolve with
 * the supplied result.  The chain is also thenable so `await chain` resolves
 * with the same result (handles implicit awaits like `await supabase.from(...).select(...)`).
 */
function makeChain(result: { data?: unknown; count?: number | null; error?: unknown } = {}) {
  const resolved = {
    data: result.data !== undefined ? result.data : null,
    count: result.count !== undefined ? result.count : null,
    error: result.error !== undefined ? result.error : null,
  };
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "lte", "order", "limit", "is", "in", "not", "upsert", "insert", "update"]) {
    c[m] = vi.fn(() => c);
  }
  c.maybeSingle = vi.fn(() => Promise.resolve(resolved));
  c.single = vi.fn(() => Promise.resolve(resolved));
  c.then = (
    onFulfilled: (v: unknown) => unknown,
    onRejected?: (v: unknown) => unknown,
  ) => Promise.resolve(resolved).then(onFulfilled, onRejected);
  c.catch = (onRejected: (v: unknown) => unknown) =>
    Promise.resolve(resolved).catch(onRejected);
  return c;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("computeHealth state machine", () => {
  const cadence = 24; // 24-hour expected cadence
  const warn = 50;
  const critical = 100;

  it("returns 'unknown' when no lastRun and queue under warn threshold", () => {
    expect(computeHealth(null, 0, cadence, warn, critical)).toBe("unknown");
  });

  it("returns 'unknown' when lastRun is never_run and queue under warn", () => {
    expect(
      computeHealth(
        { name: "x", status: "never_run", startedAt: null, endedAt: null, durationMs: null, stats: null, errorMessage: null, triggeredBy: null },
        0,
        cadence,
        warn,
        critical,
      ),
    ).toBe("unknown");
  });

  it("returns 'red' when pending >= queueCritical (regardless of lastRun)", () => {
    expect(computeHealth(null, 100, cadence, warn, critical)).toBe("red");
    expect(computeHealth(null, 101, cadence, warn, critical)).toBe("red");
  });

  it("returns 'red' when lastRun errored", () => {
    expect(
      computeHealth(
        { name: "x", status: "error", startedAt: new Date().toISOString(), endedAt: null, durationMs: null, stats: null, errorMessage: null, triggeredBy: "cron" },
        0,
        cadence,
        warn,
        critical,
      ),
    ).toBe("red");
  });

  it("returns 'red' when age > 2× cadence", () => {
    // 49 hours ago is > 48 (2 * 24)
    const staleTime = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
    expect(
      computeHealth(
        { name: "x", status: "ok", startedAt: staleTime, endedAt: null, durationMs: null, stats: null, errorMessage: null, triggeredBy: "cron" },
        0,
        cadence,
        warn,
        critical,
      ),
    ).toBe("red");
  });

  it("returns 'amber' when queue between warn and critical", () => {
    expect(computeHealth(null, 75, cadence, warn, critical)).toBe("amber");
  });

  it("returns 'amber' when lastRun is 'partial'", () => {
    expect(
      computeHealth(
        { name: "x", status: "partial", startedAt: new Date().toISOString(), endedAt: null, durationMs: null, stats: null, errorMessage: null, triggeredBy: "cron" },
        0,
        cadence,
        warn,
        critical,
      ),
    ).toBe("amber");
  });

  it("returns 'amber' when age > 1.25× cadence but <= 2×", () => {
    // 31h = 1.29 × 24 — between 30h (1.25×) and 48h (2×)
    const warnTime = new Date(Date.now() - 31 * 60 * 60 * 1000).toISOString();
    expect(
      computeHealth(
        { name: "x", status: "ok", startedAt: warnTime, endedAt: null, durationMs: null, stats: null, errorMessage: null, triggeredBy: "cron" },
        0,
        cadence,
        warn,
        critical,
      ),
    ).toBe("amber");
  });

  it("returns 'green' when everything is healthy and fresh", () => {
    const fresh = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    expect(
      computeHealth(
        { name: "x", status: "ok", startedAt: fresh, endedAt: null, durationMs: null, stats: null, errorMessage: null, triggeredBy: "cron" },
        0,
        cadence,
        warn,
        critical,
      ),
    ).toBe("green");
  });

  it("prioritises red queue over amber run age", () => {
    const warnTime = new Date(Date.now() - 31 * 60 * 60 * 1000).toISOString();
    expect(
      computeHealth(
        { name: "x", status: "ok", startedAt: warnTime, endedAt: null, durationMs: null, stats: null, errorMessage: null, triggeredBy: "cron" },
        200,
        cadence,
        warn,
        critical,
      ),
    ).toBe("red");
  });

  it("prioritises red status over amber queue", () => {
    expect(
      computeHealth(
        { name: "x", status: "error", startedAt: new Date().toISOString(), endedAt: null, durationMs: null, stats: null, errorMessage: null, triggeredBy: "cron" },
        75,
        cadence,
        warn,
        critical,
      ),
    ).toBe("red");
  });
});

describe("FEATURE_CONFIG + AUTOMATION_FEATURES", () => {
  it("exposes a non-empty list of features", () => {
    expect(AUTOMATION_FEATURES.length).toBeGreaterThan(5);
  });

  it("has a FEATURE_CONFIG entry for every feature in the list", () => {
    for (const f of AUTOMATION_FEATURES) {
      const cfg = FEATURE_CONFIG[f];
      expect(cfg, `missing config for ${f}`).toBeDefined();
      expect(cfg.title).toBeTruthy();
      expect(cfg.description).toBeTruthy();
      expect(cfg.slug).toBeTruthy();
      expect(cfg.key).toBe(f);
    }
  });

  it("slug values are all unique (routes under /admin/automation/<slug>)", () => {
    const slugs = AUTOMATION_FEATURES.map((f) => FEATURE_CONFIG[f].slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("getLatestCronRun", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns never_run fallback when Supabase errors", async () => {
    mockAdminFrom.mockReturnValue(
      makeChain({ data: null, error: { message: "db unavailable" } }),
    );
    const result = await getLatestCronRun("auto-resolve-disputes");
    expect(result.status).toBe("never_run");
    expect(result.name).toBe("auto-resolve-disputes");
    expect(result.startedAt).toBeNull();
  });

  it("returns never_run fallback when no row exists (empty table)", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const result = await getLatestCronRun("some-cron");
    expect(result.status).toBe("never_run");
  });

  it("maps cron_run_log row to LatestCronRun shape correctly", async () => {
    const row = {
      name: "auto-resolve-disputes",
      started_at: "2026-05-01T12:00:00Z",
      ended_at: "2026-05-01T12:05:00Z",
      duration_ms: 300_000,
      status: "ok",
      stats: { processed: 5, refunded: 2 },
      error_message: null,
      triggered_by: "cron",
    };
    mockAdminFrom.mockReturnValue(makeChain({ data: row, error: null }));
    const result = await getLatestCronRun("auto-resolve-disputes");
    expect(result.name).toBe("auto-resolve-disputes");
    expect(result.status).toBe("ok");
    expect(result.startedAt).toBe("2026-05-01T12:00:00Z");
    expect(result.durationMs).toBe(300_000);
    expect(result.stats).toEqual({ processed: 5, refunded: 2 });
    expect(result.triggeredBy).toBe("cron");
  });
});

describe("getLeadDisputeOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correct pending count and health from DB data", async () => {
    // Call sequence: pending count, recent data, cron_run_log (via getLatestCronRun)
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 12, data: null }))   // pending count
      .mockImplementationOnce(() => makeChain({ data: [], error: null }))    // recent data
      .mockImplementationOnce(() => makeChain({ data: null, error: null })); // cron run log
    const result = await getLeadDisputeOverview();
    expect(result.feature).toBe("lead_disputes");
    expect(result.pending).toBe(12);
    expect(result.display.key).toBe("lead_disputes");
    expect(["green", "amber", "red", "unknown"]).toContain(result.health);
  });

  it("aggregates recentCounts correctly for a mixed set of disputes", async () => {
    const recentData = [
      { auto_resolved_verdict: "refund", status: "approved", refunded_cents: 10000 },
      { auto_resolved_verdict: "reject", status: "rejected", refunded_cents: 0 },
      { auto_resolved_verdict: "escalate", status: "pending", refunded_cents: 0 },
      { auto_resolved_verdict: null, status: "pending", refunded_cents: 0 },
    ];
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 3, data: null }))
      .mockImplementationOnce(() => makeChain({ data: recentData, error: null }))
      .mockImplementationOnce(() => makeChain({ data: null, error: null }));
    const result = await getLeadDisputeOverview();
    expect(result.recentCounts.autoActed).toBe(2);  // refund + reject
    expect(result.recentCounts.escalated).toBe(1);  // escalate verdict
    expect(result.recentCounts.total).toBe(4);
    expect(result.recentCounts.refunded).toBe(10000);
  });

  it("exposes the cron run in lastRun when available", async () => {
    const recentStartedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min ago
    const cronRow = {
      name: "auto-resolve-disputes",
      started_at: recentStartedAt,
      ended_at: new Date(Date.now() - 29 * 60 * 1000).toISOString(),
      duration_ms: 30_000,
      status: "ok",
      stats: { processed: 3 },
      error_message: null,
      triggered_by: "cron",
    };
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 0 }))
      .mockImplementationOnce(() => makeChain({ data: [], error: null }))
      .mockImplementationOnce(() => makeChain({ data: cronRow, error: null }));
    const result = await getLeadDisputeOverview();
    expect(result.lastRun?.status).toBe("ok");
    expect(result.lastRun?.name).toBe("auto-resolve-disputes");
    expect(result.health).toBe("green");
  });
});

describe("getAdvisorApplicationOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts auto-reviewed applications in autoActed", async () => {
    const recentData = [
      { status: "approved", reviewed_by: "auto" },
      { status: "rejected", reviewed_by: "auto" },
      { status: "pending", reviewed_by: null },
    ];
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 5 }))                      // pending count
      .mockImplementationOnce(() => makeChain({ data: recentData, error: null })); // recent
    const result = await getAdvisorApplicationOverview();
    expect(result.feature).toBe("advisor_applications");
    expect(result.recentCounts.autoActed).toBe(2); // two auto-reviewed (approved + rejected)
    expect(result.recentCounts.escalated).toBe(1); // one still pending
    expect(result.recentCounts.total).toBe(3);
    expect(result.lastRun).toBeNull(); // no cron-driven
  });

  it("returns 0 counts on empty DB result", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 0 }))
      .mockImplementationOnce(() => makeChain({ data: [], error: null }));
    const result = await getAdvisorApplicationOverview();
    expect(result.pending).toBe(0);
    expect(result.recentCounts.total).toBe(0);
  });
});

describe("getMarketplaceCampaignOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns pending count and correct status breakdown", async () => {
    const recentData = [
      { status: "active" },
      { status: "active" },
      { status: "pending" },
      { status: "rejected" },
    ];
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 7 }))
      .mockImplementationOnce(() => makeChain({ data: recentData, error: null }));
    const result = await getMarketplaceCampaignOverview();
    expect(result.feature).toBe("marketplace_campaigns");
    expect(result.pending).toBe(7);
    expect(result.recentCounts.approved).toBe(2);  // active
    expect(result.recentCounts.rejected).toBe(1);
    expect(result.recentCounts.escalated).toBe(1); // pending status
    expect(result.recentCounts.autoActed).toBe(3); // active + rejected
    expect(result.recentCounts.total).toBe(4);
  });

  it("returns unknown health when there is no cron run and queue is empty", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 0 }))
      .mockImplementationOnce(() => makeChain({ data: [], error: null }));
    const result = await getMarketplaceCampaignOverview();
    // marketplace_campaigns has no cron; with empty queue and no run → unknown
    expect(result.health).toBe("unknown");
    expect(result.lastRun).toBeNull();
  });
});

describe("getAllFeatureOverviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns one entry per AUTOMATION_FEATURES key", async () => {
    // Return an empty-data chain for every Supabase call so all feature
    // functions succeed without needing exact per-feature mock ordering.
    mockAdminFrom.mockImplementation(() => makeChain({ count: 0, data: [] }));
    const results = await getAllFeatureOverviews();
    expect(results).toHaveLength(AUTOMATION_FEATURES.length);
    const keys = results.map((r) => r.feature);
    for (const f of AUTOMATION_FEATURES) {
      expect(keys).toContain(f);
    }
  });

  it("degrades to 'unknown' health when a feature function throws (safeFallback)", async () => {
    // Throw on the very first from() call so getLeadDisputeOverview crashes.
    // All other calls get empty data so the remaining 12 features succeed.
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) throw new Error("DB unavailable");
      return makeChain({ count: 0, data: [] });
    });
    const results = await getAllFeatureOverviews();
    expect(results).toHaveLength(AUTOMATION_FEATURES.length);
    const crashed = results.find((r) => r.feature === "lead_disputes");
    expect(crashed?.health).toBe("unknown");
    expect(crashed?.lastRun?.errorMessage).toContain("DB unavailable");
  });
});
