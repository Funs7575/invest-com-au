import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET } from "@/app/api/quotes/[slug]/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(slug = "job-abc123", ip = "1.2.3.4"): [NextRequest, { params: Promise<{ slug: string }> }] {
  const req = new NextRequest(`http://localhost/api/quotes/${slug}`, {
    headers: { "x-forwarded-for": ip },
  });
  return [req, { params: Promise.resolve({ slug }) }];
}

function makeAuction(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    slug: "job-abc123",
    job_title: "Need a financial planner",
    job_description: "Help me retire early",
    budget_band: "5000-10000",
    advisor_types: ["financial_planner"],
    location: "Sydney, NSW",
    contact_name: "Jane Owner",
    status: "open",
    ends_at: "2026-12-31T00:00:00Z",
    winning_bid_id: null,
    created_at: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

function makeBid(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    bid_amount: 500,
    status: "active",
    created_at: "2026-05-01T10:00:00Z",
    advisor_id: 99,
    professionals: {
      id: 99,
      slug: "bob-advisor",
      name: "Bob Advisor",
      firm_name: "Bob Wealth",
      type: "financial_planner",
      photo_url: null,
      rating: 4.8,
      review_count: 12,
      location_display: "Sydney, NSW",
      verified: true,
    },
    ...overrides,
  };
}

/** Build a chainable Supabase admin mock. */
function makeAdmin({
  auction = makeAuction() as Record<string, unknown> | null,
  auctionError = null as { message: string } | null,
  bids = [makeBid()] as Record<string, unknown>[] | null,
}: {
  auction?: Record<string, unknown> | null;
  auctionError?: { message: string } | null;
  bids?: Record<string, unknown>[] | null;
} = {}) {
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "advisor_auctions") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: auction, error: auctionError }),
      };
    }
    if (table === "advisor_auction_bids") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: bids, error: null }),
      };
    }
    return {};
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/quotes/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    makeAdmin();
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const [req, ctx] = makeReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/too many/i);
  });

  it("returns 404 when auction has DB error", async () => {
    makeAdmin({ auctionError: { message: "relation does not exist" } });
    const [req, ctx] = makeReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it("returns 404 when auction is null (slug not matched)", async () => {
    makeAdmin({ auction: null });
    const [req, ctx] = makeReq("unknown-slug");
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 200 with job and bids on success", async () => {
    const [req, ctx] = makeReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.job).toMatchObject({ slug: "job-abc123", status: "open" });
    expect(Array.isArray(body.bids)).toBe(true);
    expect(body.bids).toHaveLength(1);
    expect(body.bids[0]).toMatchObject({ bid_amount: 500, advisor_id: 99 });
  });

  it("returns bids=[] when bids query returns null", async () => {
    makeAdmin({ bids: null });
    const [req, ctx] = makeReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bids).toEqual([]);
  });

  it("returns bids=[] when no bids exist for the auction", async () => {
    makeAdmin({ bids: [] });
    const [req, ctx] = makeReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bids).toEqual([]);
  });

  it("returns multiple bids sorted by bid_amount ascending", async () => {
    // The route orders by bid_amount ASC — mock returns bids in that order
    makeAdmin({
      bids: [
        { ...makeBid(), id: 10, bid_amount: 200 },
        { ...makeBid(), id: 11, bid_amount: 500 },
      ],
    });
    const [req, ctx] = makeReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bids).toHaveLength(2);
    expect(body.bids[0].bid_amount).toBe(200);
    expect(body.bids[1].bid_amount).toBe(500);
  });

  it("uses rate-limit key scoped to IP", async () => {
    mockIsRateLimited.mockResolvedValue(false);
    const [req, ctx] = makeReq("job-abc123", "9.8.7.6");
    await GET(req, ctx);
    expect(mockIsRateLimited).toHaveBeenCalledWith("quote-detail:9.8.7.6", 60, 60);
  });

  it("returns 500 on unexpected DB throw", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("DB connection failed");
    });
    const [req, ctx] = makeReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to load/i);
  });

  it("includes advisor profile nested in each bid", async () => {
    const [req, ctx] = makeReq();
    const res = await GET(req, ctx);
    const body = await res.json();
    expect(body.bids[0].professionals).toMatchObject({
      name: "Bob Advisor",
      verified: true,
      rating: 4.8,
    });
  });
});
