import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();
const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
}));

import { GET, PATCH, DELETE } from "@/app/api/community/threads/[id]/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER_ID = "user-abc";
const THREAD_ID = "thread-123";

function makeParams() {
  return { params: Promise.resolve({ id: THREAD_ID }) };
}

function makeRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/community/threads/${THREAD_ID}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeThread(overrides = {}) {
  return {
    id: THREAD_ID,
    author_id: USER_ID,
    title: "Test thread",
    body: "Test body",
    view_count: 5,
    is_removed: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeSingleBuilder(data: unknown = null, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data, error })),
    maybeSingle: vi.fn(() => Promise.resolve({ data, error })),
  };
}

function makeListBuilder(data: unknown[] = [], error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: vi.fn((cb: (v: { data: unknown[]; error: unknown }) => void) => {
      cb({ data, error });
      return Promise.resolve();
    }),
  };
}

// ── GET tests ──────────────────────────────────────────────────────────────────

describe("GET /api/community/threads/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when thread not found", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder(null, { message: "not found" }));
    const res = await GET(makeRequest("GET"), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns thread with posts and author profiles on success", async () => {
    const thread = makeThread();
    const post = {
      id: "post-1",
      author_id: "author-2",
      thread_id: THREAD_ID,
      body: "A reply",
      is_removed: false,
      created_at: new Date().toISOString(),
    };
    const profile = { user_id: USER_ID, display_name: "Alice", reputation: 10, badge: null, is_moderator: false };

    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "forum_threads" && callCount === 1) {
        return makeSingleBuilder(thread, null);
      }
      if (table === "forum_threads" && callCount === 2) {
        // fire-and-forget view_count update — returns void-like builder
        return { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      }
      if (table === "forum_posts") {
        return makeListBuilder([post]);
      }
      if (table === "forum_user_profiles") {
        return makeListBuilder([profile]);
      }
      return makeSingleBuilder(null, null);
    });

    const res = await GET(makeRequest("GET"), makeParams());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.thread.id).toBe(THREAD_ID);
    expect(data.posts).toHaveLength(1);
  });

  it("returns 500 on unexpected error", async () => {
    mockAdminFrom.mockImplementation(() => { throw new Error("boom"); });
    const res = await GET(makeRequest("GET"), makeParams());
    expect(res.status).toBe(500);
  });
});

// ── PATCH tests ────────────────────────────────────────────────────────────────

describe("PATCH /api/community/threads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID, email: "user@example.com" } }, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("not logged in") });
    const res = await PATCH(makeRequest("PATCH", { title: "New title" }), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await PATCH(makeRequest("PATCH", { title: "New title" }), makeParams());
    expect(res.status).toBe(429);
  });

  it("returns 404 when thread not found", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder(null, { message: "not found" }));
    const res = await PATCH(makeRequest("PATCH", { title: "New title" }), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not author or moderator", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "forum_threads") return makeSingleBuilder({ author_id: "someone-else" }, null);
      // forum_user_profiles: not a moderator
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ data: { is_moderator: false }, error: null })),
      };
    });
    const res = await PATCH(makeRequest("PATCH", { title: "New title" }), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 400 when title is too short", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder({ author_id: USER_ID }, null));
    const res = await PATCH(makeRequest("PATCH", { title: "Hi" }), makeParams());
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is too short", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder({ author_id: USER_ID }, null));
    const res = await PATCH(makeRequest("PATCH", { body: "short" }), makeParams());
    expect(res.status).toBe(400);
  });

  it("returns 400 when no updatable fields provided", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder({ author_id: USER_ID }, null));
    const res = await PATCH(makeRequest("PATCH", {}), makeParams());
    expect(res.status).toBe(400);
  });

  it("updates thread and returns updated data for author", async () => {
    const updated = { id: THREAD_ID, title: "New title", body: "Original body", updated_at: new Date().toISOString() };
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeSingleBuilder({ author_id: USER_ID }, null);
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ data: updated, error: null })),
      };
    });
    const res = await PATCH(makeRequest("PATCH", { title: "New title here" }), makeParams());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.thread.id).toBe(THREAD_ID);
  });

  it("returns 500 when DB update fails", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeSingleBuilder({ author_id: USER_ID }, null);
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ data: null, error: { message: "update failed" } })),
      };
    });
    const res = await PATCH(makeRequest("PATCH", { title: "Valid long title" }), makeParams());
    expect(res.status).toBe(500);
  });
});

// ── DELETE tests ───────────────────────────────────────────────────────────────

describe("DELETE /api/community/threads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID, email: "user@example.com" } }, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("no session") });
    const res = await DELETE(makeRequest("DELETE"), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await DELETE(makeRequest("DELETE"), makeParams());
    expect(res.status).toBe(429);
  });

  it("returns 404 when thread not found", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder(null, { message: "not found" }));
    const res = await DELETE(makeRequest("DELETE"), makeParams());
    expect(res.status).toBe(404);
  });

  it("allows author to soft-delete own thread", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "forum_threads") {
        const fetchBuilder = makeSingleBuilder({ author_id: USER_ID }, null);
        const deleteBuilder = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn(() => Promise.resolve({ error: null })),
        };
        return {
          select: vi.fn().mockReturnValue(fetchBuilder),
          update: vi.fn().mockReturnValue(deleteBuilder),
          eq: vi.fn().mockReturnThis(),
        };
      }
      // forum_user_profiles — not a moderator
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ data: { is_moderator: false }, error: null })),
      };
    });

    const res = await DELETE(makeRequest("DELETE"), makeParams());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("returns 403 when user is not author or moderator", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "forum_threads") return makeSingleBuilder({ author_id: "someone-else" }, null);
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() => Promise.resolve({ data: { is_moderator: false }, error: null })),
      };
    });
    const res = await DELETE(makeRequest("DELETE"), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 500 when soft-delete DB call fails", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeSingleBuilder({ author_id: USER_ID }, null);
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn(() => Promise.resolve({ error: { message: "delete failed" } })),
      };
    });
    const res = await DELETE(makeRequest("DELETE"), makeParams());
    expect(res.status).toBe(500);
  });
});
