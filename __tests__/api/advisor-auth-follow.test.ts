import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── withValidatedBody real Zod mock ───────────────────────────────────────────

vi.mock("@/lib/validation/withValidatedBody", () => ({
  withValidatedBody:
    (
      schema: {
        safeParse: (v: unknown) => {
          success: boolean;
          data?: unknown;
          error?: { issues: unknown[] };
        };
      },
      handler: (req: NextRequest, body: unknown) => unknown,
    ) =>
    async (req: NextRequest) => {
      let raw: unknown;
      try {
        raw = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { status: 400 },
        );
      }
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const issues = parsed.error!.issues as Array<{
          path?: string[];
          message?: string;
        }>;
        const first = issues[0];
        const path = first?.path?.join(".") ?? "";
        const message = first?.message ?? "Invalid request body";
        return new Response(
          JSON.stringify({
            error: path ? `${path}: ${message}` : message,
            code: "validation_error",
            issues,
          }),
          { status: 400 },
        );
      }
      return handler(req, parsed.data);
    },
}));

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRequireAdvisorSession, mockGetUser } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<() => Promise<number | null>>(),
  mockGetUser: vi.fn(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) =>
    mockRequireAdvisorSession(...(args as [])),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(async () => false),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// ── Supabase admin builder ────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve({ data, error }));
  c.maybeSingle = vi.fn(() => Promise.resolve({ data, error }));
  return c;
}

const mockFrom = vi.fn((..._a: unknown[]) => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { POST, DELETE } from "@/app/api/advisor-auth/follow/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADVISOR_ID = 11;
const TARGET_ID = 77;
const USER_ID = "auth-user-uuid-123";

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/follow", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

function makeDeleteReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/follow", {
    method: "DELETE",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

const validBody = { professionalId: TARGET_ID };

// ── Tests: POST ───────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/follow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });

    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        // advisor_follows insert — success
        return makeBuilder(null, null);
      }
      if (call === 2) {
        // professionals follower_count select
        const b = makeBuilder({ follower_count: 5 }, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { follower_count: 5 },
          error: null,
        });
        return b;
      }
      // professionals update
      return makeBuilder(null, null);
    });
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(429);
  });

  it("returns 401 when advisor session is not found", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 401 when auth user is not found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 400 when professionalId is missing", async () => {
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when professionalId is not a positive integer", async () => {
    const res = await POST(makePost({ professionalId: -5 }));
    expect(res.status).toBe(400);
  });

  it("follows advisor and returns 200 success", async () => {
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns success (idempotent) when already following (unique_violation 23505)", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder(null, { code: "23505", message: "duplicate key" }),
    );
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 500 when DB insert fails with non-duplicate error", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder(null, { code: "PGRST0", message: "connection error" }),
    );
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to follow advisor/i);
  });

  it("increments follower_count after successful follow", async () => {
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(200);
    // At least 3 mockFrom calls: insert + select + update
    expect(mockFrom.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Tests: DELETE ─────────────────────────────────────────────────────────────

describe("DELETE /api/advisor-auth/follow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });

    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        // advisor_follows delete — success
        return makeBuilder(null, null);
      }
      if (call === 2) {
        // professionals follower_count select
        const b = makeBuilder({ follower_count: 5 }, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { follower_count: 5 },
          error: null,
        });
        return b;
      }
      // professionals update
      return makeBuilder(null, null);
    });
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await DELETE(makeDeleteReq(validBody));
    expect(res.status).toBe(429);
  });

  it("returns 401 when advisor session is not found", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await DELETE(makeDeleteReq(validBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 401 when auth user is not found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await DELETE(makeDeleteReq(validBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/advisor-auth/follow", {
      method: "DELETE",
      body: "bad-json",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid JSON/i);
  });

  it("returns 400 when professionalId is missing", async () => {
    const res = await DELETE(makeDeleteReq({}));
    expect(res.status).toBe(400);
  });

  it("unfollows advisor and returns 200 success", async () => {
    const res = await DELETE(makeDeleteReq(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 500 when DB delete fails", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder(null, { message: "delete failed" }),
    );
    const res = await DELETE(makeDeleteReq(validBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to unfollow advisor/i);
  });

  it("decrements follower_count after successful unfollow", async () => {
    const res = await DELETE(makeDeleteReq(validBody));
    expect(res.status).toBe(200);
    expect(mockFrom.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
