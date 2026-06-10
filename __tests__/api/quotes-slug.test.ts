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

import { GET } from "@/app/api/quotes/[slug]/route";
import { isRateLimited } from "@/lib/rate-limit";

function makeReq(slug = "job-abc123"): [NextRequest, { params: Promise<{ slug: string }> }] {
  const req = new Request(`http://localhost/api/quotes/${slug}`, {
    headers: { "x-forwarded-for": "1.2.3.4" },
  }) as unknown as NextRequest;
  return [req, { params: Promise.resolve({ slug }) }];
}

function auction(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    slug: "job-abc123",
    job_title: "Help with SMSF",
    job_description: "Need an SMSF accountant",
    budget_band: "2000-5000",
    advisor_types: ["smsf_accountant"],
    location: "Sydney",
    contact_name: "Alice Smith",
    status: "open",
    ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    winning_bid_id: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  dbQueue = [];
  dbIdx = 0;
  vi.clearAllMocks();
  vi.mocked(isRateLimited).mockResolvedValue(false);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/quotes/[slug]", () => {
  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValueOnce(true);
    const [req, ctx] = makeReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(429);
  });

  it("returns 404 when job not found", async () => {
    dbQueue.push({ data: null }); // maybySingle returns null
    const [req, ctx] = makeReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 200 with job and bids on success", async () => {
    dbQueue.push({ data: auction() }); // advisor_auctions
    dbQueue.push({ data: [{ id: 10, bid_amount: 1500, status: "active" }] }); // advisor_auction_bids

    const [req, ctx] = makeReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json() as { job: { slug: string }; bids: unknown[] };
    expect(body.job.slug).toBe("job-abc123");
    expect(body.bids).toHaveLength(1);
  });

  it("returns 200 with empty bids when none exist", async () => {
    dbQueue.push({ data: auction() });
    dbQueue.push({ data: [] }); // no bids

    const [req, ctx] = makeReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json() as { bids: unknown[] };
    expect(body.bids).toHaveLength(0);
  });

  it("returns 500 when DB throws", async () => {
    // Force a throw by providing a bad chain (will throw on await)
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockImplementationOnce(() => ({
      from: () => { throw new Error("connection lost"); },
    } as never));

    const [req, ctx] = makeReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(500);
  });
});
