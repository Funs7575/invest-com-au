import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createHmac } from "crypto";

const { mockFrom, mockIsRateLimited } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockIsRateLimited: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: mockIsRateLimited,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/quotes/[slug]/review/route";

const SLUG = "find-an-adviser-abc";
const SECRET = "test-cron-secret";
const EMAIL = "owner@example.com";
const AUCTION_ID = 11;

function expectedToken(auctionId: number, email: string): string {
  return createHmac("sha256", SECRET)
    .update(`${auctionId}|${email.toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}

const GOOD_TOKEN = expectedToken(AUCTION_ID, EMAIL);

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/quotes/" + SLUG + "/review", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

function ctx() {
  return { params: Promise.resolve({ slug: SLUG }) };
}

function validBody(overrides: Record<string, unknown> = {}) {
  return { token: GOOD_TOKEN, reviewer_email: EMAIL, rating: 5, body: "Great service", ...overrides };
}

const AUCTION = { id: AUCTION_ID, contact_email: EMAIL, winning_bid_id: 22 };

// .from("advisor_auctions").select().eq().eq().maybeSingle()
function auctionChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

// .from("advisor_auction_bids").select().eq().maybeSingle()
function bidChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

// .from("quote_reviews").insert() — terminal insert resolves
function insertChain(result: { error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.insert = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("POST /api/quotes/[slug]/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    vi.stubEnv("CRON_SECRET", SECRET);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makeReq(validBody()), ctx());
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/quotes/" + SLUG + "/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad",
    });
    const res = await POST(req, ctx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when zod fails (rating out of range)", async () => {
    const res = await POST(makeReq(validBody({ rating: 9 })), ctx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when job not found", async () => {
    mockFrom.mockReturnValueOnce(auctionChain({ data: null }));
    const res = await POST(makeReq(validBody()), ctx());
    expect(res.status).toBe(404);
  });

  it("returns 400 when there is no accepted quote", async () => {
    mockFrom.mockReturnValueOnce(auctionChain({ data: { ...AUCTION, winning_bid_id: null } }));
    const res = await POST(makeReq(validBody()), ctx());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No accepted quote on this job." });
  });

  it("returns 403 when reviewer email does not match", async () => {
    mockFrom.mockReturnValueOnce(auctionChain({ data: AUCTION }));
    const res = await POST(makeReq(validBody({ reviewer_email: "other@example.com" })), ctx());
    expect(res.status).toBe(403);
  });

  it("returns 403 when the token is invalid", async () => {
    mockFrom.mockReturnValueOnce(auctionChain({ data: AUCTION }));
    const res = await POST(makeReq(validBody({ token: "x".repeat(32) })), ctx());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Invalid or expired review link." });
  });

  it("returns 404 when the winning bid is not found", async () => {
    mockFrom
      .mockReturnValueOnce(auctionChain({ data: AUCTION }))
      .mockReturnValueOnce(bidChain({ data: null }));
    const res = await POST(makeReq(validBody()), ctx());
    expect(res.status).toBe(404);
  });

  it("inserts the review and returns success", async () => {
    const chain = insertChain({ error: null });
    mockFrom
      .mockReturnValueOnce(auctionChain({ data: AUCTION }))
      .mockReturnValueOnce(bidChain({ data: { advisor_id: 9 } }))
      .mockReturnValueOnce(chain);
    const res = await POST(makeReq(validBody()), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    const insertArg = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertArg).toMatchObject({ auction_id: AUCTION_ID, advisor_id: 9, rating: 5, verified: true });
  });

  it("returns 409 on duplicate review (unique violation)", async () => {
    mockFrom
      .mockReturnValueOnce(auctionChain({ data: AUCTION }))
      .mockReturnValueOnce(bidChain({ data: { advisor_id: 9 } }))
      .mockReturnValueOnce(insertChain({ error: { code: "23505", message: "dup" } }));
    const res = await POST(makeReq(validBody()), ctx());
    expect(res.status).toBe(409);
  });

  it("returns 500 when the insert errors for another reason", async () => {
    mockFrom
      .mockReturnValueOnce(auctionChain({ data: AUCTION }))
      .mockReturnValueOnce(bidChain({ data: { advisor_id: 9 } }))
      .mockReturnValueOnce(insertChain({ error: { code: "55000", message: "boom" } }));
    const res = await POST(makeReq(validBody()), ctx());
    expect(res.status).toBe(500);
  });

  it("returns 500 on unexpected error", async () => {
    mockFrom.mockImplementationOnce(() => {
      throw new Error("db down");
    });
    const res = await POST(makeReq(validBody()), ctx());
    expect(res.status).toBe(500);
  });
});
