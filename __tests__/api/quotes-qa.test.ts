import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockFrom, mockGetUser, mockIsRateLimited } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUser: vi.fn(),
  mockIsRateLimited: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: mockIsRateLimited,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET, POST } from "@/app/api/quotes/[slug]/qa/route";

const SLUG = "find-an-adviser-abc";

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/quotes/" + SLUG + "/qa", {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function ctx() {
  return { params: Promise.resolve({ slug: SLUG }) };
}

// .from("advisor_auctions").select().eq().eq().eq().maybeSingle()
function auctionChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

// GET qa: .select().eq().eq().order() — terminal order resolves
function qaSelectChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => Promise.resolve(result));
  return chain;
}

// advisor lookup: .select().eq().eq().maybeSingle()
function proChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

// insert: .insert().select().single()
function insertChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.insert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

const AUCTION = { id: 11, contact_email: "owner@example.com", contact_name: "Owner" };

describe("GET /api/quotes/[slug]/qa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await GET(makeReq(), ctx());
    expect(res.status).toBe(429);
  });

  it("returns 404 when job not found", async () => {
    mockFrom.mockReturnValueOnce(auctionChain({ data: null }));
    const res = await GET(makeReq(), ctx());
    expect(res.status).toBe(404);
  });

  it("returns the Q&A list", async () => {
    const rows = [{ id: 1, body: "hi", is_question: true }];
    mockFrom
      .mockReturnValueOnce(auctionChain({ data: { id: 11 } }))
      .mockReturnValueOnce(qaSelectChain({ data: rows }));
    const res = await GET(makeReq(), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ qa: rows });
  });

  it("returns empty array when qa data is null", async () => {
    mockFrom
      .mockReturnValueOnce(auctionChain({ data: { id: 11 } }))
      .mockReturnValueOnce(qaSelectChain({ data: null }));
    const res = await GET(makeReq(), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ qa: [] });
  });

  it("returns 500 on unexpected error", async () => {
    mockFrom.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const res = await GET(makeReq(), ctx());
    expect(res.status).toBe(500);
  });
});

describe("POST /api/quotes/[slug]/qa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makeReq({ body: "hello there" }), ctx());
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/quotes/" + SLUG + "/qa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad",
    });
    const res = await POST(req, ctx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when zod fails (body too short)", async () => {
    const res = await POST(makeReq({ body: "ab" }), ctx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when job not found", async () => {
    mockFrom.mockReturnValueOnce(auctionChain({ data: null }));
    const res = await POST(makeReq({ body: "hello there" }), ctx());
    expect(res.status).toBe(404);
  });

  it("returns 401 when neither advisor nor owner auth matches", async () => {
    mockFrom.mockReturnValueOnce(auctionChain({ data: AUCTION }));
    const res = await POST(makeReq({ body: "hello there", contact_email: "wrong@example.com" }), ctx());
    expect(res.status).toBe(401);
  });

  it("posts as the job owner when contact_email matches", async () => {
    const chain = insertChain({ data: { id: 99 }, error: null });
    mockFrom
      .mockReturnValueOnce(auctionChain({ data: AUCTION }))
      .mockReturnValueOnce(chain);
    const res = await POST(makeReq({ body: "owner question", contact_email: "owner@example.com" }), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, id: 99 });
    const insertArg = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertArg.advisor_id).toBeNull();
    expect(insertArg.author_email).toBe("owner@example.com");
  });

  it("posts as an authenticated advisor", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { email: "jane@adv.com" } } });
    const chain = insertChain({ data: { id: 100 }, error: null });
    mockFrom
      .mockReturnValueOnce(auctionChain({ data: AUCTION }))
      .mockReturnValueOnce(proChain({ data: { id: 7, name: "Jane Adviser" } }))
      .mockReturnValueOnce(chain);
    const res = await POST(makeReq({ body: "advisor answer" }), ctx());
    expect(res.status).toBe(200);
    const insertArg = chain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertArg.advisor_id).toBe(7);
  });

  it("returns 500 when the insert errors", async () => {
    mockFrom
      .mockReturnValueOnce(auctionChain({ data: AUCTION }))
      .mockReturnValueOnce(insertChain({ data: null, error: { message: "boom" } }));
    const res = await POST(makeReq({ body: "owner question", contact_email: "owner@example.com" }), ctx());
    expect(res.status).toBe(500);
  });
});
