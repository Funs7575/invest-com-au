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
  getListingScamOverview,
  getTextModerationOverview,
  getLeadSlaOverview,
  getProfileGateOverview,
  getDunningOverview,
  getBrokerChangesOverview,
  getAfslExpiryOverview,
  getEmailBouncesOverview,
  getMonthlyReportsOverview,
  getQualityWeightsOverview,
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

describe("getListingScamOverview", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("aggregates auto_classified_verdict counts correctly", async () => {
    const recentData = [
      { status: "active", auto_classified_verdict: "auto_approve" },
      { status: "active", auto_classified_verdict: "auto_approve" },
      { status: "rejected", auto_classified_verdict: "auto_reject" },
      { status: "pending", auto_classified_verdict: "escalate" },
      { status: "pending", auto_classified_verdict: null },
    ];
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 3, data: null }))
      .mockImplementationOnce(() => makeChain({ data: recentData, error: null }));
    const result = await getListingScamOverview();
    expect(result.feature).toBe("listing_scam");
    expect(result.pending).toBe(3);
    expect(result.recentCounts.autoActed).toBe(3);    // 2 auto_approve + 1 auto_reject
    expect(result.recentCounts.escalated).toBe(1);
    expect(result.recentCounts.approved).toBe(2);
    expect(result.recentCounts.rejected).toBe(1);
    expect(result.recentCounts.total).toBe(5);
    expect(result.lastRun).toBeNull();               // not cron-driven
  });

  it("returns zero counts on empty data", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 0 }))
      .mockImplementationOnce(() => makeChain({ data: [], error: null }));
    const result = await getListingScamOverview();
    expect(result.pending).toBe(0);
    expect(result.recentCounts.total).toBe(0);
    expect(result.health).toBe("unknown");
  });
});

describe("getTextModerationOverview", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("merges user_reviews and professional_reviews pending counts and recent data", async () => {
    const brokerRecent = [
      { auto_moderated_verdict: "auto_publish", status: "published" },
      { auto_moderated_verdict: "escalate", status: "pending" },
    ];
    const advisorRecent = [
      { auto_moderated_verdict: "auto_reject", status: "rejected" },
    ];
    // 4 parallel from() calls: pendingBroker, pendingAdvisor, brokerRecent, advisorRecent
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 8 }))                        // user_reviews pending
      .mockImplementationOnce(() => makeChain({ count: 4 }))                        // professional_reviews pending
      .mockImplementationOnce(() => makeChain({ data: brokerRecent, error: null })) // user_reviews recent
      .mockImplementationOnce(() => makeChain({ data: advisorRecent, error: null })); // professional_reviews recent
    const result = await getTextModerationOverview();
    expect(result.feature).toBe("text_moderation");
    expect(result.pending).toBe(12);                  // 8 + 4
    expect(result.recentCounts.autoActed).toBe(2);    // auto_publish + auto_reject
    expect(result.recentCounts.escalated).toBe(1);
    expect(result.recentCounts.approved).toBe(1);     // auto_publish
    expect(result.recentCounts.rejected).toBe(1);     // auto_reject
    expect(result.recentCounts.total).toBe(3);        // 2 broker + 1 advisor
    expect(result.lastRun).toBeNull();
  });

  it("returns zero counts when both tables are empty", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 0 }))
      .mockImplementationOnce(() => makeChain({ count: 0 }))
      .mockImplementationOnce(() => makeChain({ data: [], error: null }))
      .mockImplementationOnce(() => makeChain({ data: [], error: null }));
    const result = await getTextModerationOverview();
    expect(result.pending).toBe(0);
    expect(result.recentCounts.total).toBe(0);
    expect(result.health).toBe("unknown");
  });
});

describe("getLeadSlaOverview (cronOnlyOverview)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns pending count from paused-SLA-miss professionals and lastRun from cron log", async () => {
    const cronRow = {
      name: "enforce-lead-sla",
      started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      duration_ms: 5000,
      status: "ok",
      stats: { warned1: 7 },
      error_message: null,
      triggered_by: "cron",
    };
    // queueQuery (professionals paused sla_miss) then cron_run_log
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 3 }))
      .mockImplementationOnce(() => makeChain({ data: cronRow, error: null }));
    const result = await getLeadSlaOverview();
    expect(result.feature).toBe("lead_sla");
    expect(result.pending).toBe(3);
    expect(result.lastRun?.status).toBe("ok");
    expect(result.recentCounts.autoActed).toBe(7);   // stats.warned1
    expect(result.health).toBe("green");
  });

  it("returns unknown health when cron has never run", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 0 }))
      .mockImplementationOnce(() => makeChain({ data: null, error: null })); // no cron row
    const result = await getLeadSlaOverview();
    expect(result.health).toBe("unknown");
    expect(result.recentCounts.autoActed).toBe(0);
  });
});

describe("getProfileGateOverview", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns professionals awaiting profile gate as pending", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 11 }))
      .mockImplementationOnce(() => makeChain({ data: null, error: null }));
    const result = await getProfileGateOverview();
    expect(result.feature).toBe("profile_gate_drip");
    expect(result.pending).toBe(11);
    expect(result.display.cronName).toBe("advisor-profile-gate-drip");
  });
});

describe("getDunningOverview", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns failed credit topup count as pending", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 5 }))
      .mockImplementationOnce(() => makeChain({ data: null, error: null }));
    const result = await getDunningOverview();
    expect(result.feature).toBe("advisor_dunning");
    expect(result.pending).toBe(5);
    expect(result.display.cronName).toBe("advisor-dunning");
  });
});

describe("getBrokerChangesOverview", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("counts auto-applied (non-require-admin) changes as autoActed and approved", async () => {
    const recentData = [
      { auto_applied_at: "2026-05-01T10:00:00Z", auto_applied_tier: "auto" },
      { auto_applied_at: "2026-05-01T11:00:00Z", auto_applied_tier: "reviewable" },
      { auto_applied_at: null, auto_applied_tier: "require_admin" },  // escalated
      { auto_applied_at: null, auto_applied_tier: null },              // escalated
    ];
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 2 }))
      .mockImplementationOnce(() => makeChain({ data: recentData, error: null }));
    const result = await getBrokerChangesOverview();
    expect(result.feature).toBe("broker_data_changes");
    expect(result.pending).toBe(2);
    expect(result.recentCounts.autoActed).toBe(2);   // 2 auto_applied, neither require_admin
    expect(result.recentCounts.approved).toBe(2);    // 2 rows with auto_applied_at set
    expect(result.recentCounts.escalated).toBe(2);   // require_admin + null tier
    expect(result.recentCounts.total).toBe(4);
    expect(result.lastRun).toBeNull();
  });

  it("returns zero counts on empty DB result", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 0 }))
      .mockImplementationOnce(() => makeChain({ data: [], error: null }));
    const result = await getBrokerChangesOverview();
    expect(result.pending).toBe(0);
    expect(result.recentCounts.total).toBe(0);
  });
});

describe("getAfslExpiryOverview", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns advisors with ceased/suspended AFSL as pending", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 2 }))
      .mockImplementationOnce(() => makeChain({ data: null, error: null }));
    const result = await getAfslExpiryOverview();
    expect(result.feature).toBe("afsl_expiry");
    expect(result.pending).toBe(2);
    expect(result.display.cronName).toBe("afsl-expiry-monitor");
  });
});

describe("getEmailBouncesOverview", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("uses suppression list size as pending count and stats.pulled_from_resend as autoActed", async () => {
    const cronRow = {
      name: "email-bounce-sweep",
      started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      duration_ms: 2000,
      status: "ok",
      stats: { pulled_from_resend: 14 },
      error_message: null,
      triggered_by: "cron",
    };
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 250 }))  // email_suppression_list count
      .mockImplementationOnce(() => makeChain({ data: cronRow, error: null }));
    const result = await getEmailBouncesOverview();
    expect(result.feature).toBe("email_bounces");
    expect(result.pending).toBe(250);
    expect(result.recentCounts.autoActed).toBe(14);
    expect(result.recentCounts.total).toBe(250);
    // health uses Infinity for warn/critical on pending (0 health-relevant pending) → green
    expect(result.health).toBe("green");
  });

  it("returns unknown health when cron has never run", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ count: 0 }))
      .mockImplementationOnce(() => makeChain({ data: null, error: null }));
    const result = await getEmailBouncesOverview();
    expect(result.health).toBe("unknown");
    expect(result.recentCounts.autoActed).toBe(0);
  });
});

describe("getMonthlyReportsOverview", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("always has pending=0; derives autoActed from stats.emailed and total from stats.scanned", async () => {
    const cronRow = {
      name: "monthly-advisor-reports",
      started_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      duration_ms: 60_000,
      status: "ok",
      stats: { emailed: 42, scanned: 50 },
      error_message: null,
      triggered_by: "cron",
    };
    mockAdminFrom.mockImplementationOnce(() => makeChain({ data: cronRow, error: null }));
    const result = await getMonthlyReportsOverview();
    expect(result.feature).toBe("monthly_reports");
    expect(result.pending).toBe(0);
    expect(result.recentCounts.autoActed).toBe(42);  // stats.emailed
    expect(result.recentCounts.total).toBe(50);      // stats.scanned
  });

  it("returns 0 for autoActed and total when cron stats are absent", async () => {
    mockAdminFrom.mockImplementationOnce(() => makeChain({ data: null, error: null }));
    const result = await getMonthlyReportsOverview();
    expect(result.recentCounts.autoActed).toBe(0);
    expect(result.recentCounts.total).toBe(0);
    expect(result.health).toBe("unknown");
  });
});

describe("getQualityWeightsOverview", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("derives autoActed from stats.signals_computed and total from model_version", async () => {
    const cronRow = {
      name: "lead-quality-weights",
      started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      duration_ms: 10_000,
      status: "ok",
      stats: { signals_computed: 33 },
      error_message: null,
      triggered_by: "cron",
    };
    // cron_run_log then lead_quality_weights version
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ data: cronRow, error: null }))
      .mockImplementationOnce(() => makeChain({ data: { model_version: 7 }, error: null }));
    const result = await getQualityWeightsOverview();
    expect(result.feature).toBe("quality_weights");
    expect(result.pending).toBe(0);
    expect(result.recentCounts.autoActed).toBe(33);  // stats.signals_computed
    expect(result.recentCounts.total).toBe(7);       // model_version
    expect(result.health).toBe("green");
  });

  it("returns 0 totals when DB returns null for both queries", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ data: null, error: null }))
      .mockImplementationOnce(() => makeChain({ data: null, error: null }));
    const result = await getQualityWeightsOverview();
    expect(result.recentCounts.autoActed).toBe(0);
    expect(result.recentCounts.total).toBe(0);
    expect(result.health).toBe("unknown");
  });
});
