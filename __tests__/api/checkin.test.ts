import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockIsRateLimited, mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false),
  mockGetUser: vi.fn<
    () => Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }>
  >(async () => ({ data: { user: { id: "u1", email: "u@e.com" } }, error: null })),
  mockFrom: vi.fn(() => makeChain()),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

/**
 * withValidatedBody mock — parses with the real Zod schema from the route.
 */
vi.mock("@/lib/validation/withValidatedBody", () => ({
  withValidatedBody: (
    schema: {
      safeParse: (
        v: unknown,
      ) => { success: boolean; data?: unknown; error?: { issues: Array<{ message: string }> } };
    },
    handler: (req: NextRequest, body: unknown) => unknown,
  ) =>
    async (req: NextRequest) => {
      let rawBody: unknown;
      try {
        rawBody = await req.json();
      } catch {
        const { NextResponse } = await import("next/server");
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
      const parsed = schema.safeParse(rawBody);
      if (!parsed.success) {
        const { NextResponse } = await import("next/server");
        const firstMsg = parsed.error?.issues[0]?.message ?? "Validation error";
        return NextResponse.json(
          { error: firstMsg, code: "validation_error", issues: parsed.error?.issues ?? [] },
          { status: 400 },
        );
      }
      return handler(req, parsed.data);
    },
}));

vi.mock("@/lib/streak", () => ({
  computeNewStreakCount: vi.fn(
    (existing: { check_in_date: string; streak_count: number }[], _today: string) => {
      if (existing.length === 0) return 1;
      return existing[0]!.streak_count + 1;
    },
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChain(res: { data?: unknown; error?: unknown } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "range", "maybeSingle", "single", "filter",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
  chain.catch = () => chain;
  return chain;
}

const TODAY = new Date().toISOString().slice(0, 10);
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

function makePostReq(body?: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/checkin", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeGetReq(ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/checkin", {
    method: "GET",
    headers: { "x-forwarded-for": ip },
  });
}

// ── Route under test (imported after all mocks) ───────────────────────────────
import { POST, GET } from "@/app/api/checkin/route";

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/checkin
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/checkin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePostReq({ source: "article_read" }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/too many requests/i);
  });

  it("passes the correct rate-limit key", async () => {
    // Rate limited short-circuits before auth — just check key format
    mockIsRateLimited.mockResolvedValue(true);
    await POST(makePostReq({ source: "article_read" }, "5.5.5.5"));
    expect(mockIsRateLimited).toHaveBeenCalledWith("checkin:5.5.5.5", 20, 60);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    // No existing checkins needed — unauthenticated returns early
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    const res = await POST(makePostReq({ source: "article_read" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthenticated/i);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/checkin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid source enum", async () => {
    const res = await POST(makePostReq({ source: "invalid_source" }));
    expect(res.status).toBe(400);
  });

  it("uses default source 'article_read' when source is omitted", async () => {
    // No existing checkins → new checkin branch
    let callNum = 0;
    const upsertCalls: unknown[] = [];
    mockFrom.mockImplementation(() => {
      callNum++;
      const chain = makeChain({ data: [], error: null });
      if (callNum === 2) {
        // Second call is the upsert
        const upsertFn = chain.upsert as ReturnType<typeof vi.fn>;
        upsertFn.mockImplementation((v: unknown) => {
          upsertCalls.push(v);
          return chain;
        });
      }
      return chain;
    });
    await POST(makePostReq({}));
    const upserted = upsertCalls[0] as Record<string, unknown>;
    expect(upserted?.source).toBe("article_read");
  });

  it("returns 200 with isNew=false when already checked in today", async () => {
    // Simulate existing checkin today
    mockFrom.mockReturnValue(
      makeChain({
        data: [{ check_in_date: TODAY, streak_count: 3 }],
        error: null,
      }),
    );
    const res = await POST(makePostReq({ source: "article_read" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isNew).toBe(false);
    expect(body.streak).toBe(3);
  });

  it("returns 500 when upsert fails", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      // First call: fetch existing (no checkins today)
      if (call === 1) return makeChain({ data: [{ check_in_date: YESTERDAY, streak_count: 2 }], error: null });
      // Second call: upsert fails
      return makeChain({ data: null, error: { message: "upsert boom" } });
    });
    const res = await POST(makePostReq({ source: "calculator" }));
    expect(res.status).toBe(500);
  });

  it("returns 200 with isNew=true on first ever checkin", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: [], error: null }); // no prior checkins
      return makeChain({ data: null, error: null }); // upsert success
    });
    const res = await POST(makePostReq({ source: "watchlist" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isNew).toBe(true);
    expect(body.streak).toBe(1);
  });

  it("returns 200 with extended streak when previous checkin was yesterday", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1)
        return makeChain({
          data: [{ check_in_date: YESTERDAY, streak_count: 4 }],
          error: null,
        });
      return makeChain({ data: null, error: null });
    });
    const res = await POST(makePostReq({ source: "quiz" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isNew).toBe(true);
    expect(body.streak).toBe(5); // mock computeNewStreakCount returns existing.streak_count + 1
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/checkin
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/checkin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  });

  it("returns { streak: 0 } when rate-limited (no error status)", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.streak).toBe(0);
  });

  it("returns { streak: 0 } when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.streak).toBe(0);
  });

  it("returns { streak: 0 } when user has no checkins", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.streak).toBe(0);
  });

  it("returns active streak when last checkin was today", async () => {
    mockFrom.mockReturnValue(makeChain({ data: { check_in_date: TODAY, streak_count: 7 }, error: null }));
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.streak).toBe(7);
  });

  it("returns active streak when last checkin was yesterday", async () => {
    mockFrom.mockReturnValue(makeChain({ data: { check_in_date: YESTERDAY, streak_count: 5 }, error: null }));
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.streak).toBe(5);
  });

  it("returns { streak: 0 } when last checkin was more than 1 day ago (streak broken)", async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
    mockFrom.mockReturnValue(makeChain({ data: { check_in_date: twoDaysAgo, streak_count: 10 }, error: null }));
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.streak).toBe(0);
  });
});
