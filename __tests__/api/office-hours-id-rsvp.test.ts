/**
 * Tests for POST + DELETE /api/office-hours/[id]/rsvp
 *
 * Auth: createClient + supabase.auth.getUser (required)
 * POST branches: 400 (bad id), 401, 429, 404 (no session), 409 (ended/transcript),
 *                409 (23505 duplicate), 500 (insert error), 201
 * DELETE branches: 400 (bad id), 401, 500 (delete error), 200
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockGetUser, mockFrom, mockIsRateLimited } = vi.hoisted(() => ({
  mockGetUser: vi.fn(
    async (): Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }> => ({
      data: { user: { id: "u1", email: "u@e.com" } },
      error: null,
    }),
  ),
  mockFrom: vi.fn((..._a: unknown[]): Record<string, unknown> => ({ then: vi.fn() })),
  mockIsRateLimited: vi.fn(async (..._a: unknown[]): Promise<boolean> => false),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: (..._args: unknown[]) => mockGetUser() },
    from: (..._args: unknown[]) => mockFrom(),
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (..._args: unknown[]) => mockIsRateLimited(),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { POST, DELETE } from "@/app/api/office-hours/[id]/rsvp/route";

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

function makeReq(id: string, method: "POST" | "DELETE"): NextRequest {
  return new NextRequest(`http://localhost/api/office-hours/${id}/rsvp`, { method });
}

const SESSION_ROW = { id: 5, status: "upcoming", is_published: true };

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/office-hours/[id]/rsvp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "u@e.com" } }, error: null });
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 400 for non-integer session id", async () => {
    const res = await POST(makeReq("abc", "POST"), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.error).toBe("string");
  });

  it("returns 400 for zero session id", async () => {
    const res = await POST(makeReq("0", "POST"), { params: Promise.resolve({ id: "0" }) });
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq("5", "POST"), { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(SESSION_ROW));
    const res = await POST(makeReq("5", "POST"), { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(429);
  });

  it("returns 404 when session is not found", async () => {
    // First from() call = session lookup → returns null
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(null));
    const res = await POST(makeReq("5", "POST"), { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(404);
  });

  it("returns 404 when session is not published", async () => {
    mockFrom.mockImplementationOnce((..._a: unknown[]) =>
      makeBuilder({ id: 5, status: "upcoming", is_published: false }),
    );
    const res = await POST(makeReq("5", "POST"), { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(404);
  });

  it("returns 409 when session status is ended", async () => {
    mockFrom.mockImplementationOnce((..._a: unknown[]) =>
      makeBuilder({ id: 5, status: "ended", is_published: true }),
    );
    const res = await POST(makeReq("5", "POST"), { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(409);
    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.error).toBe("string");
  });

  it("returns 409 when session status is transcript", async () => {
    mockFrom.mockImplementationOnce((..._a: unknown[]) =>
      makeBuilder({ id: 5, status: "transcript", is_published: true }),
    );
    const res = await POST(makeReq("5", "POST"), { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(409);
  });

  it("returns 409 when RSVP is already submitted (23505)", async () => {
    // session lookup
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(SESSION_ROW));
    // insert → 23505
    mockFrom.mockImplementationOnce((..._a: unknown[]) =>
      makeBuilder(null, { code: "23505", message: "unique violation" }),
    );
    const res = await POST(makeReq("5", "POST"), { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(409);
    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.error).toBe("string");
  });

  it("returns 500 when insert fails with a non-unique error", async () => {
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(SESSION_ROW));
    mockFrom.mockImplementationOnce((..._a: unknown[]) =>
      makeBuilder(null, { code: "42501", message: "permission denied" }),
    );
    const res = await POST(makeReq("5", "POST"), { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(500);
  });

  it("returns 201 on successful RSVP", async () => {
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(SESSION_ROW));
    // insert succeeds
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(null, null));
    // update rsvp_count (best-effort, ignored)
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null));
    const res = await POST(makeReq("5", "POST"), { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
  });
});

// ── DELETE tests ──────────────────────────────────────────────────────────────

describe("DELETE /api/office-hours/[id]/rsvp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "u@e.com" } }, error: null });
  });

  it("returns 400 for non-integer session id", async () => {
    const res = await DELETE(makeReq("xyz", "DELETE"), { params: Promise.resolve({ id: "xyz" }) });
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await DELETE(makeReq("5", "DELETE"), { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(401);
  });

  it("returns 500 when delete fails", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder(null, { message: "delete error" }),
    );
    const res = await DELETE(makeReq("5", "DELETE"), { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(500);
  });

  it("returns 200 with success:true on successful unRSVP", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await DELETE(makeReq("5", "DELETE"), { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
  });
});
