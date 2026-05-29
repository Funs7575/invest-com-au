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

const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<() => Promise<number | null>>(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) =>
    mockRequireAdvisorSession(...(args as [])),
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

import { GET, POST, DELETE } from "@/app/api/advisor-auth/posts/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADVISOR_ID = 44;

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/posts", {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/posts", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

function makeDeleteReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/posts", {
    method: "DELETE",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

const mockPost = {
  id: 1,
  professional_id: ADVISOR_ID,
  body: "Market update: the ASX200 is showing strong momentum this quarter.",
  post_type: "update",
  link_url: null,
  link_title: null,
  image_url: null,
  status: "published",
  created_at: "2026-01-01T00:00:00Z",
};

const validPostBody = { body: "Hello from my advisor portal!" };

// ── Tests: GET ────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    // GET uses chained query resolved via .then
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder([mockPost], null));
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 200 with posts array on success", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.posts)).toBe(true);
  });

  it("returns empty posts array when advisor has no posts", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.posts).toEqual([]);
  });

  it("returns 500 when DB query fails", async () => {
    // For GET, the route uses .limit() as the final chain call
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(null, { message: "db error" });
      (b.limit as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: "db error" },
      });
      return b;
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to fetch posts/i);
  });
});

// ── Tests: POST ───────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(mockPost, null);
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockPost, error: null });
      return b;
    });
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await POST(makePost(validPostBody));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makePost(validPostBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 400 when body text is missing", async () => {
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body text is empty string", async () => {
    const res = await POST(makePost({ body: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body exceeds 2000 chars", async () => {
    const res = await POST(makePost({ body: "X".repeat(2001) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when post_type is invalid", async () => {
    const res = await POST(makePost({ body: "Hello", post_type: "ad" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when link_url is not a valid URL", async () => {
    const res = await POST(makePost({ body: "Hello", link_url: "not-a-url" }));
    expect(res.status).toBe(400);
  });

  it("creates post and returns 201 with post data", async () => {
    const res = await POST(makePost(validPostBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.post).toBeDefined();
    expect(json.post.status).toBe("published");
  });

  it("creates post with all valid optional fields", async () => {
    const fullBody = {
      body: "Check out this great resource on SMSF investing!",
      post_type: "resource",
      link_url: "https://example.com/resource",
      link_title: "SMSF Guide 2026",
      image_url: "https://example.com/image.png",
    };
    const res = await POST(makePost(fullBody));
    expect(res.status).toBe(201);
  });

  it("defaults post_type to update when omitted", async () => {
    const res = await POST(makePost({ body: "Just a quick update." }));
    expect(res.status).toBe(201);
  });

  it("returns 500 when DB insert fails", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(null, { message: "insert error" });
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: "insert error" },
      });
      return b;
    });
    const res = await POST(makePost(validPostBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to create post/i);
  });
});

// ── Tests: DELETE ─────────────────────────────────────────────────────────────

describe("DELETE /api/advisor-auth/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        // ownership check — select by id
        const b = makeBuilder({ id: 1, professional_id: ADVISOR_ID }, null);
        (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { id: 1, professional_id: ADVISOR_ID },
          error: null,
        });
        return b;
      }
      // soft-delete update
      return makeBuilder(null, null);
    });
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await DELETE(makeDeleteReq({ postId: 1 }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await DELETE(makeDeleteReq({ postId: 1 }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 400 when postId is missing", async () => {
    const res = await DELETE(makeDeleteReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when postId is not a positive integer", async () => {
    const res = await DELETE(makeDeleteReq({ postId: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when post not found", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(null, null);
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
      return b;
    });
    const res = await DELETE(makeDeleteReq({ postId: 999 }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/Post not found/i);
  });

  it("returns 403 when post belongs to a different advisor", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder({ id: 1, professional_id: 9999 }, null);
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: 1, professional_id: 9999 },
        error: null,
      });
      return b;
    });
    const res = await DELETE(makeDeleteReq({ postId: 1 }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Forbidden/i);
  });

  it("soft-deletes post (sets status=deleted) and returns success", async () => {
    const res = await DELETE(makeDeleteReq({ postId: 1 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 500 when DB update fails", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder({ id: 1, professional_id: ADVISOR_ID }, null);
        (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { id: 1, professional_id: ADVISOR_ID },
          error: null,
        });
        return b;
      }
      return makeBuilder(null, { message: "update failed" });
    });
    const res = await DELETE(makeDeleteReq({ postId: 1 }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to delete post/i);
  });
});
