import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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

import { POST } from "@/app/api/quotes/[slug]/reopen/route";

const SLUG = "find-an-adviser-abc";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/quotes/" + SLUG + "/reopen", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

function ctx() {
  return { params: Promise.resolve({ slug: SLUG }) };
}

const VALID = { contact_email: "owner@example.com" };

const AUCTION = {
  id: 11,
  slug: SLUG,
  status: "expired",
  contact_email: "owner@example.com",
  ends_at: "2026-01-01T00:00:00.000Z",
  reopened_count: 0,
  winning_bid_id: null,
};

function auctionChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

function updateChain(result: { error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("POST /api/quotes/[slug]/reopen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/quotes/" + SLUG + "/reopen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad",
    });
    const res = await POST(req, ctx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when zod fails (invalid email)", async () => {
    const res = await POST(makeReq({ contact_email: "nope" }), ctx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when job not found", async () => {
    mockFrom.mockReturnValueOnce(auctionChain({ data: null }));
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(404);
  });

  it("returns 403 when email does not match", async () => {
    mockFrom.mockReturnValueOnce(auctionChain({ data: AUCTION }));
    const res = await POST(makeReq({ contact_email: "other@example.com" }), ctx());
    expect(res.status).toBe(403);
  });

  it("returns 400 when the job has an accepted quote", async () => {
    mockFrom.mockReturnValueOnce(auctionChain({ data: { ...AUCTION, winning_bid_id: 3 } }));
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Cannot re-open a job with an accepted quote." });
  });

  it("returns 400 when the re-open limit is reached", async () => {
    mockFrom.mockReturnValueOnce(auctionChain({ data: { ...AUCTION, reopened_count: 2 } }));
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("re-open limit");
  });

  it("reopens the job and returns the new end date", async () => {
    const chain = updateChain({ error: null });
    mockFrom
      .mockReturnValueOnce(auctionChain({ data: AUCTION }))
      .mockReturnValueOnce(chain);
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.reopened_count).toBe(1);
    expect(typeof json.ends_at).toBe("string");
    const updateArg = chain.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(updateArg.status).toBe("open");
    expect(updateArg.reopened_count).toBe(1);
  });

  it("returns 500 when the update errors", async () => {
    mockFrom
      .mockReturnValueOnce(auctionChain({ data: AUCTION }))
      .mockReturnValueOnce(updateChain({ error: { message: "boom" } }));
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(500);
  });

  it("returns 500 on unexpected error", async () => {
    mockFrom.mockImplementationOnce(() => {
      throw new Error("db down");
    });
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(500);
  });
});
