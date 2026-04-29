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

function makeGetReq(ip = "1.2.3.4") {
  return new NextRequest("http://localhost/api/advisor-auction/public-bids", {
    method: "GET",
    headers: { "x-forwarded-for": ip },
  });
}

function makeDeleteReq(bidId?: number, reason?: string, ip = "1.2.3.4") {
  const url = new URL("http://localhost/api/advisor-auction/public-bids");
  if (bidId !== undefined) url.searchParams.set("bid_id", String(bidId));
  if (reason) url.searchParams.set("reason", reason);
  return new NextRequest(url.toString(), {
    method: "DELETE",
    headers: { "x-forwarded-for": ip },
  });
}

const sampleBids = [
  {
    id: 1,
    bid_amount: 200,
    status: "active",
    created_at: new Date().toISOString(),
    advisor_auctions: {
      id: 10,
      slug: "find-financial-planner",
      job_title: "Need a financial planner",
      budget_band: "5k_10k",
      location: "Sydney",
      status: "open",
      ends_at: new Date(Date.now() + 86400_000).toISOString(),
      winning_bid_id: null,
      source: "public_job",
    },
  },
];

describe("GET /api/advisor-auction/public-bids", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isRateLimited).mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { email: "advisor@example.com" } } });
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValue(true);
    const { GET } = await import("@/app/api/advisor-auction/public-bids/route");
    const res = await GET(makeGetReq());
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { GET } = await import("@/app/api/advisor-auction/public-bids/route");
    const res = await GET(makeGetReq());
    expect(res.status).toBe(401);
  });

  it("returns 404 when advisor not found", async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    });
    const { GET } = await import("@/app/api/advisor-auction/public-bids/route");
    const res = await GET(makeGetReq());
    expect(res.status).toBe(404);
  });

  it("returns bids array on success", async () => {
    const advisorChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    };
    const bidsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: sampleBids, error: null }),
    };
    mockAdminFrom
      .mockReturnValueOnce(advisorChain)
      .mockReturnValueOnce(bidsChain);

    const { GET } = await import("@/app/api/advisor-auction/public-bids/route");
    const res = await GET(makeGetReq());
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(Array.isArray(body.bids)).toBe(true);
    expect((body.bids as unknown[]).length).toBe(1);
  });

  it("returns empty array when advisor has no bids", async () => {
    const advisorChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 2 } }),
    };
    const bidsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockAdminFrom
      .mockReturnValueOnce(advisorChain)
      .mockReturnValueOnce(bidsChain);

    const { GET } = await import("@/app/api/advisor-auction/public-bids/route");
    const res = await GET(makeGetReq());
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.bids).toEqual([]);
  });

  it("returns 500 on DB error fetching bids", async () => {
    const advisorChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    };
    const bidsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: "DB failure" } }),
    };
    mockAdminFrom
      .mockReturnValueOnce(advisorChain)
      .mockReturnValueOnce(bidsChain);

    const { GET } = await import("@/app/api/advisor-auction/public-bids/route");
    const res = await GET(makeGetReq());
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/advisor-auction/public-bids", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isRateLimited).mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { email: "advisor@example.com" } } });
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValue(true);
    const { DELETE } = await import("@/app/api/advisor-auction/public-bids/route");
    const res = await DELETE(makeDeleteReq(1));
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { DELETE } = await import("@/app/api/advisor-auction/public-bids/route");
    const res = await DELETE(makeDeleteReq(1));
    expect(res.status).toBe(401);
  });

  it("returns 400 when bid_id is missing", async () => {
    const { DELETE } = await import("@/app/api/advisor-auction/public-bids/route");
    const res = await DELETE(makeDeleteReq(undefined));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/bid_id/i);
  });

  it("returns 404 when advisor not found", async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    });
    const { DELETE } = await import("@/app/api/advisor-auction/public-bids/route");
    const res = await DELETE(makeDeleteReq(5));
    expect(res.status).toBe(404);
  });

  it("returns 404 when bid not found for this advisor", async () => {
    const advisorChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    };
    const bidChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    mockAdminFrom
      .mockReturnValueOnce(advisorChain)
      .mockReturnValueOnce(bidChain);

    const { DELETE } = await import("@/app/api/advisor-auction/public-bids/route");
    const res = await DELETE(makeDeleteReq(99));
    expect(res.status).toBe(404);
  });

  it("returns 400 when bid is not on a public job", async () => {
    const advisorChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    };
    const bid = { id: 5, status: "active", auction_id: 10, advisor_auctions: { source: "sponsored", status: "open" } };
    const bidChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: bid }),
    };
    mockAdminFrom
      .mockReturnValueOnce(advisorChain)
      .mockReturnValueOnce(bidChain);

    const { DELETE } = await import("@/app/api/advisor-auction/public-bids/route");
    const res = await DELETE(makeDeleteReq(5));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/public quote/i);
  });

  it("returns 400 when bid is not active (already won)", async () => {
    const advisorChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    };
    const bid = { id: 5, status: "won", auction_id: 10, advisor_auctions: { source: "public_job", status: "closed" } };
    const bidChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: bid }),
    };
    mockAdminFrom
      .mockReturnValueOnce(advisorChain)
      .mockReturnValueOnce(bidChain);

    const { DELETE } = await import("@/app/api/advisor-auction/public-bids/route");
    const res = await DELETE(makeDeleteReq(5));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/active bids/i);
  });

  it("returns 400 when auction is no longer open", async () => {
    const advisorChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    };
    const bid = { id: 5, status: "active", auction_id: 10, advisor_auctions: { source: "public_job", status: "closed" } };
    const bidChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: bid }),
    };
    mockAdminFrom
      .mockReturnValueOnce(advisorChain)
      .mockReturnValueOnce(bidChain);

    const { DELETE } = await import("@/app/api/advisor-auction/public-bids/route");
    const res = await DELETE(makeDeleteReq(5));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/no longer open/i);
  });

  it("retracts bid successfully", async () => {
    const advisorChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    };
    const bid = { id: 5, status: "active", auction_id: 10, advisor_auctions: { source: "public_job", status: "open" } };
    const bidChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: bid }),
    };
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockAdminFrom
      .mockReturnValueOnce(advisorChain)
      .mockReturnValueOnce(bidChain)
      .mockReturnValueOnce(updateChain);

    const { DELETE } = await import("@/app/api/advisor-auction/public-bids/route");
    const res = await DELETE(makeDeleteReq(5, "schedule_conflict"));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(updateChain.update).toHaveBeenCalledWith({ status: "retracted", retract_reason: "schedule_conflict" });
  });

  it("uses null retract_reason for invalid reason values", async () => {
    const advisorChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    };
    const bid = { id: 5, status: "active", auction_id: 10, advisor_auctions: { source: "public_job", status: "open" } };
    const bidChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: bid }),
    };
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockAdminFrom
      .mockReturnValueOnce(advisorChain)
      .mockReturnValueOnce(bidChain)
      .mockReturnValueOnce(updateChain);

    const { DELETE } = await import("@/app/api/advisor-auction/public-bids/route");
    const res = await DELETE(makeDeleteReq(5, "not_a_valid_reason"));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(updateChain.update).toHaveBeenCalledWith({ status: "retracted", retract_reason: null });
  });
});
