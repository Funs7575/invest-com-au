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

import { POST } from "@/app/api/quotes/[slug]/reopen/route";
import { isRateLimited } from "@/lib/rate-limit";

function makeReq(body: unknown, slug = "job-abc123"): [NextRequest, { params: Promise<{ slug: string }> }] {
  const req = new Request(`http://localhost/api/quotes/${slug}/reopen`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
  return [req, { params: Promise.resolve({ slug }) }];
}

function auction(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    slug: "job-abc123",
    status: "closed",
    contact_email: "alice@example.com",
    ends_at: new Date(Date.now() - 86400000).toISOString(), // expired yesterday
    reopened_count: 0,
    winning_bid_id: null,
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

describe("POST /api/quotes/[slug]/reopen", () => {
  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValueOnce(true);
    const [req, ctx] = makeReq({ contact_email: "alice@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/quotes/job/reopen", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "!invalid",
    }) as unknown as NextRequest;
    const ctx = { params: Promise.resolve({ slug: "job" }) };
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid format", async () => {
    const [req, ctx] = makeReq({ contact_email: "not-an-email" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when auction not found", async () => {
    dbQueue.push({ data: null });
    const [req, ctx] = makeReq({ contact_email: "alice@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 403 when contact email does not match", async () => {
    dbQueue.push({ data: auction() });
    const [req, ctx] = makeReq({ contact_email: "wrong@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(403);
  });

  it("returns 400 when auction already has a winning bid", async () => {
    dbQueue.push({ data: auction({ winning_bid_id: 10 }) });
    const [req, ctx] = makeReq({ contact_email: "alice@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when reopen limit (2) has been reached", async () => {
    dbQueue.push({ data: auction({ reopened_count: 2 }) });
    const [req, ctx] = makeReq({ contact_email: "alice@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 200 with new ends_at on successful reopen", async () => {
    dbQueue.push({ data: auction() }); // lookup
    dbQueue.push({ error: null });     // update auction

    const [req, ctx] = makeReq({ contact_email: "alice@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; reopened_count: number; ends_at: string };
    expect(body.success).toBe(true);
    expect(body.reopened_count).toBe(1);
    expect(new Date(body.ends_at) > new Date()).toBe(true);
  });
});
