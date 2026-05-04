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

const mockSendAcceptedEmail = vi.fn();
vi.mock("@/lib/quote-emails", () => ({
  sendAdvisorBidAcceptedEmail: (...args: unknown[]) => mockSendAcceptedEmail(...args),
}));

import { POST } from "@/app/api/quotes/[slug]/accept/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(body: unknown, slug = "my-job-abc123", ip = "1.2.3.4"): [NextRequest, { params: Promise<{ slug: string }> }] {
  const req = new NextRequest(`http://localhost/api/quotes/${slug}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
  return [req, { params: Promise.resolve({ slug }) }];
}

const VALID_BODY = {
  bid_id: 42,
  contact_email: "owner@example.com",
};

function makeAuction(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    contact_email: "owner@example.com",
    contact_name: "Jane Owner",
    status: "open",
    slug: "my-job-abc123",
    ...overrides,
  };
}

function makeBid(overrides: Record<string, unknown> = {}) {
  return { id: 42, advisor_id: 99, bid_amount: 150, auction_id: 1, status: "active", ...overrides };
}

function makeAdvisor() {
  return { name: "Bob Advisor", email: "advisor@example.com", type: "financial_planner" };
}

/** Build a chainable Supabase mock that returns different data per table. */
function makeAdmin({
  auction = makeAuction(),
  bid = makeBid(),
  advisor = makeAdvisor() as Record<string, unknown> | null,
  winnerErr = null as { message: string } | null,
}: {
  auction?: Record<string, unknown> | null;
  bid?: Record<string, unknown> | null;
  advisor?: Record<string, unknown> | null;
  winnerErr?: { message: string } | null;
} = {}) {
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "advisor_auctions") {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: auction, error: null }),
        then: undefined as unknown,
      };
      // update path: supports .eq() chains and resolves
      const updateChain = {
        eq: vi.fn().mockReturnThis(),
        then: (cb: (v: { error: null }) => void) => { cb({ error: null }); return Promise.resolve({ error: null }); },
      };
      chain.update = vi.fn(() => updateChain);
      return chain;
    }
    if (table === "advisor_auction_bids") {
      const updateWinner = {
        eq: vi.fn().mockReturnThis(),
        then: (cb: (v: { error: typeof winnerErr }) => void) => { cb({ error: winnerErr }); return Promise.resolve({ error: winnerErr }); },
      };
      const updateLost = {
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        then: (cb: (v: { error: null }) => void) => { cb({ error: null }); return Promise.resolve({ error: null }); },
      };
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: bid, error: null }),
        update: vi.fn((data: Record<string, unknown>) =>
          data.status === "won" ? updateWinner : updateLost
        ),
      };
    }
    if (table === "professionals") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: advisor, error: null }),
      };
    }
    return {};
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/quotes/[slug]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockSendAcceptedEmail.mockResolvedValue(undefined);
    makeAdmin();
  });

  // ── Rate limiting ────────────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const [req, ctx] = makeReq(VALID_BODY);
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
  });

  // ── Input validation ─────────────────────────────────────────────────────────

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/quotes/my-job/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req, { params: Promise.resolve({ slug: "my-job" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when bid_id is missing", async () => {
    const [req, ctx] = makeReq({ contact_email: "owner@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when contact_email is invalid", async () => {
    const [req, ctx] = makeReq({ bid_id: 42, contact_email: "not-an-email" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  // ── Authorization gates ──────────────────────────────────────────────────────

  it("returns 404 when job slug not found", async () => {
    makeAdmin({ auction: null });
    const [req, ctx] = makeReq(VALID_BODY);
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 403 when contact_email does not match auction owner", async () => {
    makeAdmin({ auction: makeAuction({ contact_email: "different@example.com" }) });
    const [req, ctx] = makeReq(VALID_BODY);
    const res = await POST(req, ctx);
    expect(res.status).toBe(403);
  });

  it("returns 400 when auction is not open", async () => {
    makeAdmin({ auction: makeAuction({ status: "awarded" }) });
    const [req, ctx] = makeReq(VALID_BODY);
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/no longer open/i);
  });

  it("returns 404 when bid_id not found in this auction", async () => {
    makeAdmin({ bid: null });
    const [req, ctx] = makeReq(VALID_BODY);
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/bid not found/i);
  });

  // ── Happy path ───────────────────────────────────────────────────────────────

  it("returns 200 with winning_bid_id on success", async () => {
    const [req, ctx] = makeReq(VALID_BODY);
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; winning_bid_id: number };
    expect(body.success).toBe(true);
    expect(body.winning_bid_id).toBe(42);
  });

  it("email is fire-and-forget — does not throw when advisor has no email", async () => {
    makeAdmin({ advisor: { name: "Bob", email: null, type: "financial_planner" } });
    const [req, ctx] = makeReq(VALID_BODY);
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    expect(mockSendAcceptedEmail).not.toHaveBeenCalled();
  });

  it("email is fire-and-forget — does not throw when advisor lookup returns null", async () => {
    makeAdmin({ advisor: null });
    const [req, ctx] = makeReq(VALID_BODY);
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
  });

  // ── Error handling ───────────────────────────────────────────────────────────

  it("returns 500 when marking winner fails in DB", async () => {
    makeAdmin({ winnerErr: { message: "constraint violation" } });
    const [req, ctx] = makeReq(VALID_BODY);
    const res = await POST(req, ctx);
    expect(res.status).toBe(500);
  });

  it("email verification is case-insensitive", async () => {
    const [req, ctx] = makeReq({ bid_id: 42, contact_email: "OWNER@EXAMPLE.COM" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
  });
});
