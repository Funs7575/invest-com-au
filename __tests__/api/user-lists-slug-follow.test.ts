/**
 * Tests for POST + DELETE /api/user-lists/[slug]/follow
 *
 * Auth: createClient + supabase.auth.getUser (required)
 * The route reads slug from req.nextUrl.pathname — no params arg.
 *
 * POST branches: 401, 404 (list not found), 403 (not public), 409 (own list),
 *                409 (23505 duplicate → ok+already), 500, 200
 * DELETE branches: 401, 404 (list not found), 500, 200
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(
    async (): Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }> => ({
      data: { user: { id: "u1", email: "u@e.com" } },
      error: null,
    }),
  ),
  mockFrom: vi.fn((..._a: unknown[]): Record<string, unknown> => ({ then: vi.fn() })),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: (..._args: unknown[]) => mockGetUser() },
    from: (..._args: unknown[]) => mockFrom(),
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { POST, DELETE } from "@/app/api/user-lists/[slug]/follow/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "single", "maybeSingle", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

function makeReq(slug: string, method: "POST" | "DELETE"): NextRequest {
  return new NextRequest(`http://localhost/api/user-lists/${slug}/follow`, { method });
}

const LIST_ROW = { id: 7, is_public: true, owner_user_id: "owner-uuid" };

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/user-lists/[slug]/follow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "u@e.com" } }, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq("great-list", "POST"));
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe("unauthorized");
  });

  it("returns 404 when list is not found", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await POST(makeReq("missing-slug", "POST"));
    expect(res.status).toBe(404);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe("not_found");
  });

  it("returns 403 when list is not public", async () => {
    // resolveList returns a private list
    mockFrom.mockImplementationOnce((..._a: unknown[]) =>
      makeBuilder({ ...LIST_ROW, is_public: false }, null),
    );
    const res = await POST(makeReq("private-list", "POST"));
    expect(res.status).toBe(403);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe("list_not_public");
  });

  it("returns 409 when user tries to follow their own list", async () => {
    // owner_user_id matches the authenticated user
    mockFrom.mockImplementationOnce((..._a: unknown[]) =>
      makeBuilder({ ...LIST_ROW, owner_user_id: "u1" }, null),
    );
    const res = await POST(makeReq("my-list", "POST"));
    expect(res.status).toBe(409);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe("cannot_follow_own_list");
  });

  it("returns 200 with ok+already:true on 23505 duplicate follow", async () => {
    // resolveList
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(LIST_ROW, null));
    // insert → 23505
    mockFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder(null, { code: "23505", message: "unique violation" }),
    );
    const res = await POST(makeReq("great-list", "POST"));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.already).toBe(true);
  });

  it("returns 500 on non-duplicate insert error", async () => {
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(LIST_ROW, null));
    mockFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder(null, { code: "42501", message: "permission denied" }),
    );
    const res = await POST(makeReq("great-list", "POST"));
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe("follow_failed");
  });

  it("returns 200 with ok+following:true on successful follow", async () => {
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(LIST_ROW, null));
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await POST(makeReq("great-list", "POST"));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.following).toBe(true);
  });
});

// ── DELETE tests ──────────────────────────────────────────────────────────────

describe("DELETE /api/user-lists/[slug]/follow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "u@e.com" } }, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await DELETE(makeReq("great-list", "DELETE"));
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe("unauthorized");
  });

  it("returns 404 when list is not found", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await DELETE(makeReq("missing-slug", "DELETE"));
    expect(res.status).toBe(404);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe("not_found");
  });

  it("returns 500 when delete fails", async () => {
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(LIST_ROW, null));
    mockFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder(null, { message: "delete error" }),
    );
    const res = await DELETE(makeReq("great-list", "DELETE"));
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe("unfollow_failed");
  });

  it("returns 200 with ok+following:false on successful unfollow", async () => {
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(LIST_ROW, null));
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await DELETE(makeReq("great-list", "DELETE"));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.following).toBe(false);
  });
});
