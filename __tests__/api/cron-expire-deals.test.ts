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

const fetchMock = vi.fn<() => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);

// ─── DB queue ────────────────────────────────────────────────────────────────

interface DbResult {
  data?: unknown;
  error?: { message: string } | null;
}

let dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const chain: Record<string, unknown> = {};
  const methods = ["select","update","insert","eq","neq","lt","lte","gte","not","in","or","limit","maybeSingle","single"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  const r = { data: res.data ?? null, error: res.error ?? null };
  chain.then = (resolve: (v: typeof r) => unknown) => Promise.resolve(resolve(r));
  chain.catch = () => chain;
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { error: null })),
  })),
}));

import { GET } from "@/app/api/cron/expire-deals/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/expire-deals", {
    headers: { Authorization: "Bearer test-secret" },
  }) as unknown as NextRequest;
}

const YESTERDAY = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
const TODAY = new Date().toISOString().slice(0, 10);

function expiredBrokerDeal(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    slug: "commsec",
    name: "CommSec",
    deal_text: "Get $0 brokerage",
    deal_expiry: YESTERDAY,
    ...overrides,
  };
}

function expiredSponsor(overrides: Record<string, unknown> = {}) {
  return {
    id: 2,
    slug: "selfwealth",
    name: "SelfWealth",
    sponsorship_tier: "platinum",
    sponsorship_end: YESTERDAY,
    ...overrides,
  };
}

function expiredProDeal(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    broker_slug: "commsec",
    title: "Summer Promo",
    end_date: YESTERDAY,
    ...overrides,
  };
}

function expiredCampaign(overrides: Record<string, unknown> = {}) {
  return {
    id: 20,
    broker_slug: "commsec",
    name: "Summer 2026",
    end_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    ...overrides,
  };
}

beforeEach(() => {
  dbQueue = [];
  dbIdx = 0;
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "test-key";
  process.env.NEXT_PUBLIC_BASE_URL = "https://invest.com.au";
  fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/expire-deals", () => {
  it("returns 401 when cron auth fails", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when deals fetch fails", async () => {
    dbQueue.push({ error: { message: "DB error" } }); // brokers deals query
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns zero counts when nothing has expired", async () => {
    dbQueue.push({ data: [] }); // expired deals
    dbQueue.push({ data: [] }); // expired sponsors
    dbQueue.push({ data: [] }); // expired pro deals
    dbQueue.push({ data: [] }); // expired campaigns

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as {
      dealsExpired: number; sponsorsExpired: number;
      proDealsExpired: number; campaignsCompleted: number; errors: number;
    };
    expect(body.dealsExpired).toBe(0);
    expect(body.sponsorsExpired).toBe(0);
    expect(body.proDealsExpired).toBe(0);
    expect(body.campaignsCompleted).toBe(0);
    expect(body.errors).toBe(0);
  });

  it("expires broker deal and writes audit log", async () => {
    dbQueue.push({ data: [expiredBrokerDeal()] }); // expired deals
    dbQueue.push({ error: null });                  // update broker deal=false
    dbQueue.push({ error: null });                  // insert audit log
    dbQueue.push({ data: [] });                     // expired sponsors
    dbQueue.push({ data: [] });                     // expired pro deals
    dbQueue.push({ data: [] });                     // expired campaigns
    // alert email (results.length > 0)
    fetchMock.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { dealsExpired: number };
    expect(body.dealsExpired).toBe(1);
  });

  it("expires sponsorship tier and writes audit log", async () => {
    dbQueue.push({ data: [] });                       // expired deals
    dbQueue.push({ data: [expiredSponsor()] });        // expired sponsors
    dbQueue.push({ error: null });                     // update sponsorship_tier=null
    dbQueue.push({ error: null });                     // insert audit log
    dbQueue.push({ data: [] });                        // expired pro deals
    dbQueue.push({ data: [] });                        // expired campaigns
    fetchMock.mockResolvedValueOnce(new Response("ok", { status: 200 })); // alert email

    const res = await GET(makeReq());
    const body = await res.json() as { sponsorsExpired: number };
    expect(body.sponsorsExpired).toBe(1);
  });

  it("expires pro deal and writes audit log", async () => {
    dbQueue.push({ data: [] });                    // expired deals
    dbQueue.push({ data: [] });                    // expired sponsors
    dbQueue.push({ data: [expiredProDeal()] });    // expired pro deals
    dbQueue.push({ error: null });                 // update pro_deal status=expired
    dbQueue.push({ error: null });                 // insert audit log
    dbQueue.push({ data: [] });                    // expired campaigns
    fetchMock.mockResolvedValueOnce(new Response("ok", { status: 200 })); // alert email

    const res = await GET(makeReq());
    const body = await res.json() as { proDealsExpired: number };
    expect(body.proDealsExpired).toBe(1);
  });

  it("completes campaign and sends broker notification + email", async () => {
    dbQueue.push({ data: [] });                         // expired deals
    dbQueue.push({ data: [] });                         // expired sponsors
    dbQueue.push({ data: [] });                         // expired pro deals
    dbQueue.push({ data: [expiredCampaign()] });         // expired campaigns
    dbQueue.push({ error: null });                       // update campaign status=completed
    dbQueue.push({ error: null });                       // insert audit log
    dbQueue.push({ error: null });                       // insert broker_notifications
    // broker email fetch
    dbQueue.push({ data: { email: "partner@broker.com", full_name: "Broker Admin" } }); // broker_accounts
    fetchMock
      .mockResolvedValueOnce(new Response("ok", { status: 200 })) // Resend campaign email
      .mockResolvedValueOnce(new Response("ok", { status: 200 })); // alert email

    const res = await GET(makeReq());
    const body = await res.json() as { campaignsCompleted: number };
    expect(body.campaignsCompleted).toBe(1);
  });

  it("tracks errors when deal update fails", async () => {
    dbQueue.push({ data: [expiredBrokerDeal()] }); // expired deals
    dbQueue.push({ error: { message: "update failed" } }); // update error
    dbQueue.push({ data: [] }); // sponsors
    dbQueue.push({ data: [] }); // pro deals
    dbQueue.push({ data: [] }); // campaigns
    fetchMock.mockResolvedValueOnce(new Response("ok", { status: 200 })); // alert email

    const res = await GET(makeReq());
    const body = await res.json() as { errors: number };
    expect(body.errors).toBe(1);
  });

  it("does not send alert email when no deals expired", async () => {
    dbQueue.push({ data: [] }); // deals
    dbQueue.push({ data: [] }); // sponsors
    dbQueue.push({ data: [] }); // pro deals
    dbQueue.push({ data: [] }); // campaigns

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
