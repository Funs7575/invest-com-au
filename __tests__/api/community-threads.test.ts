import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockAuth = { getUser: vi.fn() };
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: mockAuth })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const { mockGateForumContent, mockIsCommunityPostingDisabled } = vi.hoisted(() => ({
  mockGateForumContent: vi.fn(),
  mockIsCommunityPostingDisabled: vi.fn(),
}));
vi.mock("@/lib/community/moderation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/community/moderation")>();
  return {
    ...actual,
    gateForumContent: (...args: unknown[]) => mockGateForumContent(...args),
    isCommunityPostingDisabled: () => mockIsCommunityPostingDisabled(),
  };
});

vi.mock("@/lib/posthog/server", () => ({ captureServerEvent: vi.fn() }));

import { GET, POST } from "@/app/api/community/threads/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const TEST_USER = {
  id: "user-thread-xyz",
  email: "threader@example.com",
  user_metadata: {},
};

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/community/threads");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

function makePostReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/community/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeChain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "upsert", "eq", "order", "range"]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve(result));
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return c;
}

// GET query chain returns { data, error, count }
function makeGetChain(result: { data: unknown; error: unknown; count: number | null }) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "range"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return c;
}

const SAMPLE_THREADS = [
  {
    id: "t1",
    title: "Test thread",
    slug: "test-thread",
    author_name: "Alice",
    reply_count: 3,
    created_at: "2026-04-01T00:00:00Z",
    is_pinned: false,
  },
];

const CREATED_THREAD = {
  id: "t-new",
  slug: "how-do-i-invest",
  title: "How do I invest?",
  created_at: "2026-04-28T00:00:00Z",
};

const CATEGORY = { id: "cat-1" };

const VALID_POST_BODY = {
  category_slug: "investing",
  title: "How do I invest in ETFs?",
  body: "I am new to investing and want to learn about ETFs.",
};

// ── Tests: GET ─────────────────────────────────────────────────────────────────

describe("GET /api/community/threads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminFrom.mockReturnValue(
      makeGetChain({ data: SAMPLE_THREADS, error: null, count: 1 }),
    );
  });

  it("returns 200 with threads and total when no params provided", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.threads)).toBe(true);
    expect(typeof json.total).toBe("number");
    expect(json.page).toBe(1);
  });

  it("does NOT select or serialize author_id on the thread list (P1/P3 cross-user leak)", async () => {
    const chain = makeGetChain({
      // Simulate a row that still carries author_id in the fixture to prove the
      // route never echoes it back even if present.
      data: [{ ...SAMPLE_THREADS[0], author_id: "leaked-auth-uid" }],
      error: null,
      count: 1,
    });
    mockAdminFrom.mockReset();
    mockAdminFrom.mockReturnValue(chain);

    const res = await GET(makeGet());
    expect(res.status).toBe(200);

    // The select() column list must not request author_id.
    const selectArg = (chain.select as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(typeof selectArg).toBe("string");
    expect(selectArg).not.toContain("author_id");
    // Display label is still selected.
    expect(selectArg).toContain("author_name");
  });

  it("returns 404 when category slug is not found", async () => {
    // First call = category lookup → not found
    mockAdminFrom.mockReset();
    mockAdminFrom.mockImplementationOnce(() =>
      makeChain({ data: null, error: { message: "not found" } }),
    );
    const res = await GET(makeGet({ category: "nonexistent" }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/category not found/i);
  });

  it("returns 200 filtered by category when category param is valid", async () => {
    mockAdminFrom.mockReset();
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ data: CATEGORY, error: null })) // category lookup
      .mockImplementationOnce(() =>
        makeGetChain({ data: SAMPLE_THREADS, error: null, count: 1 }),
      ); // thread list
    const res = await GET(makeGet({ category: "investing" }));
    expect(res.status).toBe(200);
  });

  it("accepts sort=popular without error", async () => {
    const res = await GET(makeGet({ sort: "popular" }));
    expect(res.status).toBe(200);
  });

  it("accepts sort=unanswered without error", async () => {
    const res = await GET(makeGet({ sort: "unanswered" }));
    expect(res.status).toBe(200);
  });

  it("respects page and limit params", async () => {
    const res = await GET(makeGet({ page: "2", limit: "10" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.page).toBe(2);
    expect(json.limit).toBe(10);
  });

  it("caps limit at 50", async () => {
    const res = await GET(makeGet({ limit: "999" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.limit).toBe(50);
  });

  it("returns 500 when DB query fails", async () => {
    mockAdminFrom.mockReset();
    mockAdminFrom.mockReturnValue(
      makeGetChain({ data: null, error: { message: "DB down" }, count: null }),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to fetch threads/i);
  });

  // ── NaN guards (D-03) ──────────────────────────────────────────────────────
  // Math.max(1, NaN) === NaN, so the clamps don't catch non-numeric input on
  // their own — the route must coerce to defaults before .range().

  it("coerces non-numeric page to 1 (range starts at offset 0)", async () => {
    const chain = makeGetChain({ data: SAMPLE_THREADS, error: null, count: 1 });
    mockAdminFrom.mockReturnValue(chain);
    const res = await GET(makeGet({ page: "abc" }));
    expect(res.status).toBe(200);
    expect(chain.range).toHaveBeenCalledWith(0, 19);
  });

  it("coerces non-numeric limit to default 20", async () => {
    const chain = makeGetChain({ data: SAMPLE_THREADS, error: null, count: 1 });
    mockAdminFrom.mockReturnValue(chain);
    const res = await GET(makeGet({ limit: "abc" }));
    expect(res.status).toBe(200);
    expect(chain.range).toHaveBeenCalledWith(0, 19);
  });

  it("coerces both non-numeric page and limit to defaults", async () => {
    const chain = makeGetChain({ data: SAMPLE_THREADS, error: null, count: 1 });
    mockAdminFrom.mockReturnValue(chain);
    const res = await GET(makeGet({ limit: "abc", page: "abc" }));
    expect(res.status).toBe(200);
    expect(chain.range).toHaveBeenCalledWith(0, 19);
  });
});

// ── Tests: POST ────────────────────────────────────────────────────────────────

describe("POST /api/community/threads", () => {
  function setupSuccessPath() {
    let callIndex = 0;
    mockAdminFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return makeChain({ data: CATEGORY, error: null }); // category lookup
      if (callIndex === 2) return makeChain({ data: CREATED_THREAD, error: null }); // insert thread
      if (callIndex === 3) return makeChain({ data: { thread_count: 4 }, error: null }); // select cat thread_count
      if (callIndex === 4) return makeChain({ error: null }); // update category
      if (callIndex === 5) return makeChain({ error: null }); // upsert profile
      if (callIndex === 6) return makeChain({ data: { thread_count: 1 }, error: null }); // select profile
      return makeChain({ error: null }); // update profile thread_count
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER }, error: null });
    mockIsRateLimited.mockResolvedValue(false);
    mockIsCommunityPostingDisabled.mockResolvedValue(false);
    mockGateForumContent.mockResolvedValue({ action: "publish", riskScore: 0, reasons: ["clean"] });
    setupSuccessPath();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makePostReq(VALID_POST_BODY));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/authentication required/i);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePostReq(VALID_POST_BODY));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/too many threads/i);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makePostReq({ title: "Only title" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing required fields/i);
  });

  it("returns 400 when title is too short (< 5 chars)", async () => {
    const res = await POST(makePostReq({ ...VALID_POST_BODY, title: "Hi" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/5-200 characters/i);
  });

  it("returns 400 when body is too short (< 10 chars)", async () => {
    const res = await POST(makePostReq({ ...VALID_POST_BODY, body: "Short" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/10-10000 characters/i);
  });

  it("returns 404 when category slug is not found", async () => {
    mockAdminFrom.mockReset();
    mockAdminFrom.mockImplementationOnce(() =>
      makeChain({ data: null, error: { message: "no category" } }),
    );
    const res = await POST(makePostReq(VALID_POST_BODY));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/category not found/i);
  });

  it("returns 500 when thread insert fails", async () => {
    mockAdminFrom.mockReset();
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ data: CATEGORY, error: null })) // category
      .mockImplementationOnce(() =>
        makeChain({ data: null, error: { message: "unique violation" } }),
      ); // insert
    const res = await POST(makePostReq(VALID_POST_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to create thread/i);
  });

  it("returns 201 with thread data on success", async () => {
    const res = await POST(makePostReq(VALID_POST_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.thread).toMatchObject({ id: "t-new", slug: "how-do-i-invest" });
  });

  it("generates slug from title (lowercase, hyphens)", async () => {
    setupSuccessPath();
    await POST(makePostReq({ ...VALID_POST_BODY, title: "Hello World Topic" }));
    // Slug is generated internally but we can verify the thread was created
    const insertChain = mockAdminFrom.mock.results[1].value as { insert: ReturnType<typeof vi.fn> };
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "hello-world-topic" }),
    );
  });

  it("falls back to Anonymous when user has no name metadata or email", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { ...TEST_USER, email: undefined, user_metadata: {} } },
      error: null,
    });
    setupSuccessPath();
    const res = await POST(makePostReq(VALID_POST_BODY));
    expect(res.status).toBe(201);
    const insertChain = mockAdminFrom.mock.results[1].value as { insert: ReturnType<typeof vi.fn> };
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ author_name: "Anonymous" }),
    );
  });

  // ── Publish gate (Phase 0 moderation) ────────────────────────────────────────

  it("returns 503 when the community_posting kill switch is on", async () => {
    mockIsCommunityPostingDisabled.mockResolvedValue(true);
    const res = await POST(makePostReq(VALID_POST_BODY));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/paused/i);
    // Nothing persisted — not even the category lookup runs.
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 400 and persists nothing when the gate rejects", async () => {
    mockGateForumContent.mockResolvedValue({
      action: "reject",
      riskScore: 80,
      reasons: ["scam_terminology"],
    });
    const res = await POST(makePostReq(VALID_POST_BODY));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/guidelines/i);
    // Only the category lookup ran — no insert.
    expect(mockAdminFrom).toHaveBeenCalledTimes(1);
  });

  it("publishes visible content with is_removed=false", async () => {
    const res = await POST(makePostReq(VALID_POST_BODY));
    expect(res.status).toBe(201);
    const insertChain = mockAdminFrom.mock.results[1].value as { insert: ReturnType<typeof vi.fn> };
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_removed: false }),
    );
  });

  it("holds escalated content: hidden insert + forum_reports queue row + 202, no counter bumps", async () => {
    mockGateForumContent.mockResolvedValue({
      action: "hold",
      riskScore: 40,
      reasons: ["forward_looking_price_target"],
    });
    mockAdminFrom.mockReset();
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ data: CATEGORY, error: null })) // category
      .mockImplementationOnce(() => makeChain({ data: CREATED_THREAD, error: null })) // insert
      .mockImplementationOnce(() => makeChain({ error: null })); // forum_reports upsert

    const res = await POST(makePostReq(VALID_POST_BODY));
    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.pending_review).toBe(true);
    expect(json.thread).toBeNull();

    const insertChain = mockAdminFrom.mock.results[1].value as { insert: ReturnType<typeof vi.fn> };
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_removed: true }),
    );
    const reportChain = mockAdminFrom.mock.results[2].value as { upsert: ReturnType<typeof vi.fn> };
    expect(reportChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        target_type: "thread",
        status: "open",
        reason: expect.stringMatching(/^auto_moderation:/),
      }),
      expect.anything(),
    );
    // Category counter + profile bumps must be skipped for held content.
    expect(mockAdminFrom).toHaveBeenCalledTimes(3);
  });
});
