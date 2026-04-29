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

import { PATCH, DELETE } from "@/app/api/community/posts/[id]/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER_ID = "user-abc";
const POST_ID = "post-123";

function makeRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/community/posts/${POST_ID}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeParams() {
  return { params: Promise.resolve({ id: POST_ID }) };
}

function makePostBuilder(post: unknown = null, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data: post, error })),
  };
}

function makeUpdateBuilder(error: unknown = null) {
  const builder = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(() =>
      Promise.resolve({
        data: { id: POST_ID, body: "updated text", updated_at: new Date().toISOString() },
        error,
      }),
    ),
  };
  return builder;
}

function makeDeleteBuilder(error: unknown = null) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn(() => Promise.resolve({ error })),
  };
}

// ── PATCH tests ────────────────────────────────────────────────────────────────

describe("PATCH /api/community/posts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID, email: "user@example.com" } }, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("not logged in") });
    const res = await PATCH(makeRequest("PATCH", { body: "hello" }), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await PATCH(makeRequest("PATCH", { body: "hello" }), makeParams());
    expect(res.status).toBe(429);
  });

  it("returns 404 when post not found", async () => {
    mockAdminFrom.mockReturnValue(makePostBuilder(null, null));
    const res = await PATCH(makeRequest("PATCH", { body: "hello" }), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not the author", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "forum_posts") {
        return makePostBuilder({ author_id: "other-user" });
      }
      return makePostBuilder(null);
    });
    const res = await PATCH(makeRequest("PATCH", { body: "hello" }), makeParams());
    expect(res.status).toBe(403);
  });

  it("returns 400 when body is empty", async () => {
    mockAdminFrom.mockReturnValue(makePostBuilder({ author_id: USER_ID }));
    const res = await PATCH(makeRequest("PATCH", { body: "" }), makeParams());
    expect(res.status).toBe(400);
  });

  it("returns 400 when body exceeds 5000 chars", async () => {
    mockAdminFrom.mockReturnValue(makePostBuilder({ author_id: USER_ID }));
    const res = await PATCH(makeRequest("PATCH", { body: "x".repeat(5001) }), makeParams());
    expect(res.status).toBe(400);
  });

  it("returns 400 when body field missing", async () => {
    mockAdminFrom.mockReturnValue(makePostBuilder({ author_id: USER_ID }));
    const res = await PATCH(makeRequest("PATCH", {}), makeParams());
    expect(res.status).toBe(400);
  });

  it("updates post and returns updated data for author", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makePostBuilder({ author_id: USER_ID });
      return makeUpdateBuilder(null);
    });

    const res = await PATCH(makeRequest("PATCH", { body: "Updated content" }), makeParams());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.post.id).toBe(POST_ID);
  });

  it("returns 500 when DB update fails", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makePostBuilder({ author_id: USER_ID });
      return makeUpdateBuilder({ message: "Update failed" });
    });

    const res = await PATCH(makeRequest("PATCH", { body: "Valid content" }), makeParams());
    expect(res.status).toBe(500);
  });

  it("returns 400 on invalid JSON body", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID, email: "user@example.com" } }, error: null });
    mockAdminFrom.mockReturnValue(makePostBuilder({ author_id: USER_ID }));

    const badReq = new NextRequest(`http://localhost/api/community/posts/${POST_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json{",
    });
    const res = await PATCH(badReq, makeParams());
    expect(res.status).toBe(400);
  });
});

// ── DELETE tests ───────────────────────────────────────────────────────────────

describe("DELETE /api/community/posts/[id]", () => {
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

  it("returns 404 when post not found", async () => {
    mockAdminFrom.mockReturnValue(makePostBuilder(null));
    const res = await DELETE(makeRequest("DELETE"), makeParams());
    expect(res.status).toBe(404);
  });

  it("allows author to delete their own post", async () => {
    // Use admin email so isModerator short-circuits (no DB call for forum_user_profiles).
    // This keeps the mock simple while still covering author-only delete path.
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: "user@example.com" } },
      error: null,
    });

    // forum_posts: ownership check (select) then soft-delete (update)
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "forum_posts") {
        const fetchBuilder = makePostBuilder({ author_id: USER_ID });
        const deleteBuilder = makeDeleteBuilder(null);
        return {
          select: vi.fn().mockReturnValue(fetchBuilder),
          update: vi.fn().mockReturnValue(deleteBuilder),
        };
      }
      // forum_user_profiles for isModerator — user@example.com is not admin
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

  it("allows admin email to delete any post", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "admin-user-id", email: "admin@invest.com.au" } },
      error: null,
    });

    // Admin email short-circuits isModerator (returns true before hitting DB).
    // So only forum_posts is called (once for ownership fetch, once for soft-delete).
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "forum_posts") {
        const fetchBuilder = makePostBuilder({ author_id: "someone-else" });
        const deleteBuilder = makeDeleteBuilder(null);
        return {
          select: vi.fn().mockReturnValue(fetchBuilder),
          update: vi.fn().mockReturnValue(deleteBuilder),
        };
      }
      return createChainableBuilder(table);
    });

    const res = await DELETE(makeRequest("DELETE"), makeParams());
    expect(res.status).toBe(200);
  });

  it("returns 403 when user is not author or moderator", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "forum_posts") return makePostBuilder({ author_id: "someone-else" });
      // forum_user_profiles — not a moderator
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
      if (callCount === 1) return makePostBuilder({ author_id: USER_ID });
      return makeDeleteBuilder({ message: "Delete failed" });
    });

    const res = await DELETE(makeRequest("DELETE"), makeParams());
    expect(res.status).toBe(500);
  });
});
