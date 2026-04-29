import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "crypto";
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

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn().mockResolvedValue(false),
}));

// ─── DB queue ────────────────────────────────────────────────────────────────

interface DbResult {
  data?: unknown;
  error?: { message: string; code?: string } | null;
}

let dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const chain: Record<string, unknown> = {};
  const methods = ["select","update","insert","eq","neq","lt","lte","gte","not","in","or","order","limit","maybeSingle","single"];
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

import { POST } from "@/app/api/quotes/[slug]/review/route";
import { isRateLimited } from "@/lib/rate-limit";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEST_SECRET = "test-secret";

function makeToken(auctionId: number, email: string) {
  return createHmac("sha256", TEST_SECRET)
    .update(`${auctionId}|${email.toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}

function makeReq(body: unknown, slug = "job-abc123"): [NextRequest, { params: Promise<{ slug: string }> }] {
  const req = new Request(`http://localhost/api/quotes/${slug}/review`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
  return [req, { params: Promise.resolve({ slug }) }];
}

const AUCTION = {
  id: 1,
  contact_email: "alice@example.com",
  winning_bid_id: 10,
};

beforeEach(() => {
  dbQueue = [];
  dbIdx = 0;
  vi.clearAllMocks();
  vi.mocked(isRateLimited).mockResolvedValue(false);
  process.env.CRON_SECRET = TEST_SECRET;
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/quotes/[slug]/review", () => {
  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValueOnce(true);
    const [req, ctx] = makeReq({ token: "x".repeat(8), reviewer_email: "alice@example.com", rating: 5 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/quotes/job/review", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "!bad-json",
    }) as unknown as NextRequest;
    const ctx = { params: Promise.resolve({ slug: "job" }) };
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when schema validation fails (token too short)", async () => {
    const [req, ctx] = makeReq({ token: "short", reviewer_email: "alice@example.com", rating: 5 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when auction not found", async () => {
    dbQueue.push({ data: null });
    const [req, ctx] = makeReq({ token: "x".repeat(32), reviewer_email: "alice@example.com", rating: 5 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 400 when auction has no winning bid", async () => {
    dbQueue.push({ data: { ...AUCTION, winning_bid_id: null } });
    const [req, ctx] = makeReq({ token: "x".repeat(32), reviewer_email: "alice@example.com", rating: 5 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 403 when reviewer email does not match auction contact", async () => {
    dbQueue.push({ data: AUCTION });
    const [req, ctx] = makeReq({ token: "x".repeat(32), reviewer_email: "wrong@example.com", rating: 5 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(403);
  });

  it("returns 403 when token is invalid", async () => {
    dbQueue.push({ data: AUCTION });
    const badToken = "a".repeat(32);
    const [req, ctx] = makeReq({ token: badToken, reviewer_email: "alice@example.com", rating: 5 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(403);
  });

  it("returns 404 when winning bid not found", async () => {
    dbQueue.push({ data: AUCTION });
    dbQueue.push({ data: null }); // bid maybySingle → null
    const validToken = makeToken(AUCTION.id, "alice@example.com");
    const [req, ctx] = makeReq({ token: validToken, reviewer_email: "alice@example.com", rating: 5 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 409 when reviewer has already submitted a review (23505)", async () => {
    dbQueue.push({ data: AUCTION });
    dbQueue.push({ data: { advisor_id: "adv-1" } });
    dbQueue.push({ error: { message: "duplicate key", code: "23505" } });
    const validToken = makeToken(AUCTION.id, "alice@example.com");
    const [req, ctx] = makeReq({ token: validToken, reviewer_email: "alice@example.com", rating: 4 });
    const res = await POST(req, ctx);
    expect(res.status).toBe(409);
  });

  it("returns 200 on successful review submission", async () => {
    dbQueue.push({ data: AUCTION });
    dbQueue.push({ data: { advisor_id: "adv-1" } });
    dbQueue.push({ error: null });
    const validToken = makeToken(AUCTION.id, "alice@example.com");
    const [req, ctx] = makeReq({
      token: validToken,
      reviewer_email: "alice@example.com",
      rating: 5,
      body: "Great service!",
      reviewer_display_name: "Alice",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean };
    expect(json.success).toBe(true);
  });
});
