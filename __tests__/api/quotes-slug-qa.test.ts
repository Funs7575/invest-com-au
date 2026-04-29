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

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
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

import { GET, POST } from "@/app/api/quotes/[slug]/qa/route";
import { isRateLimited } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGetReq(slug = "job-abc123"): [NextRequest, { params: Promise<{ slug: string }> }] {
  const req = new Request(`http://localhost/api/quotes/${slug}/qa`, {
    headers: { "x-forwarded-for": "1.2.3.4" },
  }) as unknown as NextRequest;
  return [req, { params: Promise.resolve({ slug }) }];
}

function makePostReq(body: unknown, slug = "job-abc123"): [NextRequest, { params: Promise<{ slug: string }> }] {
  const req = new Request(`http://localhost/api/quotes/${slug}/qa`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
  return [req, { params: Promise.resolve({ slug }) }];
}

function mockNoUser() {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  } as never);
}

function mockUser(email: string) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { email } } }) },
  } as never);
}

const AUCTION = {
  id: 1,
  contact_email: "alice@example.com",
  contact_name: "Alice Smith",
};

const QA_ROW = {
  id: 5,
  auction_id: 1,
  advisor_id: null,
  author_display_name: "Alice Smith",
  body: "When can you start?",
  is_question: true,
  parent_id: null,
  created_at: new Date().toISOString(),
  professionals: null,
};

beforeEach(() => {
  dbQueue = [];
  dbIdx = 0;
  vi.clearAllMocks();
  vi.mocked(isRateLimited).mockResolvedValue(false);
  mockNoUser();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/quotes/[slug]/qa", () => {
  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValueOnce(true);
    const [req, ctx] = makeGetReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(429);
  });

  it("returns 404 when job not found", async () => {
    dbQueue.push({ data: null });
    const [req, ctx] = makeGetReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 200 with qa entries when job exists", async () => {
    dbQueue.push({ data: { id: 1 } }); // auction
    dbQueue.push({ data: [QA_ROW] });   // qa rows

    const [req, ctx] = makeGetReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json() as { qa: unknown[] };
    expect(body.qa).toHaveLength(1);
  });

  it("returns 200 with empty qa when none exist", async () => {
    dbQueue.push({ data: { id: 1 } });
    dbQueue.push({ data: [] });

    const [req, ctx] = makeGetReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json() as { qa: unknown[] };
    expect(body.qa).toHaveLength(0);
  });
});

describe("POST /api/quotes/[slug]/qa", () => {
  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValueOnce(true);
    const [req, ctx] = makePostReq({ body: "Hello there" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/quotes/job/qa", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "!bad",
    }) as unknown as NextRequest;
    const ctx = { params: Promise.resolve({ slug: "job" }) };
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is too short", async () => {
    dbQueue.push({ data: AUCTION });
    const [req, ctx] = makePostReq({ body: "Hi" }); // < 4 chars
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when job not found", async () => {
    dbQueue.push({ data: null }); // auction maybySingle → null
    const [req, ctx] = makePostReq({ body: "Hello world" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 401 when no advisor session and no contact_email", async () => {
    dbQueue.push({ data: AUCTION });
    // No user, no contact_email supplied
    const [req, ctx] = makePostReq({ body: "Hello world" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });

  it("returns 401 when contact_email does not match auction", async () => {
    dbQueue.push({ data: AUCTION });
    const [req, ctx] = makePostReq({ body: "Hello world", contact_email: "wrong@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });

  it("returns 200 when owner posts via contact_email match", async () => {
    dbQueue.push({ data: AUCTION });         // auction
    dbQueue.push({ data: { id: 7 } });       // insert → single

    const [req, ctx] = makePostReq({
      body: "When can you start?",
      contact_email: "alice@example.com",
      is_question: true,
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean; id: number };
    expect(json.success).toBe(true);
    expect(json.id).toBe(7);
  });

  it("returns 200 when authenticated advisor posts", async () => {
    mockUser("bob@firm.com");
    dbQueue.push({ data: AUCTION });                            // auction
    dbQueue.push({ data: { id: 99, name: "Bob Advisor" } });   // professionals lookup
    dbQueue.push({ data: { id: 12 } });                        // insert → single

    const [req, ctx] = makePostReq({ body: "Great question!" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean; id: number };
    expect(json.success).toBe(true);
    expect(json.id).toBe(12);
  });

  it("falls back to owner auth when advisor email not in professionals", async () => {
    mockUser("unknown@firm.com");
    dbQueue.push({ data: AUCTION });  // auction
    dbQueue.push({ data: null });     // professionals → not found
    // Falls back to owner check — contact_email not provided → 401
    const [req, ctx] = makePostReq({ body: "Hello world" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });
});
