import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockFrom, mockIsRateLimited, mockSendAccepted } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockIsRateLimited: vi.fn(),
  mockSendAccepted: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: mockIsRateLimited,
}));

vi.mock("@/lib/quote-emails", () => ({
  sendAdvisorBidAcceptedEmail: mockSendAccepted,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/quotes/[slug]/accept/route";

const SLUG = "find-an-adviser-abc";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/quotes/" + SLUG + "/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

function ctx() {
  return { params: Promise.resolve({ slug: SLUG }) };
}

const VALID = { bid_id: 5, contact_email: "owner@example.com" };

const AUCTION = {
  id: 11,
  contact_email: "owner@example.com",
  contact_name: "Owner",
  status: "open",
  slug: SLUG,
};

const BID = { id: 5, advisor_id: 9, bid_amount: 100, auction_id: 11, status: "active" };

// .from("advisor_auctions").select().eq().eq().eq().maybeSingle()
function auctionSelectChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

// .from("advisor_auction_bids").select().eq().eq().maybeSingle()
function bidSelectChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

// .update().eq() — terminal eq resolves
function winnerUpdateChain(result: { error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => Promise.resolve(result));
  return chain;
}

// .update().eq().eq().neq() — generic resolving chain
function multiUpdateChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.neq = vi.fn(() => Promise.resolve({ error: null }));
  return chain;
}

function awardUpdateChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => Promise.resolve({ error: null }));
  return chain;
}

function advisorSelectChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("POST /api/quotes/[slug]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockSendAccepted.mockResolvedValue(undefined);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/quotes/" + SLUG + "/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req, ctx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when zod validation fails", async () => {
    const res = await POST(makeReq({ bid_id: -1, contact_email: "x" }), ctx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when the job is not found", async () => {
    mockFrom.mockReturnValueOnce(auctionSelectChain({ data: null }));
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(404);
  });

  it("returns 403 when contact email does not match", async () => {
    mockFrom.mockReturnValueOnce(auctionSelectChain({ data: AUCTION }));
    const res = await POST(makeReq({ ...VALID, contact_email: "other@example.com" }), ctx());
    expect(res.status).toBe(403);
  });

  it("returns 400 when the job is no longer open", async () => {
    mockFrom.mockReturnValueOnce(auctionSelectChain({ data: { ...AUCTION, status: "awarded" } }));
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "This job is no longer open." });
  });

  it("returns 404 when the bid is not found", async () => {
    mockFrom
      .mockReturnValueOnce(auctionSelectChain({ data: AUCTION }))
      .mockReturnValueOnce(bidSelectChain({ data: null }));
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Bid not found." });
  });

  it("returns 500 when marking the winner fails", async () => {
    mockFrom
      .mockReturnValueOnce(auctionSelectChain({ data: AUCTION }))
      .mockReturnValueOnce(bidSelectChain({ data: BID }))
      .mockReturnValueOnce(winnerUpdateChain({ error: { message: "boom" } }));
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to accept bid." });
  });

  it("awards the bid, emails the advisor, and returns success", async () => {
    mockFrom
      .mockReturnValueOnce(auctionSelectChain({ data: AUCTION }))
      .mockReturnValueOnce(bidSelectChain({ data: BID }))
      .mockReturnValueOnce(winnerUpdateChain({ error: null }))
      .mockReturnValueOnce(multiUpdateChain())
      .mockReturnValueOnce(awardUpdateChain())
      .mockReturnValueOnce(advisorSelectChain({ data: { name: "Jane Doe", email: "jane@adv.com", type: "financial_adviser" } }));
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, winning_bid_id: 5 });
    expect(mockSendAccepted).toHaveBeenCalledOnce();
  });

  it("succeeds without sending email when advisor has no email", async () => {
    mockFrom
      .mockReturnValueOnce(auctionSelectChain({ data: AUCTION }))
      .mockReturnValueOnce(bidSelectChain({ data: BID }))
      .mockReturnValueOnce(winnerUpdateChain({ error: null }))
      .mockReturnValueOnce(multiUpdateChain())
      .mockReturnValueOnce(awardUpdateChain())
      .mockReturnValueOnce(advisorSelectChain({ data: null }));
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(200);
    expect(mockSendAccepted).not.toHaveBeenCalled();
  });

  it("returns 500 when an unexpected error is thrown", async () => {
    mockFrom.mockImplementationOnce(() => {
      throw new Error("db down");
    });
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(500);
  });
});
