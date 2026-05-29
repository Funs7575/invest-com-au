import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const { mockCalculateOptimalBids, mockApplyBidAdjustments } = vi.hoisted(() => ({
  // Typed return (not the inferred `never[]`) so per-test mockResolvedValueOnce
  // can supply adjustment objects without a TS2322.
  mockCalculateOptimalBids: vi.fn(
    async (..._args: unknown[]): Promise<Array<Record<string, unknown>>> => [],
  ),
  mockApplyBidAdjustments: vi.fn(async (..._args: unknown[]): Promise<number> => 0),
}));

vi.mock("@/lib/marketplace/auto-bid", () => ({
  calculateOptimalBids: mockCalculateOptimalBids,
  applyBidAdjustments: mockApplyBidAdjustments,
}));

function makeBuilder(result: unknown = { data: [], error: null, count: 0 }) {
  const builder: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "single", "maybeSingle", "filter",
    "contains", "overlaps", "like",
  ]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return builder;
}

const mockFrom = vi.fn(() => makeBuilder());
const mockRpc = vi.fn(() => makeBuilder({ data: null, error: null }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

// mock global fetch for Resend emails
const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.stubGlobal("fetch", mockFetch);

import { GET, runtime, maxDuration } from "@/app/api/cron/marketplace-stats/route";

const SECRET = "test-cron-secret-1234567890";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/marketplace-stats", {
    headers,
  }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// Default successful fetch response
function okFetch(): void {
  mockFetch.mockResolvedValue({ ok: true, status: 200 });
}

describe("GET /api/cron/marketplace-stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset both mocks to clear any unconsumed mockReturnValueOnce queue entries
    // (vi.clearAllMocks does NOT clear the once-queue in vitest v3 — mockReset does).
    mockFrom.mockReset();
    mockRpc.mockReset();
    // Restore default implementations after reset
    mockFrom.mockImplementation(() => makeBuilder());
    mockRpc.mockImplementation(() => makeBuilder({ data: null, error: null }));
    process.env.CRON_SECRET = SECRET;
    okFetch();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_API_KEY;
  });

  it("exports nodejs runtime and maxDuration = 300", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(300);
  });

  it("returns 500 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer", async () => {
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 with empty stats when no events or campaigns", async () => {
    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.statsAggregated).toBe(0);
    expect(body.budgetExhausted).toBe(0);
    expect(body.campaignsActivated).toBe(0);
    expect(body.campaignsCompleted).toBe(0);
  });

  // ── Stage 1: event aggregation ──────────────────────────────────────

  it("aggregates impression / click / conversion events and upserts stats", async () => {
    // Route call order (no events branches are skipped for non-events stages):
    // 1. campaign_events → events
    // 2. campaign_daily_stats upsert (1 per unique campaign_id)
    // 3. campaigns overBudget
    // 4. campaigns toActivate
    // 5. campaigns toComplete
    // (no digest since RESEND not set)
    // 6. rpc (already mocked)
    // (no pacing since overBudget empty)
    // 7. campaign_daily_stats weekStats (anomaly - has events)
    // 8. campaign_daily_stats 30-day for recs (section 9)
    // (no re-engagement since no RESEND)

    const events = [
      { campaign_id: 1, broker_slug: "acme", event_type: "impression", cost_cents: 0 },
      { campaign_id: 1, broker_slug: "acme", event_type: "click", cost_cents: 150 },
      { campaign_id: 1, broker_slug: "acme", event_type: "conversion", cost_cents: 0 },
      // null cost_cents → treated as 0
      { campaign_id: 1, broker_slug: "acme", event_type: "impression", cost_cents: null },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: events, error: null }))          // 1. campaign_events
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))             // 2. campaign_daily_stats upsert → no error
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))               // 3. campaigns overBudget
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))               // 4. campaigns toActivate
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))               // 5. campaigns toComplete
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))               // 7. weekStats (anomaly)
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));              // 8. 30-day stats (recs)

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.statsAggregated).toBe(1);
    const entry = body.results.find((r: { action: string; detail: string }) => r.action === "stats_aggregated");
    expect(entry?.detail).toContain("#1");
    expect(entry?.detail).toContain("$1.50");
  });

  it("aggregates events from two different campaigns into separate upserts", async () => {
    const events = [
      { campaign_id: 1, broker_slug: "acme", event_type: "click", cost_cents: 100 },
      { campaign_id: 2, broker_slug: "beta", event_type: "impression", cost_cents: 0 },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: events, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))  // upsert campaign 1
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))  // upsert campaign 2
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.statsAggregated).toBe(2);
  });

  it("skips stats_aggregated result when upsert returns an error", async () => {
    const events = [
      { campaign_id: 2, broker_slug: "acme", event_type: "click", cost_cents: 100 },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: events, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: { message: "db error" } })) // upsert fails
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.statsAggregated).toBe(0);
  });

  it("handles null cost_cents in events (treated as 0 spend)", async () => {
    const events = [
      { campaign_id: 5, broker_slug: "beta", event_type: "click", cost_cents: null },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: events, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.statsAggregated).toBe(1);
    const entry = body.results.find((r: { action: string; detail: string }) => r.action === "stats_aggregated");
    expect(entry?.detail).toContain("$0.00");
  });

  // ── Stage 2: budget exhaustion ──────────────────────────────────────

  it("auto-pauses a campaign that exceeded total_budget and inserts notification", async () => {
    // overBudget: spent >= budget → pause
    // Call order: campaign_events, campaigns overBudget, campaigns update, broker_notifications insert,
    //   campaigns toActivate, campaigns toComplete, rpc (mocked separately), campaign_daily_stats recs,
    //   broker_accounts re-engagement
    const overBudgetCampaign = {
      id: 10,
      broker_slug: "acme",
      total_spent_cents: 10000,
      total_budget_cents: 9000,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))                   // campaign_events
      .mockReturnValueOnce(makeBuilder({ data: [overBudgetCampaign], error: null })) // campaigns overBudget
      .mockReturnValueOnce(makeBuilder())                                              // update → budget_exhausted
      .mockReturnValueOnce(makeBuilder())                                              // broker_notifications insert
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))                   // campaigns toActivate
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))                   // campaigns toComplete
      // rpc handled by mockRpc
      // pacing: overBudget loop → c.total_spent >= c.total_budget → continue (skip)
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))                   // recs
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));                  // re-engagement

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.budgetExhausted).toBe(1);
    expect(body.results.some((r: { action: string }) => r.action === "budget_exhausted")).toBe(true);
    const entry = body.results.find((r: { action: string; detail: string }) => r.action === "budget_exhausted");
    expect(entry?.detail).toContain("#10");
    expect(entry?.detail).toContain("acme");
  });

  it("does NOT pause a campaign that is under budget", async () => {
    const underBudget = {
      id: 11,
      broker_slug: "acme",
      total_spent_cents: 5000,
      total_budget_cents: 9000,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [underBudget], error: null }))
      // spent < budget → no update or notification
      // pacing: 55.5% < 75% → no alert
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.budgetExhausted).toBe(0);
  });

  // ── Stage 3: campaign activation ──────────────────────────────────

  it("activates approved campaigns whose start_date has arrived", async () => {
    const toActivate = [
      { id: 20, broker_slug: "acme", name: "Spring Sale" },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))               // campaign_events
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))               // overBudget
      .mockReturnValueOnce(makeBuilder({ data: toActivate, error: null }))       // toActivate
      .mockReturnValueOnce(makeBuilder())                                          // update campaign
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))               // toComplete
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))               // recs
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));              // re-engagement

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.campaignsActivated).toBe(1);
    const entry = body.results.find((r: { action: string; detail: string }) => r.action === "campaign_activated");
    expect(entry?.detail).toContain("Spring Sale");
    expect(entry?.detail).toContain("acme");
  });

  it("activates multiple campaigns in a single run", async () => {
    const toActivate = [
      { id: 20, broker_slug: "acme", name: "Camp A" },
      { id: 21, broker_slug: "beta", name: "Camp B" },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: toActivate, error: null }))
      .mockReturnValueOnce(makeBuilder())   // update camp 20
      .mockReturnValueOnce(makeBuilder())   // update camp 21
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.campaignsActivated).toBe(2);
  });

  // ── Stage 4: campaign completion ──────────────────────────────────

  it("completes campaigns whose end_date has passed", async () => {
    const toComplete = [
      { id: 30, broker_slug: "acme", name: "Old Summer Sale", end_date: "2024-01-01" },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))               // campaign_events
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))               // overBudget
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))               // toActivate
      .mockReturnValueOnce(makeBuilder({ data: toComplete, error: null }))       // toComplete
      .mockReturnValueOnce(makeBuilder())                                          // update campaign
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))               // recs
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));              // re-engagement

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.campaignsCompleted).toBe(1);
    const entry = body.results.find((r: { action: string; detail: string }) => r.action === "campaign_completed");
    expect(entry?.detail).toContain("Old Summer Sale");
    expect(entry?.detail).toContain("2024-01-01");
    expect(entry?.detail).toContain("acme");
  });

  it("completes multiple campaigns in one run", async () => {
    const toComplete = [
      { id: 30, broker_slug: "acme", name: "Camp X", end_date: "2024-01-01" },
      { id: 31, broker_slug: "beta", name: "Camp Y", end_date: "2024-02-01" },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: toComplete, error: null }))
      .mockReturnValueOnce(makeBuilder())   // update camp 30
      .mockReturnValueOnce(makeBuilder())   // update camp 31
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.campaignsCompleted).toBe(2);
  });

  // ── Stage 5: daily digest emails ──────────────────────────────────

  it("sends digest emails when RESEND_API_KEY is set and events exist with clicks", async () => {
    // Call order with RESEND + events:
    // 1. campaign_events → events
    // 2. campaign_daily_stats upsert
    // 3. campaigns overBudget
    // 4. campaigns toActivate
    // 5. campaigns toComplete
    // 6. broker_accounts for digest (section 5 - BEFORE rpc)
    // rpc handled by mockRpc
    // 8. weekStats anomaly (section 8)
    // 9. campaign_daily_stats for recs (section 9)
    // 10. broker_accounts for re-engagement (section 10)
    process.env.RESEND_API_KEY = "re_test_123";
    const events = [
      { campaign_id: 1, broker_slug: "acme", event_type: "click", cost_cents: 200 },
      { campaign_id: 1, broker_slug: "acme", event_type: "impression", cost_cents: 0 },
    ];
    const brokerAccount = {
      broker_slug: "acme",
      email: "partner@acme.com",
      full_name: "Acme Partner",
      company_name: "Acme Pty Ltd",
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: events, error: null }))               // 1. campaign_events
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))                  // 2. upsert stats
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))                    // 3. overBudget
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))                    // 4. toActivate
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))                    // 5. toComplete
      .mockReturnValueOnce(makeBuilder({ data: [brokerAccount], error: null }))       // 6. broker_accounts (digest)
      // rpc is separate
      // 7. no pacing (overBudget empty)
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))                    // 8. weekStats
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))                    // 9. recs
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));                   // 10. broker_accounts (re-eng)

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.digestsSent).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
    // Email subject should contain click count and date info
    const callArg = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string) as {
      subject: string;
    };
    expect(callArg.subject).toContain("1 clicks");
  });

  it("uses company_name when full_name is absent for digest", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    const events = [
      { campaign_id: 1, broker_slug: "acme", event_type: "click", cost_cents: 100 },
      { campaign_id: 1, broker_slug: "acme", event_type: "impression", cost_cents: 0 },
    ];
    const brokerAccount = {
      broker_slug: "acme",
      email: "partner@acme.com",
      full_name: null,
      company_name: "Acme Pty Ltd",
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: events, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [brokerAccount], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.digestsSent).toBe(1);
    const htmlBody = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string) as {
      html: string;
    };
    expect(htmlBody.html).toContain("Acme Pty Ltd");
  });

  it("skips digest for broker account with no email", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    const events = [
      { campaign_id: 1, broker_slug: "acme", event_type: "click", cost_cents: 100 },
    ];
    const brokerAccount = {
      broker_slug: "acme",
      email: null,
      full_name: "No Email",
      company_name: null,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: events, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [brokerAccount], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.digestsSent).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips digest when broker stats have zero impressions and zero clicks", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    // Only conversions, no clicks or impressions → stats.impressions===0 && stats.clicks===0
    const events = [
      { campaign_id: 1, broker_slug: "acme", event_type: "conversion", cost_cents: 0 },
    ];
    const brokerAccount = {
      broker_slug: "acme",
      email: "partner@acme.com",
      full_name: "Acme",
      company_name: null,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: events, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [brokerAccount], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.digestsSent).toBe(0);
  });

  it("does NOT send digests when RESEND_API_KEY is absent", async () => {
    const events = [
      { campaign_id: 1, broker_slug: "acme", event_type: "click", cost_cents: 100 },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: events, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.digestsSent).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("handles digest fetch error gracefully (digestsSent stays 0, status still 200)", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    const events = [
      { campaign_id: 1, broker_slug: "acme", event_type: "click", cost_cents: 100 },
      { campaign_id: 1, broker_slug: "acme", event_type: "impression", cost_cents: 0 },
    ];
    const brokerAccount = {
      broker_slug: "acme",
      email: "partner@acme.com",
      full_name: "Acme Partner",
      company_name: null,
    };

    mockFetch.mockRejectedValueOnce(new Error("network failure"));

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: events, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [brokerAccount], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.digestsSent).toBe(0);
  });

  // ── Stage 6: rpc refresh ──────────────────────────────────────────

  it("returns placementStatsRefreshed=false when rpc returns error", async () => {
    mockRpc.mockReturnValueOnce(makeBuilder({ data: null, error: { message: "rpc failed" } }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.placementStatsRefreshed).toBe(false);
  });

  it("returns placementStatsRefreshed=true when rpc succeeds", async () => {
    // mockRpc defaults to no-error in beforeEach
    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.placementStatsRefreshed).toBe(true);
  });

  // ── Stage 7: budget pacing alerts ────────────────────────────────
  //
  // Call order for pacing: after rpc, loop over overBudget.
  //   For non-exhausted campaigns: broker_notifications count check, then insert if count=0.
  //
  // Exact from-call order (no events, one pacing campaign):
  //   1. campaign_events
  //   2. campaigns overBudget (returns [campaign])
  //   3. campaigns toActivate
  //   4. campaigns toComplete
  //   (rpc separate)
  //   5. broker_notifications count check (pacing)
  //   6. broker_notifications insert (pacing)
  //   7. campaign_daily_stats (recs)
  //   8. broker_accounts (re-engagement)

  it("fires a 90% pacing alert for a campaign at 92% spend", async () => {
    // 9200/10000 = 92% → not exhausted, pct >= 90 → alert
    const campaign = {
      id: 50,
      broker_slug: "acme",
      total_spent_cents: 9200,
      total_budget_cents: 10000,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))              // 1. campaign_events
      .mockReturnValueOnce(makeBuilder({ data: [campaign], error: null }))      // 2. overBudget
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))              // 3. toActivate
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))              // 4. toComplete
      // rpc separate
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))              // 5. alert check (90%)
      .mockReturnValueOnce(makeBuilder())                                         // 6. insert alert
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))              // 7. recs
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));             // 8. re-engagement

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.pacingAlerts).toBe(1);
    expect(body.results.some((r: { action: string }) => r.action === "budget_pacing_alert")).toBe(true);
    const entry = body.results.find((r: { action: string; detail: string }) => r.action === "budget_pacing_alert");
    expect(entry?.detail).toContain("90%");
  });

  it("fires a 75% pacing alert (not 90%) for a campaign at 80% spend", async () => {
    // 8000/10000 = 80% → pct < 90 but >= 75
    const campaign = {
      id: 51,
      broker_slug: "beta",
      total_spent_cents: 8000,
      total_budget_cents: 10000,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [campaign], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      // rpc separate
      // 80 < 90 → skip 90% threshold, check 75% next
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))   // 75% alert not yet sent
      .mockReturnValueOnce(makeBuilder())                              // insert 75% alert
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.pacingAlerts).toBe(1);
    const entry = body.results.find((r: { action: string; detail: string }) => r.action === "budget_pacing_alert");
    expect(entry?.detail).toContain("75%");
  });

  it("skips pacing alert when already sent (count > 0)", async () => {
    const campaign = {
      id: 52,
      broker_slug: "acme",
      total_spent_cents: 9500,
      total_budget_cents: 10000,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [campaign], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      // rpc separate
      .mockReturnValueOnce(makeBuilder({ count: 1, error: null }))   // already sent at 90%
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.pacingAlerts).toBe(0);
  });

  // ── Stage 8: anomaly detection ───────────────────────────────────
  //
  // Call order with events + weekStats:
  //   1. campaign_events → events
  //   2. campaign_daily_stats upsert(s)
  //   3. campaigns overBudget
  //   4. campaigns toActivate
  //   5. campaigns toComplete
  //   (RESEND not set → skip digest)
  //   rpc separate
  //   (pacing: overBudget empty → skip)
  //   6. campaign_daily_stats weekStats
  //   For each anomaly: broker_notifications insert
  //   7. campaign_daily_stats 30-day (recs)
  //   8. broker_accounts re-engagement

  it("detects CTR drop anomaly: yesterdayCtr < avgCtr*0.5 with >= 50 impressions", async () => {
    // Yesterday: campaign 1, 99 impressions + 1 click = 1% CTR
    // 7-day avg across 3 days: 30 clicks / 30 impressions = avg CTR 100%
    // yesterdayCtr (0.01) < avgCtr (1.0) * 0.5 = 0.5 → CTR drop; impressions=99 >= 50
    const events = [
      { campaign_id: 1, broker_slug: "acme", event_type: "click", cost_cents: 100 },
      ...Array.from({ length: 99 }, () => ({
        campaign_id: 1,
        broker_slug: "acme",
        event_type: "impression",
        cost_cents: 0,
      })),
    ];

    const weekStats = [
      { campaign_id: 1, broker_slug: "acme", clicks: 10, impressions: 10, conversions: 0 },
      { campaign_id: 1, broker_slug: "acme", clicks: 10, impressions: 10, conversions: 0 },
      { campaign_id: 1, broker_slug: "acme", clicks: 10, impressions: 10, conversions: 0 },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: events, error: null }))            // 1. campaign_events
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))              // 2. upsert
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))                // 3. overBudget
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))                // 4. toActivate
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))                // 5. toComplete
      // rpc separate
      .mockReturnValueOnce(makeBuilder({ data: weekStats, error: null }))         // 6. weekStats
      .mockReturnValueOnce(makeBuilder())                                           // CTR drop insert
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))                // 7. recs
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));               // 8. re-engagement

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.anomalyAlerts).toBeGreaterThanOrEqual(1);
    expect(body.results.some((r: { action: string }) => r.action === "anomaly_ctr_drop")).toBe(true);
  });

  it("detects zero-clicks warning: 0 clicks with >= 100 impressions", async () => {
    // 120 impressions, 0 clicks, campaign has >= 3 days of 7-day stats
    const events = Array.from({ length: 120 }, () => ({
      campaign_id: 7,
      broker_slug: "gamma",
      event_type: "impression",
      cost_cents: 0,
    }));
    const weekStats = [
      { campaign_id: 7, broker_slug: "gamma", clicks: 5, impressions: 100, conversions: 0 },
      { campaign_id: 7, broker_slug: "gamma", clicks: 5, impressions: 100, conversions: 0 },
      { campaign_id: 7, broker_slug: "gamma", clicks: 5, impressions: 100, conversions: 0 },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: events, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      // rpc separate
      .mockReturnValueOnce(makeBuilder({ data: weekStats, error: null }))
      .mockReturnValueOnce(makeBuilder())   // zero-clicks insert
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.anomalyAlerts).toBeGreaterThanOrEqual(1);
  });

  it("detects conversion spike: conversions > 2× daily average", async () => {
    // Yesterday: 10 conversions, 20 clicks
    // 7-day avg: 3 rows × 1 conversion = avg 1/day; 10 > 1 * 2 → spike
    const events = [
      ...Array.from({ length: 20 }, () => ({
        campaign_id: 3,
        broker_slug: "delta",
        event_type: "click",
        cost_cents: 100,
      })),
      ...Array.from({ length: 10 }, () => ({
        campaign_id: 3,
        broker_slug: "delta",
        event_type: "conversion",
        cost_cents: 0,
      })),
    ];
    const weekStats = [
      { campaign_id: 3, broker_slug: "delta", clicks: 20, impressions: 200, conversions: 1 },
      { campaign_id: 3, broker_slug: "delta", clicks: 20, impressions: 200, conversions: 1 },
      { campaign_id: 3, broker_slug: "delta", clicks: 20, impressions: 200, conversions: 1 },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: events, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      // rpc separate
      .mockReturnValueOnce(makeBuilder({ data: weekStats, error: null }))
      .mockReturnValueOnce(makeBuilder())   // spike insert
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.anomalyAlerts).toBeGreaterThanOrEqual(1);
  });

  it("skips anomaly detection entirely when yesterdayEvents is empty", async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.anomalyAlerts).toBe(0);
  });

  it("skips anomaly for campaign with fewer than 3 days of week stats", async () => {
    const events = [
      { campaign_id: 1, broker_slug: "acme", event_type: "click", cost_cents: 100 },
    ];
    // Only 2 rows (days < 3) → `if (!avg || avg.days < 3) continue`
    const weekStats = [
      { campaign_id: 1, broker_slug: "acme", clicks: 5, impressions: 10, conversions: 0 },
      { campaign_id: 1, broker_slug: "acme", clicks: 5, impressions: 10, conversions: 0 },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: events, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      // rpc separate
      .mockReturnValueOnce(makeBuilder({ data: weekStats, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.anomalyAlerts).toBe(0);
  });

  // ── Stage 9: campaign recommendations ───────────────────────────
  //
  // Call order (no events):
  //   1. campaign_events
  //   2. campaigns overBudget
  //   3. campaigns toActivate
  //   4. campaigns toComplete
  //   rpc separate
  //   5. campaign_daily_stats 30-day (recs)
  //   For each campaign with clicks >= 20:
  //     6. broker_notifications count check
  //     7. broker_notifications insert (if rec sent)
  //   8. broker_accounts re-engagement (no RESEND → skipped entirely)

  it("sends landing-page recommendation: ctr > 3% and convRate < 1% and clicks >= 50", async () => {
    // clicks=60, impressions=1500 → ctr=4%; conversions=0 → convRate=0%
    const stats = [
      { campaign_id: 100, broker_slug: "acme", clicks: 60, impressions: 1500, conversions: 0, spend_cents: 1200 },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))               // 1. campaign_events
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))               // 2. overBudget
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))               // 3. toActivate
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))               // 4. toComplete
      // rpc separate
      .mockReturnValueOnce(makeBuilder({ data: stats, error: null }))            // 5. 30-day stats
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))               // 6. recent rec check
      .mockReturnValueOnce(makeBuilder());                                         // 7. insert rec

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.recommendationsSent).toBe(1);
  });

  it("sends low-CTR recommendation: ctr < 1% and impressions >= 500 and clicks >= 20", async () => {
    // clicks=5, impressions=1000 → ctr=0.5%; impressions=1000>=500; clicks=5 < 20 fails
    // Need clicks>=20: clicks=5, impressions=1000 with 20 rows of 1 click each = 20 total clicks
    // Actually it's row-level: the route aggregates per campaign. Use single row:
    // clicks=20, impressions=5000 → 0.4% ctr < 1%; impressions=5000>=500; clicks=20 >=20 ✓
    const stats = [
      { campaign_id: 201, broker_slug: "beta", clicks: 20, impressions: 5000, conversions: 0, spend_cents: 500 },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      // rpc separate
      .mockReturnValueOnce(makeBuilder({ data: stats, error: null }))
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(makeBuilder());

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.recommendationsSent).toBe(1);
  });

  it("sends high-CPC recommendation: cpc > $3.00 and clicks >= 30", async () => {
    // spend=30000 cents=$300, clicks=30 → cpc=$10 > $3; ctr=30/100=30% > 3 → would hit landing page first
    // To hit high-CPC path only: need ctr <= 3 or clicks < 50 for landing page to be skipped,
    // and ctr >= 1 for low-CTR to be skipped.
    // clicks=30, impressions=300 → ctr=10% (>3%), clicks<50 → landing page: ctr>3 but clicks<50 → skip
    // ctr=1.5% → 30/2000: ctr < 3 → landing page condition fails; ctr >= 1 → low-CTR condition fails; cpc high → hits
    // clicks=30, impressions=2000 → ctr=1.5%; spend=30000 → cpc=$10 > $3 ✓
    const stats = [
      { campaign_id: 300, broker_slug: "delta", clicks: 30, impressions: 2000, conversions: 0, spend_cents: 30000 },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      // rpc separate
      .mockReturnValueOnce(makeBuilder({ data: stats, error: null }))
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(makeBuilder());

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.recommendationsSent).toBe(1);
  });

  it("skips recommendation when a recent one was already sent in the last 7 days", async () => {
    const stats = [
      { campaign_id: 300, broker_slug: "delta", clicks: 30, impressions: 2000, conversions: 0, spend_cents: 30000 },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      // rpc separate
      .mockReturnValueOnce(makeBuilder({ data: stats, error: null }))
      .mockReturnValueOnce(makeBuilder({ count: 1, error: null }));   // already sent

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.recommendationsSent).toBe(0);
  });

  it("skips recommendation when clicks < 20 (insufficient data)", async () => {
    const stats = [
      { campaign_id: 301, broker_slug: "delta", clicks: 5, impressions: 1000, conversions: 0, spend_cents: 100 },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      // rpc separate
      .mockReturnValueOnce(makeBuilder({ data: stats, error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.recommendationsSent).toBe(0);
  });

  // ── Stage 10: re-engagement ───────────────────────────────────────
  //
  // Call order (RESEND set, no events):
  //   1. campaign_events
  //   2. campaigns overBudget
  //   3. campaigns toActivate
  //   4. campaigns toComplete
  //   rpc separate
  //   5. campaign_daily_stats (recs - empty)
  //   6. broker_accounts re-engagement
  //   For each broker with email:
  //     7. broker_notifications recent re-eng count
  //     8. campaigns recent count
  //     9. campaign_events recent count
  //     If inactive && daysSinceLogin > 14:
  //       10. broker_notifications insert
  //       (fetch call)

  it("sends re-engagement email to inactive broker with RESEND_API_KEY set", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    const broker = {
      broker_slug: "oldbroker",
      email: "old@broker.com",
      full_name: "Old Broker",
      company_name: null,
      last_login_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))          // 1. campaign_events
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))          // 2. overBudget
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))          // 3. toActivate
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))          // 4. toComplete
      // rpc separate
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))          // 5. recs
      .mockReturnValueOnce(makeBuilder({ data: [broker], error: null }))    // 6. broker_accounts
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))          // 7. re-eng count
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))          // 8. campaigns count
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))          // 9. events count
      .mockReturnValueOnce(makeBuilder());                                    // 10. insert notification

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.reEngagementsSent).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
    expect(body.results.some((r: { action: string }) => r.action === "re_engagement")).toBe(true);
    const entry = body.results.find((r: { action: string; detail: string }) => r.action === "re_engagement");
    expect(entry?.detail).toContain("oldbroker");
  });

  it("uses broker_slug as name for re-engagement when full_name and company_name are null", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    const broker = {
      broker_slug: "slugonly",
      email: "slug@broker.com",
      full_name: null,
      company_name: null,
      last_login_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [broker], error: null }))
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(makeBuilder());

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.reEngagementsSent).toBe(1);
    const callBody = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string) as {
      subject: string;
    };
    expect(callBody.subject).toContain("slugonly");
  });

  it("skips re-engagement when broker has no email", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    const broker = {
      broker_slug: "nomail",
      email: null,
      full_name: "No Mail",
      company_name: null,
      last_login_at: null,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [broker], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.reEngagementsSent).toBe(0);
  });

  it("skips re-engagement when broker had a recent notification (count > 0)", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    const broker = {
      broker_slug: "active",
      email: "active@broker.com",
      full_name: "Active Broker",
      company_name: null,
      last_login_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [broker], error: null }))
      .mockReturnValueOnce(makeBuilder({ count: 1, error: null }));   // already sent this month

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.reEngagementsSent).toBe(0);
  });

  it("skips re-engagement when broker logged in within last 14 days", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    const broker = {
      broker_slug: "recent",
      email: "recent@broker.com",
      full_name: null,
      company_name: "Recent Co",
      last_login_at: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [broker], error: null }))
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))   // no recent notification
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))   // no recent campaigns
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }));  // no recent events

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.reEngagementsSent).toBe(0);
  });

  it("skips re-engagement when broker has recent campaigns (isInactive=false)", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    const broker = {
      broker_slug: "withcampaign",
      email: "wc@broker.com",
      full_name: null,
      company_name: null,
      last_login_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [broker], error: null }))
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))   // no re-eng notification
      .mockReturnValueOnce(makeBuilder({ count: 1, error: null }))   // has recent campaign → not inactive
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }));  // events count (still checked)

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.reEngagementsSent).toBe(0);
  });

  it("does not run re-engagement block when RESEND_API_KEY is absent", async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.reEngagementsSent).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("handles re-engagement fetch error gracefully (reEngagementsSent stays 0, status 200)", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    const broker = {
      broker_slug: "errbroker",
      email: "err@broker.com",
      full_name: "Err Broker",
      company_name: null,
      last_login_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    };

    mockFetch.mockRejectedValueOnce(new Error("fetch failed"));

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [broker], error: null }))
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(makeBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(makeBuilder());

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reEngagementsSent).toBe(0);
  });

  // ── Stage 11: auto-bid ───────────────────────────────────────────

  it("reports auto_bid_adjusted when calculateOptimalBids returns adjustments", async () => {
    const adjustment = {
      campaign_id: 99,
      broker_slug: "acme",
      old_bid_cents: 100,
      new_bid_cents: 150,
      reason: "cpa_below_target_increasing_bid",
    };
    mockCalculateOptimalBids.mockResolvedValueOnce([adjustment]);
    mockApplyBidAdjustments.mockResolvedValueOnce(1);

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.autoBidAdjustments).toBe(1);
    expect(body.results.some((r: { action: string }) => r.action === "auto_bid_adjusted")).toBe(true);
    const entry = body.results.find((r: { action: string; detail: string }) => r.action === "auto_bid_adjusted");
    expect(entry?.detail).toContain("$1.00");
    expect(entry?.detail).toContain("$1.50");
    expect(entry?.detail).toContain("cpa_below_target_increasing_bid");
  });

  it("records auto_bid_error when calculateOptimalBids throws an Error", async () => {
    mockCalculateOptimalBids.mockRejectedValueOnce(new Error("bid calc failed"));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.autoBidAdjustments).toBe(0);
    expect(body.results.some((r: { action: string }) => r.action === "auto_bid_error")).toBe(true);
    const entry = body.results.find((r: { action: string; detail: string }) => r.action === "auto_bid_error");
    expect(entry?.detail).toContain("bid calc failed");
  });

  it("records auto_bid_error with 'Unknown error' when non-Error is thrown", async () => {
    mockCalculateOptimalBids.mockRejectedValueOnce("plain string error");

    const res = await GET(authedReq());
    const body = await res.json();
    expect(
      body.results.some(
        (r: { action: string; detail: string }) =>
          r.action === "auto_bid_error" && r.detail === "Unknown error",
      ),
    ).toBe(true);
  });

  it("response always includes a valid timestamp field", async () => {
    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.timestamp).toBeDefined();
    expect(new Date(body.timestamp as string).getFullYear()).toBeGreaterThan(2020);
  });
});
