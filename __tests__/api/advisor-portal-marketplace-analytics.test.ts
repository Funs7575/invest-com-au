import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: { getUser: () => mockGetUser() } })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: vi.fn(() => false) }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { isRateLimited } from "@/lib/rate-limit";

function makeReq(ip = "1.2.3.4") {
  return new NextRequest("http://localhost/api/advisor-portal/marketplace-analytics", {
    headers: { "x-forwarded-for": ip },
  });
}

function mockChain(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
}

describe("GET /api/advisor-portal/marketplace-analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isRateLimited).mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { email: "advisor@example.com" } } });
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValue(true);
    const { GET } = await import("@/app/api/advisor-portal/marketplace-analytics/route");
    const res = await GET(makeReq());
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { GET } = await import("@/app/api/advisor-portal/marketplace-analytics/route");
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 404 when advisor not found", async () => {
    const advChain = mockChain(null);
    const bidsChain = mockChain([]);
    mockAdminFrom
      .mockReturnValueOnce(advChain)
      .mockReturnValue(bidsChain);

    const { GET } = await import("@/app/api/advisor-portal/marketplace-analytics/route");
    const res = await GET(makeReq());
    expect(res.status).toBe(404);
  });

  it("calculates win rate correctly", async () => {
    const advisor = { id: 1, type: "financial_planner" };
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const myBids = [
      { id: 1, bid_amount: 100, status: "won", created_at: new Date().toISOString(), auction_id: 10, retract_reason: null, advisor_auctions: { id: 10, created_at: new Date(Date.now() - 3600_000).toISOString(), advisor_types: ["financial_planner"] } },
      { id: 2, bid_amount: 200, status: "lost", created_at: new Date().toISOString(), auction_id: 11, retract_reason: null, advisor_auctions: { id: 11, created_at: new Date(Date.now() - 7200_000).toISOString(), advisor_types: ["financial_planner"] } },
      { id: 3, bid_amount: 150, status: "lost", created_at: new Date().toISOString(), auction_id: 12, retract_reason: null, advisor_auctions: { id: 12, created_at: new Date(Date.now() - 1800_000).toISOString(), advisor_types: ["financial_planner"] } },
      { id: 4, bid_amount: 180, status: "retracted", created_at: new Date().toISOString(), auction_id: 13, retract_reason: "schedule_conflict", advisor_auctions: { id: 13, created_at: new Date(Date.now() - 900_000).toISOString(), advisor_types: ["financial_planner"] } },
    ];

    const advChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: advisor }) };
    const bidsChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockResolvedValue({ data: myBids }) };
    const catChain = { select: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [] }) };

    mockAdminFrom
      .mockReturnValueOnce(advChain)
      .mockReturnValueOnce(bidsChain)
      .mockReturnValueOnce(catChain);

    const { GET } = await import("@/app/api/advisor-portal/marketplace-analytics/route");
    const res = await GET(makeReq());
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.total_bids).toBe(4);
    expect(body.wins).toBe(1);
    expect(body.lost).toBe(2);
    expect(body.retracted).toBe(1);
    expect(body.win_rate_pct).toBe(25); // 1/4 = 25%
    expect(body.window_days).toBe(30);
  });

  it("returns zero win rate and null median when no bids", async () => {
    const advisor = { id: 1, type: "financial_planner" };

    const advChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: advisor }) };
    const bidsChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockResolvedValue({ data: [] }) };
    const catChain = { select: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [] }) };

    mockAdminFrom
      .mockReturnValueOnce(advChain)
      .mockReturnValueOnce(bidsChain)
      .mockReturnValueOnce(catChain);

    const { GET } = await import("@/app/api/advisor-portal/marketplace-analytics/route");
    const res = await GET(makeReq());
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.win_rate_pct).toBe(0);
    expect(body.median_response_hours).toBeNull();
    expect(body.total_bids).toBe(0);
  });

  it("filters bids by advisor type", async () => {
    const advisor = { id: 1, type: "tax_agent" };
    // One bid on a "tax_agent" auction, one on a "financial_planner" auction
    const bids = [
      { id: 1, bid_amount: 100, status: "won", created_at: new Date().toISOString(), auction_id: 10, retract_reason: null, advisor_auctions: { id: 10, created_at: new Date().toISOString(), advisor_types: ["tax_agent"] } },
      { id: 2, bid_amount: 200, status: "lost", created_at: new Date().toISOString(), auction_id: 11, retract_reason: null, advisor_auctions: { id: 11, created_at: new Date().toISOString(), advisor_types: ["financial_planner"] } },
    ];

    const advChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: advisor }) };
    const bidsChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockResolvedValue({ data: bids }) };
    const catChain = { select: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [] }) };

    mockAdminFrom
      .mockReturnValueOnce(advChain)
      .mockReturnValueOnce(bidsChain)
      .mockReturnValueOnce(catChain);

    const { GET } = await import("@/app/api/advisor-portal/marketplace-analytics/route");
    const res = await GET(makeReq());
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    // Only 1 bid (tax_agent) should count
    expect(body.total_bids).toBe(1);
    expect(body.wins).toBe(1);
    expect(body.win_rate_pct).toBe(100);
  });

  it("computes category benchmark win rate from public_job bids", async () => {
    const advisor = { id: 1, type: "financial_planner" };

    const advChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: advisor }) };
    const bidsChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockResolvedValue({ data: [] }) };
    const catBids = [
      { status: "won", advisor_auctions: { source: "public_job", advisor_types: ["financial_planner"] } },
      { status: "won", advisor_auctions: { source: "public_job", advisor_types: ["financial_planner"] } },
      { status: "lost", advisor_auctions: { source: "public_job", advisor_types: ["financial_planner"] } },
      { status: "won", advisor_auctions: { source: "sponsored", advisor_types: ["financial_planner"] } }, // excluded
    ];
    const catChain = { select: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: catBids }) };

    mockAdminFrom
      .mockReturnValueOnce(advChain)
      .mockReturnValueOnce(bidsChain)
      .mockReturnValueOnce(catChain);

    const { GET } = await import("@/app/api/advisor-portal/marketplace-analytics/route");
    const res = await GET(makeReq());
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    // 2 wins out of 3 public_job bids = 67%
    expect(body.category_avg_win_rate_pct).toBe(67);
  });

  it("returns 500 on unexpected error", async () => {
    mockAdminFrom.mockImplementation(() => { throw new Error("DB crash"); });

    const { GET } = await import("@/app/api/advisor-portal/marketplace-analytics/route");
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });
});
