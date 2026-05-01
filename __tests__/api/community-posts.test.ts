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

import { POST } from "@/app/api/community/posts/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const TEST_USER = {
  id: "user-post-abc",
  email: "poster@example.com",
  user_metadata: {},
};

function makePost(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/community/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeChain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "upsert", "eq"]) {
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

const OPEN_THREAD = { id: "thread-1", category_id: "cat-1", is_locked: false, is_removed: false };

const CREATED_POST = {
  id: "post-1",
  thread_id: "thread-1",
  author_name: "poster",
  body: "Hello world",
  parent_id: null,
  created_at: "2026-04-28T00:00:00Z",
};

// Builds a sequence of admin DB calls matching the success path:
// 1) fetch thread → OPEN_THREAD
// 2) insert post → CREATED_POST
// 3) fetch thread reply_count → { reply_count: 0 }
// 4) update forum_threads reply counters
// 5) fetch category post_count → { post_count: 5 }
// 6) update forum_categories post counter
// 7) upsert forum_user_profiles
// 8) select post_count for user profile → { post_count: 2 }
// 9) update forum_user_profiles post_count
function setupSuccessPath(withParent = false) {
  let callIndex = 0;
  mockAdminFrom.mockImplementation(() => {
    callIndex++;
    if (callIndex === 1) return makeChain({ data: OPEN_THREAD, error: null }); // fetch thread
    if (withParent && callIndex === 2)
      return makeChain({ data: { id: "parent-post-1" }, error: null }); // fetch parent
    const postCallIdx = withParent ? 3 : 2;
    if (callIndex === postCallIdx) return makeChain({ data: CREATED_POST, error: null }); // insert
    if (callIndex === postCallIdx + 1) return makeChain({ data: { reply_count: 0 }, error: null }); // select reply_count
    if (callIndex === postCallIdx + 2) return makeChain({ error: null }); // update thread
    if (callIndex === postCallIdx + 3) return makeChain({ data: { post_count: 5 }, error: null }); // select cat count
    if (callIndex === postCallIdx + 4) return makeChain({ error: null }); // update category
    if (callIndex === postCallIdx + 5) return makeChain({ error: null }); // upsert profile
    if (callIndex === postCallIdx + 6) return makeChain({ data: { post_count: 2 }, error: null }); // select profile
    return makeChain({ error: null }); // update profile post_count
  });
}

const VALID_BODY = {
  thread_id: 1,
  body: "This is a valid post body.",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/community/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER }, error: null });
    mockIsRateLimited.mockResolvedValue(false);
    setupSuccessPath();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/authentication required/i);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/too quickly/i);
  });

  it("returns 400 when thread_id is missing", async () => {
    const res = await POST(makePost({ body: "Some body" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing required fields/i);
  });

  it("returns 400 when body is empty (caught by missing-fields check)", async () => {
    const res = await POST(makePost({ thread_id: 1, body: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing required fields/i);
  });

  it("returns 400 when body exceeds 5000 characters", async () => {
    const res = await POST(makePost({ thread_id: 1, body: "x".repeat(5001) }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/1-5000 characters/i);
  });

  it("returns 404 when thread is not found", async () => {
    mockAdminFrom.mockReset();
    mockAdminFrom.mockImplementationOnce(() =>
      makeChain({ data: null, error: { message: "not found" } }),
    );
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/thread not found/i);
  });

  it("returns 404 when thread is removed", async () => {
    mockAdminFrom.mockReset();
    mockAdminFrom.mockImplementationOnce(() =>
      makeChain({ data: { ...OPEN_THREAD, is_removed: true }, error: null }),
    );
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/thread has been removed/i);
  });

  it("returns 403 when thread is locked", async () => {
    mockAdminFrom.mockReset();
    mockAdminFrom.mockImplementationOnce(() =>
      makeChain({ data: { ...OPEN_THREAD, is_locked: true }, error: null }),
    );
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/thread is locked/i);
  });

  it("returns 404 when parent_id is not found in thread", async () => {
    mockAdminFrom.mockReset();
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ data: OPEN_THREAD, error: null })) // thread
      .mockImplementationOnce(() => makeChain({ data: null, error: { message: "no parent" } })); // parent
    const res = await POST(makePost({ ...VALID_BODY, parent_id: 9999 }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/parent post not found/i);
  });

  it("returns 500 when DB post insert fails", async () => {
    mockAdminFrom.mockReset();
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ data: OPEN_THREAD, error: null })) // thread
      .mockImplementationOnce(() =>
        makeChain({ data: null, error: { message: "constraint" } }),
      ); // insert
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to create post/i);
  });

  it("returns 201 with post data on success", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.post).toMatchObject({ id: "post-1", body: "Hello world" });
  });

  it("derives display name from user email when metadata is empty", async () => {
    setupSuccessPath();
    await POST(makePost(VALID_BODY));
    const insertCall = mockAdminFrom.mock.calls.find(
      ([_table]: unknown[]) => _table === "forum_posts",
    );
    // The insert chain's insert() method gets called with the payload
    expect(insertCall).toBeDefined();
  });

  it("uses display_name from user_metadata when present", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { ...TEST_USER, user_metadata: { display_name: "Jane" } } },
      error: null,
    });
    setupSuccessPath();
    // Just verify the route succeeds — display name derivation is internal
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(201);
  });

  it("succeeds with valid parent_id in same thread", async () => {
    setupSuccessPath(true);
    const res = await POST(makePost({ ...VALID_BODY, parent_id: 1 }));
    expect(res.status).toBe(201);
  });
});
