import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockGetUser, mockIsRateLimited, mockAdminFrom, mockLog } = vi.hoisted(() => {
  const mockGetUser = vi.fn().mockResolvedValue({
    data: { user: { id: "user-uuid", email: "user@example.com" } },
    error: null,
  });
  const mockIsRateLimited = vi.fn().mockResolvedValue(false);
  const mockAdminFrom = vi.fn();
  const mockLog = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
  return { mockGetUser, mockIsRateLimited, mockAdminFrom, mockLog };
});

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: mockIsRateLimited }));
vi.mock("@/lib/logger", () => ({ logger: () => mockLog }));
vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
  getAdminEmail: () => "admin@invest.com.au",
}));

import { PATCH, DELETE } from "@/app/api/community/posts/[id]/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePatchRequest(id: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost/api/community/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeDeleteRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/community/posts/${id}`, { method: "DELETE" });
}

const POST_AUTHOR_ID = "user-uuid";

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

function makeBuilder(opts: {
  postData?: Record<string, unknown> | null;
  postError?: Record<string, unknown> | null;
  updateResult?: { error: Record<string, unknown> | null };
  moderatorData?: { is_moderator: boolean } | null;
}): Builder {
  const b = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: opts.postData ?? { author_id: POST_AUTHOR_ID },
      error: opts.postError ?? null,
    }),
  } as Builder;
  (b.update as ReturnType<typeof vi.fn>).mockReturnValue({
    eq: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "1", body: "updated body", updated_at: new Date().toISOString() },
          error: opts.updateResult?.error ?? null,
        }),
      }),
      // For DELETE soft-update (no .select().single() chain)
      then: (cb: (v: typeof opts.updateResult) => void) => {
        cb(opts.updateResult ?? { error: null });
        return Promise.resolve(opts.updateResult ?? { error: null });
      },
    }),
  });
  return b;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-uuid", email: "user@example.com" } },
    error: null,
  });
  mockIsRateLimited.mockResolvedValue(false);
});

// ── PATCH tests ────────────────────────────────────────────────────────────────

describe("PATCH /api/community/posts/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockAdminFrom.mockReturnValue(makeBuilder({}));
    const res = await PATCH(makePatchRequest("1", { body: "hello world" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    mockAdminFrom.mockReturnValue(makeBuilder({}));
    const res = await PATCH(makePatchRequest("1", { body: "hello world" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(429);
  });

  it("returns 404 when post not found", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ postData: null, postError: { message: "not found" } }));
    const res = await PATCH(makePatchRequest("1", { body: "hello world" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when non-author tries to edit", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ postData: { author_id: "other-user" } }));
    const res = await PATCH(makePatchRequest("1", { body: "hello world" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain("author");
  });

  it("returns 400 when body is too short (empty)", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({}));
    const res = await PATCH(makePatchRequest("1", { body: "" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("1-5000");
  });

  it("returns 400 when body exceeds 5000 chars", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({}));
    const res = await PATCH(makePatchRequest("1", { body: "x".repeat(5001) }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 200 with updated post on success", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({}));
    const res = await PATCH(makePatchRequest("1", { body: "Updated content here" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.post).toBeDefined();
  });
});

// ── DELETE tests ───────────────────────────────────────────────────────────────

describe("DELETE /api/community/posts/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockAdminFrom.mockReturnValue(makeBuilder({}));
    const res = await DELETE(makeDeleteRequest("1"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    mockAdminFrom.mockReturnValue(makeBuilder({}));
    const res = await DELETE(makeDeleteRequest("1"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(429);
  });

  it("returns 404 when post not found", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ postData: null, postError: { message: "not found" } }));
    const res = await DELETE(makeDeleteRequest("1"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when non-author non-moderator tries to delete", async () => {
    // Post owned by someone else; user is not an admin email
    mockGetUser.mockResolvedValue({
      data: { user: { id: "other-user", email: "regular@example.com" } },
      error: null,
    });
    const forumProfileBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { is_moderator: false }, error: null }),
    };
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "forum_user_profiles") return forumProfileBuilder;
      return makeBuilder({ postData: { author_id: "post-owner" } });
    });
    const res = await DELETE(makeDeleteRequest("1"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(403);
  });

  it("allows admin-email user to delete any post (moderator short-circuit)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "admin-id", email: "admin@invest.com.au" } },
      error: null,
    });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "forum_posts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { author_id: "someone-else" }, error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) };
    });
    const res = await DELETE(makeDeleteRequest("1"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("returns 200 when post owner deletes their own post", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "forum_posts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { author_id: "user-uuid" }, error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) };
    });
    const res = await DELETE(makeDeleteRequest("1"), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(200);
  });
});
