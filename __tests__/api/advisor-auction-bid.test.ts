import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

import { POST } from "@/app/api/advisor-auction/bid/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ADVISOR = { id: 42, name: "Jane Doe", email: "jane@test.com", credit_balance_cents: 100000 };
const AUCTION = { id: 1, status: "open", ends_at: "2099-01-01T00:00:00Z" };

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auction/bid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Build a multi-call sequence for mockAdminFrom.
 * The route calls admin.from() multiple times in order:
 *   1. advisors SELECT (single) → advisor profile
 *   2. advisor_auctions SELECT (single) → auction
 *   3. advisor_auction_bids SELECT (maybeSingle) → existing bid (or null)
 *   4. advisor_auction_bids INSERT or UPDATE
 *   5. advisor_auction_bids SELECT (high bid check)
 */
function makeDbSequence(steps: Array<() => Record<string, unknown>>) {
  let call = 0;
  return () => {
    const step = steps[call] ?? steps[steps.length - 1];
    call++;
    return step();
  };
}

function singleChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.single = vi.fn().mockResolvedValue(result);
  return c;
}

function maybeSingleChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  return c;
}

function insertChain(result: { data?: unknown; error: unknown }) {
  return {
    insert: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(result),
    })),
  };
}

function updateChain(result: { error: unknown }) {
  const c: Record<string, unknown> = {};
  c.update = vi.fn(() => c);
  c.eq = vi.fn(() => Promise.resolve(result));
  return c;
}

function highBidChain(bids: unknown[]) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.order = vi.fn(() => c);
  c.limit = vi.fn().mockResolvedValue({ data: bids, error: null });
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-auction/bid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: ADVISOR.email } } });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost({ auction_id: 1, bid_amount: 5000 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when auction_id is missing", async () => {
    const res = await POST(makePost({ bid_amount: 5000 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when auction_id is not a number", async () => {
    const res = await POST(makePost({ auction_id: "abc", bid_amount: 5000 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when bid_amount is below minimum ($50 = 5000 cents)", async () => {
    const res = await POST(makePost({ auction_id: 1, bid_amount: 4999 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/\$50\.00/);
  });

  it("returns 400 when bid_amount is missing", async () => {
    const res = await POST(makePost({ auction_id: 1 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when advisor profile not found", async () => {
    mockAdminFrom.mockReturnValueOnce(singleChain({ data: null, error: null }));
    const res = await POST(makePost({ auction_id: 1, bid_amount: 5000 }));
    expect(res.status).toBe(404);
  });

  it("returns 404 when auction not found", async () => {
    mockAdminFrom
      .mockReturnValueOnce(singleChain({ data: ADVISOR, error: null }))
      .mockReturnValueOnce(singleChain({ data: null, error: null }));
    const res = await POST(makePost({ auction_id: 1, bid_amount: 5000 }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when auction is not open", async () => {
    mockAdminFrom
      .mockReturnValueOnce(singleChain({ data: ADVISOR, error: null }))
      .mockReturnValueOnce(singleChain({ data: { ...AUCTION, status: "closed" }, error: null }));
    const res = await POST(makePost({ auction_id: 1, bid_amount: 5000 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/no longer accepting/i);
  });

  it("returns 400 when auction has expired", async () => {
    mockAdminFrom
      .mockReturnValueOnce(singleChain({ data: ADVISOR, error: null }))
      .mockReturnValueOnce(singleChain({ data: { ...AUCTION, ends_at: "2020-01-01T00:00:00Z" }, error: null }));
    const res = await POST(makePost({ auction_id: 1, bid_amount: 5000 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/expired/i);
  });

  it("places a new bid and returns bid_id + is_leading", async () => {
    mockAdminFrom
      .mockReturnValueOnce(singleChain({ data: ADVISOR, error: null }))
      .mockReturnValueOnce(singleChain({ data: AUCTION, error: null }))
      .mockReturnValueOnce(maybeSingleChain({ data: null, error: null }))  // no existing bid
      .mockReturnValueOnce(insertChain({ data: { id: "new-bid-id" }, error: null }))
      .mockReturnValueOnce(highBidChain([{ id: "new-bid-id", advisor_id: ADVISOR.id, bid_amount: 10000 }]));

    const res = await POST(makePost({ auction_id: 1, bid_amount: 10000 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bid_id).toBe("new-bid-id");
    expect(json.bid_amount).toBe(10000);
    expect(json.is_leading).toBe(true);
    expect(json.message).toMatch(/highest/i);
  });

  it("is_leading is false when another advisor has a higher bid", async () => {
    mockAdminFrom
      .mockReturnValueOnce(singleChain({ data: ADVISOR, error: null }))
      .mockReturnValueOnce(singleChain({ data: AUCTION, error: null }))
      .mockReturnValueOnce(maybeSingleChain({ data: null, error: null }))
      .mockReturnValueOnce(insertChain({ data: { id: "my-bid" }, error: null }))
      .mockReturnValueOnce(highBidChain([
        { id: "other-bid", advisor_id: 999, bid_amount: 20000 },
        { id: "my-bid", advisor_id: ADVISOR.id, bid_amount: 10000 },
      ]));

    const res = await POST(makePost({ auction_id: 1, bid_amount: 10000 }));
    const json = await res.json();
    expect(json.is_leading).toBe(false);
    expect(json.message).toMatch(/not currently/i);
  });

  it("returns 400 when new bid does not exceed existing bid", async () => {
    mockAdminFrom
      .mockReturnValueOnce(singleChain({ data: ADVISOR, error: null }))
      .mockReturnValueOnce(singleChain({ data: AUCTION, error: null }))
      .mockReturnValueOnce(maybeSingleChain({ data: { id: "existing-bid", bid_amount: 15000 }, error: null }));

    const res = await POST(makePost({ auction_id: 1, bid_amount: 10000 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/\$150\.00/);
  });

  it("updates an existing bid when new amount is higher", async () => {
    mockAdminFrom
      .mockReturnValueOnce(singleChain({ data: ADVISOR, error: null }))
      .mockReturnValueOnce(singleChain({ data: AUCTION, error: null }))
      .mockReturnValueOnce(maybeSingleChain({ data: { id: "existing-bid", bid_amount: 5000 }, error: null }))
      .mockReturnValueOnce(updateChain({ error: null }))
      .mockReturnValueOnce(highBidChain([{ id: "existing-bid", advisor_id: ADVISOR.id, bid_amount: 20000 }]));

    const res = await POST(makePost({ auction_id: 1, bid_amount: 20000 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bid_id).toBe("existing-bid");
    expect(json.bid_amount).toBe(20000);
  });

  it("returns 409 on unique constraint violation (race condition duplicate bid)", async () => {
    mockAdminFrom
      .mockReturnValueOnce(singleChain({ data: ADVISOR, error: null }))
      .mockReturnValueOnce(singleChain({ data: AUCTION, error: null }))
      .mockReturnValueOnce(maybeSingleChain({ data: null, error: null }))
      .mockReturnValueOnce(insertChain({ data: null, error: { code: "23505", message: "duplicate" } }));

    const res = await POST(makePost({ auction_id: 1, bid_amount: 10000 }));
    expect(res.status).toBe(409);
  });

  it("returns 500 on unexpected DB insert error", async () => {
    mockAdminFrom
      .mockReturnValueOnce(singleChain({ data: ADVISOR, error: null }))
      .mockReturnValueOnce(singleChain({ data: AUCTION, error: null }))
      .mockReturnValueOnce(maybeSingleChain({ data: null, error: null }))
      .mockReturnValueOnce(insertChain({ data: null, error: { code: "50000", message: "db error" } }));

    const res = await POST(makePost({ auction_id: 1, bid_amount: 10000 }));
    expect(res.status).toBe(500);
  });
});
