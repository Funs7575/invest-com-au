import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const {
  mockRequireAdvisorSession,
  mockIsRateLimited,
  mockAdminFrom,
  mockGetUser,
} = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 10),
  mockIsRateLimited: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false),
  mockAdminFrom: vi.fn<(...args: unknown[]) => unknown>(),
  mockGetUser: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
    data: { user: { id: "uuid-user-1" } },
  })),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { POST } from "@/app/api/advisor-auth/posts/[postId]/react/route";

// ── Builder helper ────────────────────────────────────────────────────────────

function makeBuilder(
  data: unknown = null,
  error: unknown = null,
  count: number | null = null,
) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown; count: number | null }) => unknown) =>
      Promise.resolve(r({ data, error, count })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter", "contains", "overlaps",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

// Helper that resolves to { error, count } to satisfy the select+head=true pattern
function makeCountBuilder(count: number | null = 3, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: null; error: unknown; count: number | null }) => unknown) =>
      Promise.resolve(r({ data: null, error, count })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter", "contains", "overlaps",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

function makePost(postId: string, body: unknown) {
  return new NextRequest(
    `http://localhost/api/advisor-auth/posts/${postId}/react`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "1.2.3.4",
      },
      body: JSON.stringify(body),
    },
  );
}

function makeParams(postId: string) {
  return { params: Promise.resolve({ postId }) };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/posts/[postId]/react — auth + rate-limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(10);
    mockGetUser.mockResolvedValue({ data: { user: { id: "uuid-user-1" } } });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(
      makePost("42", { reaction_type: "like" }),
      makeParams("42"),
    );
    expect(res.status).toBe(429);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/too many requests/i);
  });

  it("returns 401 when requireAdvisorSession returns null", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await POST(
      makePost("42", { reaction_type: "like" }),
      makeParams("42"),
    );
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/not authenticated/i);
  });

  it("returns 401 when supabase getUser returns null user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(
      makePost("42", { reaction_type: "like" }),
      makeParams("42"),
    );
    expect(res.status).toBe(401);
  });
});

describe("POST /api/advisor-auth/posts/[postId]/react — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(10);
    mockGetUser.mockResolvedValue({ data: { user: { id: "uuid-user-1" } } });
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest(
      "http://localhost/api/advisor-auth/posts/42/react",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
        body: "not json{",
      },
    );
    const res = await POST(req, makeParams("42"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid reaction_type", async () => {
    const res = await POST(
      makePost("42", { reaction_type: "laugh" }),
      makeParams("42"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for a non-numeric postId", async () => {
    const res = await POST(
      makePost("abc", { reaction_type: "like" }),
      makeParams("abc"),
    );
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/invalid post/i);
  });

  it("returns 400 for postId = 0", async () => {
    const res = await POST(
      makePost("0", { reaction_type: "like" }),
      makeParams("0"),
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/advisor-auth/posts/[postId]/react — DB paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(10);
    mockGetUser.mockResolvedValue({ data: { user: { id: "uuid-user-1" } } });
  });

  it("returns 500 when upsert fails", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, { message: "upsert boom" }));
    const res = await POST(
      makePost("42", { reaction_type: "like" }),
      makeParams("42"),
    );
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/failed to react/i);
  });

  it("returns 500 when count query fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeBuilder(null, null); // upsert succeeds
      return makeCountBuilder(null, { message: "count boom" }); // count fails
    });
    const res = await POST(
      makePost("42", { reaction_type: "insightful" }),
      makeParams("42"),
    );
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/failed to update count/i);
  });

  it("returns 200 with success + reaction_count on happy path", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeBuilder(null, null); // upsert
      if (call === 2) return makeCountBuilder(5, null); // count query
      return makeBuilder(null, null); // advisor_posts update
    });
    const res = await POST(
      makePost("42", { reaction_type: "celebrate" }),
      makeParams("42"),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; reaction_count: number };
    expect(body.success).toBe(true);
    expect(body.reaction_count).toBe(5);
  });

  it("uses reaction_count 0 when count is null", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeBuilder(null, null);
      if (call === 2) return makeCountBuilder(null, null); // null count
      return makeBuilder(null, null);
    });
    const res = await POST(
      makePost("55", { reaction_type: "like" }),
      makeParams("55"),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { reaction_count: number };
    expect(body.reaction_count).toBe(0);
  });
});
