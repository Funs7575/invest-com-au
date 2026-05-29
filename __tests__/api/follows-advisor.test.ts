/**
 * Tests for POST + DELETE /api/follows/advisor
 *
 * Auth: createClient (server) + supabase.auth.getUser (required)
 * Admin: createAdminClient for inserts/updates
 *
 * POST (withValidatedBody) branches:
 *   400 (invalid JSON), 400 (missing professionalId), 429, 401,
 *   409 (23505 → alreadyFollowing), 500, 200
 *
 * DELETE branches:
 *   400 (invalid JSON), 400 (missing professionalId), 429, 401, 500, 200
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockGetUser, mockServerFrom, mockAdminFrom, mockIsRateLimited } = vi.hoisted(() => ({
  mockGetUser: vi.fn(
    async (): Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }> => ({
      data: { user: { id: "u1", email: "u@e.com" } },
      error: null,
    }),
  ),
  mockServerFrom: vi.fn((..._a: unknown[]): Record<string, unknown> => ({ then: vi.fn() })),
  mockAdminFrom: vi.fn((..._a: unknown[]): Record<string, unknown> => ({ then: vi.fn() })),
  mockIsRateLimited: vi.fn(async (..._a: unknown[]): Promise<boolean> => false),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: (..._args: unknown[]) => mockGetUser() },
    from: (..._args: unknown[]) => mockServerFrom(),
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

import { POST, DELETE } from "@/app/api/follows/advisor/route";

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

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/follows/advisor", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

function makeDelete(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/follows/advisor", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRaw(bodyStr: string): NextRequest {
  return new NextRequest("http://localhost/api/follows/advisor", {
    method: "DELETE",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: bodyStr,
  });
}

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/follows/advisor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "u@e.com" } }, error: null });
    mockIsRateLimited.mockResolvedValue(false);
    mockAdminFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
  });

  it("returns 400 for invalid JSON body (withValidatedBody)", async () => {
    const req = new NextRequest("http://localhost/api/follows/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "{bad-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when professionalId is missing", async () => {
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when professionalId is not a positive integer", async () => {
    const res = await POST(makePost({ professionalId: -1 }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost({ professionalId: 99 }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makePost({ professionalId: 99 }));
    expect(res.status).toBe(401);
  });

  it("returns 200 with alreadyFollowing:true on 23505 duplicate", async () => {
    mockAdminFrom.mockImplementationOnce((..._a: unknown[]) =>
      makeBuilder(null, { code: "23505", message: "unique" }),
    );
    const res = await POST(makePost({ professionalId: 99 }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.alreadyFollowing).toBe(true);
  });

  it("returns 500 on non-duplicate insert error", async () => {
    mockAdminFrom.mockImplementationOnce((..._a: unknown[]) =>
      makeBuilder(null, { code: "42501", message: "permission denied" }),
    );
    const res = await POST(makePost({ professionalId: 99 }));
    expect(res.status).toBe(500);
  });

  it("returns 200 with success:true on follow success", async () => {
    // insert succeeds → null error
    mockAdminFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(null, null));
    // maybeSingle for follower_count lookup
    mockAdminFrom.mockImplementationOnce((..._a: unknown[]) =>
      makeBuilder({ follower_count: 3 }, null),
    );
    // update follower_count
    mockAdminFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await POST(makePost({ professionalId: 99 }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
  });
});

// ── DELETE tests ──────────────────────────────────────────────────────────────

describe("DELETE /api/follows/advisor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "u@e.com" } }, error: null });
    mockIsRateLimited.mockResolvedValue(false);
    mockAdminFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await DELETE(makeDelete({ professionalId: 99 }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await DELETE(makeDelete({ professionalId: 99 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await DELETE(makeDeleteRaw("{invalid"));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.error).toBe("string");
  });

  it("returns 400 when professionalId is missing", async () => {
    const res = await DELETE(makeDelete({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when professionalId is not a positive integer", async () => {
    const res = await DELETE(makeDelete({ professionalId: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns 500 on delete error", async () => {
    mockAdminFrom.mockImplementationOnce((..._a: unknown[]) =>
      makeBuilder(null, { message: "delete error" }),
    );
    const res = await DELETE(makeDelete({ professionalId: 99 }));
    expect(res.status).toBe(500);
  });

  it("returns 200 with success:true on successful unfollow", async () => {
    // delete succeeds
    mockAdminFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(null, null));
    // maybeSingle for follower_count
    mockAdminFrom.mockImplementationOnce((..._a: unknown[]) =>
      makeBuilder({ follower_count: 2 }, null),
    );
    // update follower_count
    mockAdminFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await DELETE(makeDelete({ professionalId: 99 }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
  });
});
