/**
 * Tests for GET /api/follows/advisor/feed
 *
 * Auth: createClient (server) + supabase.auth.getUser (required)
 * Admin: createAdminClient for follows + posts queries
 *
 * Branches: 429, 401, 200 (no follows → empty posts), 500 (posts fetch error),
 *           200 (posts array)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockGetUser, mockAdminFrom, mockIsRateLimited } = vi.hoisted(() => ({
  mockGetUser: vi.fn(
    async (): Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }> => ({
      data: { user: { id: "u1", email: "u@e.com" } },
      error: null,
    }),
  ),
  mockAdminFrom: vi.fn((..._a: unknown[]): Record<string, unknown> => ({ then: vi.fn() })),
  mockIsRateLimited: vi.fn(async (..._a: unknown[]): Promise<boolean> => false),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: (..._args: unknown[]) => mockGetUser() },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: (..._args: unknown[]) => mockAdminFrom(),
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (..._args: unknown[]) => mockIsRateLimited(),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { GET } from "@/app/api/follows/advisor/feed/route";

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

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/follows/advisor/feed", {
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

const POST_ROW = {
  id: 10,
  body: "Market update",
  post_type: "text",
  link_url: null,
  link_title: null,
  reaction_count: 5,
  comment_count: 2,
  created_at: "2026-05-01T10:00:00Z",
  professional: { name: "Jane Smith", slug: "jane-smith", photo_url: null, type: "planner" },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/follows/advisor/feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "u@e.com" } }, error: null });
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await GET(makeReq());
    expect(res.status).toBe(429);
    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.error).toBe("string");
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.error).toBe("string");
  });

  it("returns 200 with empty posts when user follows nobody", async () => {
    // follows query returns empty array
    mockAdminFrom.mockImplementation((..._a: unknown[]) => makeBuilder([], null));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.posts).toEqual([]);
  });

  it("returns 200 with empty posts when follows data is null", async () => {
    mockAdminFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.posts).toEqual([]);
  });

  it("returns 500 when posts query fails", async () => {
    // follows query succeeds with followed IDs
    mockAdminFrom.mockImplementationOnce((..._a: unknown[]) =>
      makeBuilder([{ following_professional_id: 42 }], null),
    );
    // posts query fails
    mockAdminFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder(null, { message: "db error" }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.error).toBe("string");
  });

  it("returns 200 with posts array when user follows advisors with posts", async () => {
    // follows query
    mockAdminFrom.mockImplementationOnce((..._a: unknown[]) =>
      makeBuilder([{ following_professional_id: 42 }], null),
    );
    // posts query
    mockAdminFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder([POST_ROW], null),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(Array.isArray(body.posts)).toBe(true);
    expect((body.posts as unknown[]).length).toBe(1);
  });

  it("returns 200 with empty posts when posts data is null", async () => {
    mockAdminFrom.mockImplementationOnce((..._a: unknown[]) =>
      makeBuilder([{ following_professional_id: 42 }], null),
    );
    // posts query returns null data
    mockAdminFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.posts).toEqual([]);
  });
});
