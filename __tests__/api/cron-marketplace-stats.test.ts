import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

vi.mock("@/lib/marketplace/auto-bid", () => ({
  calculateOptimalBids: vi.fn().mockResolvedValue([]),
  applyBidAdjustments: vi.fn().mockResolvedValue(0),
}));

const fetchMock = vi.fn<() => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);

// ─── DB queue ────────────────────────────────────────────────────────────────

interface DbResult {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
}

let dbQueue: DbResult[] = [];
let dbIdx = 0;
const mockRpc = vi.fn().mockResolvedValue({ error: null });

function makeChain(res: DbResult) {
  const chain: Record<string, unknown> = {};
  const methods = ["select","update","insert","upsert","eq","neq","lt","lte","gte","not","in","or","like","order","limit","maybeSingle","single"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  const r = { data: res.data ?? null, error: res.error ?? null, count: res.count ?? null };
  chain.then = (resolve: (v: typeof r) => unknown) => Promise.resolve(resolve(r));
  chain.catch = () => chain;
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { error: null })),
    rpc: mockRpc,
  })),
}));

import { GET } from "@/app/api/cron/marketplace-stats/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { calculateOptimalBids } from "@/lib/marketplace/auto-bid";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/marketplace-stats", {
    headers: { Authorization: "Bearer test-secret" },
  }) as unknown as NextRequest;
}

function overBudgetCampaign(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    broker_slug: "commsec",
    total_spent_cents: 10000,
    total_budget_cents: 10000,
    ...overrides,
  };
}

beforeEach(() => {
  dbQueue = [];
  dbIdx = 0;
  vi.clearAllMocks();
  mockRpc.mockResolvedValue({ error: null });
  vi.mocked(calculateOptimalBids).mockResolvedValue([]);
  fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));
  delete process.env.RESEND_API_KEY;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/marketplace-stats", () => {
  it("returns 401 when cron auth fails", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns all-zero counts when no events or campaigns (no RESEND key)", async () => {
    // DB calls without RESEND_API_KEY:
    // 1. campaign_events (step 1)
    // 2. campaigns overBudget (step 2)
    // 3. campaigns toActivate (step 3)
    // 4. campaigns toComplete (step 4)
    // 5. campaign_daily_stats (step 9 recommendations, campStats 30-day)
    dbQueue.push({ data: [] }); // campaign_events
    dbQueue.push({ data: [] }); // campaigns overBudget
    dbQueue.push({ data: [] }); // campaigns toActivate
    dbQueue.push({ data: [] }); // campaigns toComplete
    dbQueue.push({ data: [] }); // campaign_daily_stats (recommendations)

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as {
      statsAggregated: number; budgetExhausted: number;
      campaignsActivated: number; campaignsCompleted: number;
    };
    expect(body.statsAggregated).toBe(0);
    expect(body.budgetExhausted).toBe(0);
    expect(body.campaignsActivated).toBe(0);
    expect(body.campaignsCompleted).toBe(0);
  });

  it("auto-pauses campaign with exhausted budget", async () => {
    const campaign = overBudgetCampaign();
    dbQueue.push({ data: [] });           // campaign_events (no events)
    dbQueue.push({ data: [campaign] });   // campaigns overBudget
    dbQueue.push({ error: null });        // update status=budget_exhausted
    dbQueue.push({ error: null });        // insert broker_notifications
    dbQueue.push({ data: [] });           // campaigns toActivate
    dbQueue.push({ data: [] });           // campaigns toComplete
    dbQueue.push({ data: [] });           // campaign_daily_stats

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { budgetExhausted: number };
    expect(body.budgetExhausted).toBe(1);
  });

  it("activates approved campaign whose start_date has arrived", async () => {
    const campaign = { id: 2, broker_slug: "selfwealth", name: "SelfWealth March" };
    dbQueue.push({ data: [] });           // campaign_events
    dbQueue.push({ data: [] });           // overBudget
    dbQueue.push({ data: [campaign] });   // toActivate
    dbQueue.push({ error: null });        // update status=active
    dbQueue.push({ data: [] });           // toComplete
    dbQueue.push({ data: [] });           // campaign_daily_stats

    const res = await GET(makeReq());
    const body = await res.json() as { campaignsActivated: number };
    expect(body.campaignsActivated).toBe(1);
  });

  it("completes campaign whose end_date has passed", async () => {
    const campaign = { id: 3, broker_slug: "pearler", name: "Old Campaign", end_date: "2026-01-01" };
    dbQueue.push({ data: [] });           // campaign_events
    dbQueue.push({ data: [] });           // overBudget
    dbQueue.push({ data: [] });           // toActivate
    dbQueue.push({ data: [campaign] });   // toComplete
    dbQueue.push({ error: null });        // update status=completed
    dbQueue.push({ data: [] });           // campaign_daily_stats

    const res = await GET(makeReq());
    const body = await res.json() as { campaignsCompleted: number };
    expect(body.campaignsCompleted).toBe(1);
  });

  it("calls calculateOptimalBids and reflects autoBidAdjustments in response", async () => {
    vi.mocked(calculateOptimalBids).mockResolvedValueOnce([
      { campaign_id: 1, broker_slug: "commsec", old_bid_cents: 200, new_bid_cents: 220, reason: "ctr_up" },
    ] as never);
    const { applyBidAdjustments } = await import("@/lib/marketplace/auto-bid");
    vi.mocked(applyBidAdjustments).mockResolvedValueOnce(1 as never);

    dbQueue.push({ data: [] }); // campaign_events
    dbQueue.push({ data: [] }); // overBudget
    dbQueue.push({ data: [] }); // toActivate
    dbQueue.push({ data: [] }); // toComplete
    dbQueue.push({ data: [] }); // campaign_daily_stats

    const res = await GET(makeReq());
    const body = await res.json() as { autoBidAdjustments: number };
    expect(body.autoBidAdjustments).toBe(1);
  });
});
