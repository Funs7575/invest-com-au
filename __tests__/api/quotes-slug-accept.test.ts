import { describe, it, expect, vi, beforeEach } from "vitest";
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

vi.mock("@/lib/quote-emails", () => ({
  sendAdvisorBidAcceptedEmail: vi.fn().mockResolvedValue(undefined),
}));

// ─── DB queue ────────────────────────────────────────────────────────────────

interface DbResult {
  data?: unknown;
  error?: { message: string } | null;
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

import { POST } from "@/app/api/quotes/[slug]/accept/route";
import { isRateLimited } from "@/lib/rate-limit";

function makeReq(body: unknown, slug = "job-abc123"): [NextRequest, { params: Promise<{ slug: string }> }] {
  const req = new Request(`http://localhost/api/quotes/${slug}/accept`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
  return [req, { params: Promise.resolve({ slug }) }];
}

const AUCTION = {
  id: 1,
  slug: "job-abc123",
  contact_email: "alice@example.com",
  contact_name: "Alice Smith",
  status: "open",
};

const BID = {
  id: 10,
  advisor_id: "adv-1",
  bid_amount: 1500,
  auction_id: 1,
  status: "active",
};

beforeEach(() => {
  dbQueue = [];
  dbIdx = 0;
  vi.clearAllMocks();
  vi.mocked(isRateLimited).mockResolvedValue(false);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/quotes/[slug]/accept", () => {
  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValueOnce(true);
    const [req, ctx] = makeReq({ bid_id: 10, contact_email: "alice@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/quotes/job/accept", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "not-json",
    }) as unknown as NextRequest;
    const ctx = { params: Promise.resolve({ slug: "job" }) };
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when bid_id is missing", async () => {
    const [req, ctx] = makeReq({ contact_email: "alice@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when auction not found", async () => {
    dbQueue.push({ data: null }); // maybySingle → null
    const [req, ctx] = makeReq({ bid_id: 10, contact_email: "alice@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 403 when contact email does not match", async () => {
    dbQueue.push({ data: AUCTION });
    const [req, ctx] = makeReq({ bid_id: 10, contact_email: "wrong@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(403);
  });

  it("returns 400 when auction is not open", async () => {
    dbQueue.push({ data: { ...AUCTION, status: "awarded" } });
    const [req, ctx] = makeReq({ bid_id: 10, contact_email: "alice@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when bid not found in this auction", async () => {
    dbQueue.push({ data: AUCTION });
    dbQueue.push({ data: null }); // bid maybySingle → null
    const [req, ctx] = makeReq({ bid_id: 99, contact_email: "alice@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 200 with winning_bid_id on successful accept", async () => {
    dbQueue.push({ data: AUCTION });               // auction lookup
    dbQueue.push({ data: BID });                   // bid lookup
    dbQueue.push({ error: null });                 // update bid → won
    dbQueue.push({ error: null });                 // update other bids → lost
    dbQueue.push({ error: null });                 // update auction → awarded
    dbQueue.push({ data: { name: "Bob", email: "bob@firm.com", type: "smsf_accountant" } }); // advisor

    const [req, ctx] = makeReq({ bid_id: 10, contact_email: "alice@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; winning_bid_id: number };
    expect(body.success).toBe(true);
    expect(body.winning_bid_id).toBe(10);
  });
});
