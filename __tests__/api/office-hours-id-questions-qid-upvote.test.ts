/**
 * Tests for POST + DELETE /api/office-hours/[id]/questions/[qid]/upvote
 *
 * Auth: createClient + supabase.auth.getUser (required)
 * POST branches: 400 (bad ids), 401, 429, 409 (23505 duplicate), 500, 201
 * DELETE branches: 400 (bad ids), 401, 500, 200
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockGetUser, mockFrom, mockIsRateLimited, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(
    async (): Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }> => ({
      data: { user: { id: "u1", email: "u@e.com" } },
      error: null,
    }),
  ),
  mockFrom: vi.fn((..._a: unknown[]): Record<string, unknown> => ({ then: vi.fn() })),
  mockIsRateLimited: vi.fn(async (..._a: unknown[]): Promise<boolean> => false),
  mockRpc: vi.fn(async (..._a: unknown[]): Promise<{ data: unknown; error: unknown }> => ({
    data: null,
    error: null,
  })),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: (..._args: unknown[]) => mockGetUser() },
    from: (..._args: unknown[]) => mockFrom(),
    rpc: (name: string, args: Record<string, unknown>) => mockRpc(name, args),
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (..._args: unknown[]) => mockIsRateLimited(),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { POST, DELETE } from "@/app/api/office-hours/[id]/questions/[qid]/upvote/route";

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

function makeReq(sessionId: string, questionId: string, method: "POST" | "DELETE"): NextRequest {
  return new NextRequest(
    `http://localhost/api/office-hours/${sessionId}/questions/${questionId}/upvote`,
    { method },
  );
}

type UpvoteParams = { params: Promise<{ id: string; qid: string }> };

function makeParams(id: string, qid: string): UpvoteParams {
  return { params: Promise.resolve({ id, qid }) };
}

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/office-hours/[id]/questions/[qid]/upvote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "u@e.com" } }, error: null });
    mockIsRateLimited.mockResolvedValue(false);
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  it("returns 400 for non-integer session id", async () => {
    const res = await POST(makeReq("abc", "3", "POST"), makeParams("abc", "3"));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.error).toBe("string");
  });

  it("returns 400 for non-integer question id", async () => {
    const res = await POST(makeReq("5", "xyz", "POST"), makeParams("5", "xyz"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for zero question id", async () => {
    const res = await POST(makeReq("5", "0", "POST"), makeParams("5", "0"));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq("5", "3", "POST"), makeParams("5", "3"));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq("5", "3", "POST"), makeParams("5", "3"));
    expect(res.status).toBe(429);
  });

  it("returns 409 when already upvoted (23505)", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder(null, { code: "23505", message: "unique violation" }),
    );
    const res = await POST(makeReq("5", "3", "POST"), makeParams("5", "3"));
    expect(res.status).toBe(409);
    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.error).toBe("string");
  });

  it("returns 500 when insert fails with non-duplicate error", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder(null, { code: "42501", message: "permission denied" }),
    );
    const res = await POST(makeReq("5", "3", "POST"), makeParams("5", "3"));
    expect(res.status).toBe(500);
  });

  it("returns 201 on successful upvote", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await POST(makeReq("5", "3", "POST"), makeParams("5", "3"));
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
  });

  it("calls increment_oh_upvote rpc after successful insert", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    await POST(makeReq("5", "3", "POST"), makeParams("5", "3"));
    expect(mockRpc).toHaveBeenCalledWith("increment_oh_upvote", { question_id_arg: 3 });
  });
});

// ── DELETE tests ──────────────────────────────────────────────────────────────

describe("DELETE /api/office-hours/[id]/questions/[qid]/upvote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "u@e.com" } }, error: null });
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  it("returns 400 for non-integer session id", async () => {
    const res = await DELETE(makeReq("abc", "3", "DELETE"), makeParams("abc", "3"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-integer question id", async () => {
    const res = await DELETE(makeReq("5", "nope", "DELETE"), makeParams("5", "nope"));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await DELETE(makeReq("5", "3", "DELETE"), makeParams("5", "3"));
    expect(res.status).toBe(401);
  });

  it("returns 500 when delete fails", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder(null, { message: "delete error" }),
    );
    const res = await DELETE(makeReq("5", "3", "DELETE"), makeParams("5", "3"));
    expect(res.status).toBe(500);
  });

  it("returns 200 on successful upvote removal", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await DELETE(makeReq("5", "3", "DELETE"), makeParams("5", "3"));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
  });

  it("calls decrement_oh_upvote rpc after successful delete", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    await DELETE(makeReq("5", "3", "DELETE"), makeParams("5", "3"));
    expect(mockRpc).toHaveBeenCalledWith("decrement_oh_upvote", { question_id_arg: 3 });
  });
});
