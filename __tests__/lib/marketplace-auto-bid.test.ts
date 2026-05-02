import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Configurable DB state — reset in beforeEach
let campaignsResult: { data: CampaignRow[] | null; error: { message: string } | null } = {
  data: [],
  error: null,
};
let statsResult: { data: StatRow[] | null; error: { message: string } | null } = {
  data: [],
  error: null,
};
let campaignUpdateError: { message: string } | null = null;

const notificationInserts: unknown[] = [];
const campaignUpdatePayloads: Record<string, unknown>[] = [];

const mockFrom = vi.fn((table: string) => {
  if (table === "campaigns") {
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            not: () => Promise.resolve(campaignsResult),
          }),
        }),
      }),
      update: (payload: Record<string, unknown>) => {
        campaignUpdatePayloads.push(payload);
        return {
          eq: () => ({
            eq: () => Promise.resolve({ error: campaignUpdateError }),
          }),
        };
      },
    };
  }
  if (table === "campaign_daily_stats") {
    return {
      select: () => ({
        in: () => ({
          gte: () => Promise.resolve(statsResult),
        }),
      }),
    };
  }
  if (table === "broker_notifications") {
    return {
      insert: (data: unknown) => {
        notificationInserts.push(data);
        return Promise.resolve({ data: null, error: null });
      },
    };
  }
  throw new Error(`Unexpected table in mock: ${table}`);
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  calculateOptimalBids,
  applyBidAdjustments,
  type BidAdjustment,
} from "@/lib/marketplace/auto-bid";

// ── Types ─────────────────────────────────────────────────────────────────────

type CampaignRow = {
  id: number;
  broker_slug: string;
  rate_cents: number;
  target_cpa_cents: number;
  auto_bid_min_cents: number | null;
  auto_bid_max_cents: number | null;
  auto_bid_current_cents: number | null;
  created_at: string;
};

type StatRow = {
  campaign_id: number;
  clicks: number;
  conversions: number | null;
  spend_cents: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function campaign(overrides: Partial<CampaignRow> = {}): CampaignRow {
  return {
    id: 1,
    broker_slug: "commsec",
    rate_cents: 100,
    target_cpa_cents: 1000,
    auto_bid_min_cents: 5,
    auto_bid_max_cents: 1000,
    auto_bid_current_cents: 100,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/** Build N identical daily-stat rows for a campaign. */
function stats(
  campaignId: number,
  days: number,
  clicksPerDay: number,
  conversionsPerDay: number,
  spendCentsPerDay: number
): StatRow[] {
  return Array.from({ length: days }, () => ({
    campaign_id: campaignId,
    clicks: clicksPerDay,
    conversions: conversionsPerDay,
    spend_cents: spendCentsPerDay,
  }));
}

function makeAdj(overrides: Partial<BidAdjustment> = {}): BidAdjustment {
  return {
    campaign_id: 1,
    broker_slug: "commsec",
    old_bid_cents: 100,
    new_bid_cents: 150,
    reason: "optimal_bid_adjustment",
    metrics: {
      historical_cpa_cents: 800,
      target_cpa_cents: 1000,
      clicks_30d: 50,
      conversions_30d: 10,
      conversion_rate: 20,
    },
    ...overrides,
  };
}

// ── calculateOptimalBids ──────────────────────────────────────────────────────

describe("calculateOptimalBids", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    campaignsResult = { data: [], error: null };
    statsResult = { data: [], error: null };
    campaignUpdateError = null;
    notificationInserts.length = 0;
    campaignUpdatePayloads.length = 0;
  });

  it("returns empty array when there are no active target-cpa campaigns", async () => {
    const result = await calculateOptimalBids();
    expect(result).toEqual([]);
  });

  it("returns empty array and logs error when campaigns query fails", async () => {
    campaignsResult = { data: null, error: { message: "db timeout" } };
    const result = await calculateOptimalBids();
    expect(result).toEqual([]);
  });

  it("returns empty array and logs error when stats query fails", async () => {
    campaignsResult = { data: [campaign()], error: null };
    statsResult = { data: null, error: { message: "stats timeout" } };
    const result = await calculateOptimalBids();
    expect(result).toEqual([]);
  });

  it("conservative bid when campaign has no historical stats at all", async () => {
    // No stats rows → agg undefined → insufficient data path.
    // currentBid=50, conservativeBid = max(round(1000*0.1), 5) = 100 → push adjustment
    const c = campaign({ auto_bid_current_cents: 50, rate_cents: 50 });
    campaignsResult = { data: [c], error: null };
    statsResult = { data: [], error: null };
    const result = await calculateOptimalBids();
    expect(result).toHaveLength(1);
    expect(result[0].new_bid_cents).toBe(100);
    expect(result[0].old_bid_cents).toBe(50);
    expect(result[0].reason).toBe("insufficient_data_conservative_bid");
    expect(result[0].metrics.conversion_rate).toBe(0);
    expect(result[0].metrics.historical_cpa_cents).toBeNull();
  });

  it("conservative bid when stats span fewer than 7 days", async () => {
    const c = campaign({ auto_bid_current_cents: 50, rate_cents: 50 });
    campaignsResult = { data: [c], error: null };
    statsResult = { data: stats(1, 3, 10, 0, 500), error: null }; // 3 rows < 7 days
    const result = await calculateOptimalBids();
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe("insufficient_data_conservative_bid");
    expect(result[0].metrics.clicks_30d).toBe(30); // 3 × 10
  });

  it("conservative bid when total clicks are fewer than 20", async () => {
    // 10 days but only 1 click/day = 10 total → < 20 threshold
    const c = campaign({ auto_bid_current_cents: 50, rate_cents: 50 });
    campaignsResult = { data: [c], error: null };
    statsResult = { data: stats(1, 10, 1, 0, 100), error: null };
    const result = await calculateOptimalBids();
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe("insufficient_data_conservative_bid");
  });

  it("no adjustment when conservative bid equals current bid", async () => {
    // currentBid = 100; conservativeBid = max(round(1000*0.1), 5) = 100 → no change
    const c = campaign({ auto_bid_current_cents: 100, rate_cents: 100 });
    campaignsResult = { data: [c], error: null };
    statsResult = { data: [], error: null };
    const result = await calculateOptimalBids();
    expect(result).toHaveLength(0);
  });

  it("falls back to rate_cents as current bid when auto_bid_current_cents is null", async () => {
    const c = campaign({ auto_bid_current_cents: null, rate_cents: 50 });
    campaignsResult = { data: [c], error: null };
    statsResult = { data: [], error: null };
    const result = await calculateOptimalBids();
    // currentBid = rate_cents = 50; conservativeBid = 100 → adjustment
    expect(result).toHaveLength(1);
    expect(result[0].old_bid_cents).toBe(50);
  });

  it("calculates optimal bid = target_cpa × conversion_rate", async () => {
    // 10 days, 5 clicks/day = 50 clicks, 1 conv/day = 10 conversions
    // convRate = 10/50 = 0.2; optimalBid = round(1000 * 0.2) = 200
    // 25% cap: maxIncrease = 125 → capped to 125
    // spend = 10 × 800 = 8000; historicalCpa = 8000/10 = 800 (not outside 80–120% band)
    const c = campaign({ auto_bid_current_cents: 100 });
    campaignsResult = { data: [c], error: null };
    statsResult = { data: stats(1, 10, 5, 1, 800), error: null };
    const result = await calculateOptimalBids();
    expect(result).toHaveLength(1);
    expect(result[0].new_bid_cents).toBe(125); // capped at +25%
    expect(result[0].reason).toBe("optimal_bid_adjustment");
    expect(result[0].metrics.conversion_rate).toBe(20); // 20.00%
    expect(result[0].metrics.clicks_30d).toBe(50);
    expect(result[0].metrics.conversions_30d).toBe(10);
  });

  it("caps bid increase at 25% of current bid", async () => {
    // High convRate → optimalBid far above current; gets capped at +25%
    // 10 days, 10 clicks/day = 100 clicks, 5 conv/day = 50 conv → convRate 0.5
    // optimalBid = 500; maxIncrease = round(100 * 1.25) = 125
    const c = campaign({ auto_bid_current_cents: 100 });
    campaignsResult = { data: [c], error: null };
    statsResult = { data: stats(1, 10, 10, 5, 500), error: null };
    const result = await calculateOptimalBids();
    expect(result).toHaveLength(1);
    expect(result[0].new_bid_cents).toBe(125);
  });

  it("caps bid decrease at 25% of current bid when no conversions", async () => {
    // 10 days, 3 clicks/day = 30 clicks, 0 conversions
    // 0 conversions → optimalBid = max(round(currentBid * 0.75), minBid) = max(75, 5) = 75
    // maxDecrease = round(100 * 0.75) = 75 → optimalBid unchanged at 75
    const c = campaign({ auto_bid_current_cents: 100 });
    campaignsResult = { data: [c], error: null };
    statsResult = { data: stats(1, 10, 3, 0, 0), error: null };
    const result = await calculateOptimalBids();
    expect(result).toHaveLength(1);
    expect(result[0].new_bid_cents).toBe(75);
    expect(result[0].reason).toBe("no_conversions_reducing_bid");
  });

  it("clamps bid to auto_bid_min_cents lower bound", async () => {
    // Setup: currentBid=20, minBid=15. With 0 convs → optimalBid = max(round(20*0.75),15) = 15
    const c = campaign({
      auto_bid_current_cents: 20,
      rate_cents: 20,
      auto_bid_min_cents: 15,
      auto_bid_max_cents: 200,
      target_cpa_cents: 100,
    });
    campaignsResult = { data: [c], error: null };
    statsResult = { data: stats(1, 10, 3, 0, 0), error: null };
    const result = await calculateOptimalBids();
    expect(result).toHaveLength(1);
    expect(result[0].new_bid_cents).toBe(15);
  });

  it("clamps bid to auto_bid_max_cents upper bound", async () => {
    // maxBid=110: optimalBid after 25% cap = 125; clamped to 110
    const c = campaign({
      auto_bid_current_cents: 100,
      auto_bid_max_cents: 110,
    });
    campaignsResult = { data: [c], error: null };
    statsResult = { data: stats(1, 10, 10, 5, 500), error: null };
    const result = await calculateOptimalBids();
    expect(result).toHaveLength(1);
    expect(result[0].new_bid_cents).toBe(110);
  });

  it("defaults max bid to target_cpa_cents when auto_bid_max_cents is null", async () => {
    // targetCpa=1000, maxBid=null → maxBid defaults to targetCpa=1000
    const c = campaign({ auto_bid_current_cents: 100, auto_bid_max_cents: null });
    campaignsResult = { data: [c], error: null };
    statsResult = { data: stats(1, 10, 10, 5, 500), error: null };
    const result = await calculateOptimalBids();
    expect(result).toHaveLength(1);
    expect(result[0].new_bid_cents).toBeLessThanOrEqual(1000);
  });

  it("skips adjustment when change is less than 3 cents", async () => {
    // 10 rows, 10 clicks/row = 100 clicks, 10 conversions (1/row)
    // convRate = 10/100 = 0.1; optimalBid = round(1000 * 0.1) = 100
    // |100 - 100| = 0 < 3 → skip
    const c = campaign({ auto_bid_current_cents: 100 });
    campaignsResult = { data: [c], error: null };
    statsResult = { data: stats(1, 10, 10, 1, 1000), error: null };
    const result = await calculateOptimalBids();
    expect(result).toHaveLength(0);
  });

  it("sets reason to cpa_above_target_reducing_bid when historicalCpa > 120% of target", async () => {
    // 10 days, 4 clicks/day = 40 clicks, 1 conv/day = 10 conversions
    // spend = 10 × 2000 = 20000; historicalCpa = 20000/10 = 2000 > 1000*1.2=1200
    const c = campaign({ auto_bid_current_cents: 100 });
    campaignsResult = { data: [c], error: null };
    statsResult = { data: stats(1, 10, 4, 1, 2000), error: null };
    const result = await calculateOptimalBids();
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe("cpa_above_target_reducing_bid");
    expect(result[0].metrics.historical_cpa_cents).toBe(2000);
  });

  it("sets reason to cpa_below_target_increasing_bid when historicalCpa < 80% of target", async () => {
    // 10 days, 5 clicks/day = 50 clicks, 1 conv/day = 10 conversions
    // spend = 10 × 300 = 3000; historicalCpa = 3000/10 = 300 < 1000*0.8=800
    const c = campaign({ auto_bid_current_cents: 100 });
    campaignsResult = { data: [c], error: null };
    statsResult = { data: stats(1, 10, 5, 1, 300), error: null };
    const result = await calculateOptimalBids();
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe("cpa_below_target_increasing_bid");
    expect(result[0].metrics.historical_cpa_cents).toBe(300);
  });

  it("historicalCpa is null when there are no conversions", async () => {
    const c = campaign({ auto_bid_current_cents: 100 });
    campaignsResult = { data: [c], error: null };
    statsResult = { data: stats(1, 10, 3, 0, 0), error: null };
    const result = await calculateOptimalBids();
    expect(result).toHaveLength(1);
    expect(result[0].metrics.historical_cpa_cents).toBeNull();
  });

  it("processes multiple campaigns independently", async () => {
    const c1 = campaign({ id: 1, broker_slug: "commsec", auto_bid_current_cents: 50 });
    const c2 = campaign({ id: 2, broker_slug: "stake", auto_bid_current_cents: 50 });
    campaignsResult = { data: [c1, c2], error: null };
    // c1 has no stats → conservative bid; c2 has no stats → conservative bid
    statsResult = { data: [], error: null };
    const result = await calculateOptimalBids();
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.broker_slug).sort()).toEqual(["commsec", "stake"]);
  });

  it("aggregates stats across multiple days for the same campaign", async () => {
    const c = campaign({ auto_bid_current_cents: 50 });
    campaignsResult = { data: [c], error: null };
    // 7 days × 5 clicks = 35 clicks total; 7 × 1 conv = 7 conversions; days=7 ≥ 7 and clicks=35 ≥ 20
    statsResult = { data: stats(1, 7, 5, 1, 500), error: null };
    const result = await calculateOptimalBids();
    // convRate = 7/35 = 0.2; optimalBid = round(1000*0.2)=200
    // currentBid=50; maxIncrease=round(50*1.25)=63; optimalBid capped at 63
    // |63-50|=13 ≥ 3 → adjustment
    expect(result).toHaveLength(1);
    expect(result[0].new_bid_cents).toBe(63);
    expect(result[0].metrics.clicks_30d).toBe(35);
    expect(result[0].metrics.conversions_30d).toBe(7);
  });
});

// ── applyBidAdjustments ───────────────────────────────────────────────────────

describe("applyBidAdjustments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    campaignUpdateError = null;
    notificationInserts.length = 0;
    campaignUpdatePayloads.length = 0;
  });

  it("returns 0 for an empty adjustments array", async () => {
    const count = await applyBidAdjustments([]);
    expect(count).toBe(0);
    expect(campaignUpdatePayloads).toHaveLength(0);
  });

  it("returns count of successfully applied adjustments", async () => {
    const count = await applyBidAdjustments([makeAdj(), makeAdj({ campaign_id: 2 })]);
    expect(count).toBe(2);
  });

  it("does not count an adjustment that fails to update", async () => {
    campaignUpdateError = { message: "constraint violation" };
    const count = await applyBidAdjustments([makeAdj()]);
    expect(count).toBe(0);
  });

  it("updates auto_bid_current_cents and rate_cents together", async () => {
    await applyBidAdjustments([makeAdj({ new_bid_cents: 175 })]);
    expect(campaignUpdatePayloads[0]).toMatchObject({
      auto_bid_current_cents: 175,
      rate_cents: 175,
    });
  });

  it("inserts a broker notification for each adjustment", async () => {
    await applyBidAdjustments([makeAdj(), makeAdj({ campaign_id: 2 })]);
    expect(notificationInserts).toHaveLength(2);
  });

  it("notification message says 'decreased' when new bid is lower than old", async () => {
    const adj = makeAdj({ old_bid_cents: 200, new_bid_cents: 150 });
    await applyBidAdjustments([adj]);
    const n = notificationInserts[0] as Record<string, string>;
    expect(n.message).toContain("decreased");
    expect(n.message).toContain("$2.00");
    expect(n.message).toContain("$1.50");
  });

  it("notification message says 'increased' when new bid is higher than old", async () => {
    const adj = makeAdj({ old_bid_cents: 100, new_bid_cents: 125 });
    await applyBidAdjustments([adj]);
    const n = notificationInserts[0] as Record<string, string>;
    expect(n.message).toContain("increased");
    expect(n.message).toContain("$1.00");
    expect(n.message).toContain("$1.25");
  });

  it("notification message includes 30d stats", async () => {
    const adj = makeAdj({
      metrics: {
        historical_cpa_cents: 800,
        target_cpa_cents: 1000,
        clicks_30d: 42,
        conversions_30d: 7,
        conversion_rate: 16.67,
      },
    });
    await applyBidAdjustments([adj]);
    const n = notificationInserts[0] as Record<string, string>;
    expect(n.message).toContain("42 clicks");
    expect(n.message).toContain("7 conversions");
    expect(n.message).toContain("16.67% conv rate");
  });

  it("notification sets correct broker_slug, type, and link", async () => {
    await applyBidAdjustments([makeAdj({ broker_slug: "stake" })]);
    const n = notificationInserts[0] as Record<string, unknown>;
    expect(n.broker_slug).toBe("stake");
    expect(n.type).toBe("auto_bid_adjustment");
    expect(n.link).toBe("/broker-portal/campaigns");
    expect(n.is_read).toBe(false);
    expect(n.email_sent).toBe(false);
  });

  it("still inserts notifications even when update fails", async () => {
    campaignUpdateError = { message: "write error" };
    await applyBidAdjustments([makeAdj()]);
    // Notifications are sent in a separate loop after the update loop
    expect(notificationInserts).toHaveLength(1);
  });
});
