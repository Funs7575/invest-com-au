import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks — must appear before any import of the route ────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// withValidatedBody: pass the schema through for real so Zod validation
// still fires (400 tests rely on it), but bypass wrapper boilerplate.
vi.mock("@/lib/validation/withValidatedBody", () => ({
  withValidatedBody: (schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { issues: unknown[]; } } }, handler: (req: NextRequest, body: unknown) => unknown) =>
    async (req: NextRequest) => {
      let raw: unknown;
      try { raw = await req.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 }); }
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const issues = parsed.error!.issues as Array<{ path?: string[]; message?: string }>;
        const first = issues[0];
        const path = first?.path?.join(".") ?? "";
        const message = first?.message ?? "Invalid request body";
        return new Response(JSON.stringify({ error: path ? `${path}: ${message}` : message, code: "validation_error", issues }), { status: 400 });
      }
      return handler(req, parsed.data);
    },
}));

// vi.hoisted — fn must be captured before the factory is called.
const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<() => Promise<number | null>>(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args as []),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(async () => false),
}));

// ── Supabase admin builder ─────────────────────────────────────────────────────

function makeBuilder(result: unknown = { data: null, error: null, count: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "like", "ilike", "filter",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.single = vi.fn(() => Promise.resolve(result));
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ── Route import (after all vi.mock calls) ────────────────────────────────────

import { GET, POST, PATCH } from "@/app/api/advisor-auth/courses/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Request factories ─────────────────────────────────────────────────────────

function makeGet(ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/courses", {
    method: "GET",
    headers: { "x-forwarded-for": ip },
  });
}

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/courses", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
  });
}

function makePatch(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/courses", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
  });
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADVISOR_ID = 42;

const mockCourse = {
  id: 1,
  slug: "intro-to-investing",
  title: "Intro to Investing",
  description: "Learn the basics",
  status: "draft",
  price: 0,
  level: "beginner",
  estimated_hours: null,
  cover_image_url: null,
  is_advisor_created: true,
  advisor_professional_id: ADVISOR_ID,
  submitted_at: null,
  rejection_reason: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const activeAdvisor = {
  stripe_connect_payouts_enabled: true,
  status: "active",
};

// ── Tests: GET ─────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/courses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns courses array on success", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: [mockCourse], error: null }));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.courses).toHaveLength(1);
    expect(json.courses[0].slug).toBe("intro-to-investing");
  });

  it("returns empty courses array when advisor has no courses", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.courses).toEqual([]);
  });

  it("returns 500 when DB fetch fails", async () => {
    const b = makeBuilder({ data: null, error: { message: "connection error" } });
    // order() is the final chained call before the await — override it to resolve with error
    (b.order as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve({ data: null, error: { message: "connection error" } }),
    );
    mockFrom.mockReturnValue(b);
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to fetch courses/i);
  });
});

// ── Tests: POST ───────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/courses", () => {
  const validBody = {
    title: "Introduction to Investing",
    description: "Learn the basics of investing",
    level: "beginner",
    price: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    mockFrom.mockImplementation((table: string) => {
      if (table === "professionals") {
        return makeBuilder({ data: activeAdvisor, error: null });
      }
      if (table === "courses") {
        const b = makeBuilder({ data: mockCourse, error: null });
        // count query via .then on the builder
        b.then = (cb: (v: unknown) => unknown) =>
          Promise.resolve(cb({ data: null, error: null, count: 0 }));
        b.single = vi.fn(() => Promise.resolve({ data: mockCourse, error: null }));
        return b;
      }
      return makeBuilder({ data: null, error: null });
    });
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makePost({ level: "beginner" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is too short", async () => {
    const res = await POST(makePost({ title: "Hi" }));
    expect(res.status).toBe(400);
  });

  it("returns 403 when advisor is not active", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "professionals") {
        return makeBuilder({ data: { stripe_connect_payouts_enabled: true, status: "pending" }, error: null });
      }
      return makeBuilder({ data: null, error: null });
    });
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/active advisors/i);
  });

  it("returns 403 when advisor not found", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "professionals") {
        return makeBuilder({ data: null, error: null });
      }
      return makeBuilder({ data: null, error: null });
    });
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(403);
  });

  it("returns 403 when Stripe payouts not enabled", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "professionals") {
        return makeBuilder({ data: { stripe_connect_payouts_enabled: false, status: "active" }, error: null });
      }
      return makeBuilder({ data: null, error: null });
    });
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/stripe/i);
  });

  it("creates course and returns 201 when no slug conflict", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "professionals") {
        return makeBuilder({ data: activeAdvisor, error: null });
      }
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        // count query: count=0 means no slug conflict
        b.then = (cb: (v: unknown) => unknown) =>
          Promise.resolve(cb({ data: null, error: null, count: 0 }));
        b.single = vi.fn(() => Promise.resolve({ data: mockCourse, error: null }));
        return b;
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.course).toBeDefined();
    expect(json.course.status).toBe("draft");
  });

  it("appends timestamp to slug when conflict exists", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "professionals") {
        return makeBuilder({ data: activeAdvisor, error: null });
      }
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        // count > 0 triggers slug suffix
        b.then = (cb: (v: unknown) => unknown) =>
          Promise.resolve(cb({ data: null, error: null, count: 2 }));
        b.single = vi.fn(() =>
          Promise.resolve({ data: { ...mockCourse, slug: "introduction-to-investing-1234" }, error: null }),
        );
        return b;
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(validBody));
    expect(res.status).toBe(201);
  });

  it("returns 500 when DB insert fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "professionals") {
        return makeBuilder({ data: activeAdvisor, error: null });
      }
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        b.then = (cb: (v: unknown) => unknown) =>
          Promise.resolve(cb({ data: null, error: null, count: 0 }));
        b.single = vi.fn(() =>
          Promise.resolve({ data: null, error: { message: "unique violation" } }),
        );
        return b;
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(validBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to create course/i);
  });
});

// ── Tests: PATCH ──────────────────────────────────────────────────────────────

describe("PATCH /api/advisor-auth/courses", () => {
  const validPatchBody = {
    courseId: 1,
    title: "Updated Course Title",
  };

  const existingDraftCourse = {
    id: 1,
    status: "draft",
    advisor_professional_id: ADVISOR_ID,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: existingDraftCourse, error: null });
      b.maybeSingle = vi.fn(() =>
        Promise.resolve({ data: existingDraftCourse, error: null }),
      );
      b.single = vi.fn(() =>
        Promise.resolve({ data: { ...mockCourse, title: "Updated Course Title" }, error: null }),
      );
      return b;
    });
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await PATCH(makePatch(validPatchBody));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await PATCH(makePatch(validPatchBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 when courseId is missing", async () => {
    const res = await PATCH(makePatch({ title: "Valid Title Here" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when course not found or not owned by advisor", async () => {
    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: null, error: null });
      b.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
      return b;
    });
    const res = await PATCH(makePatch(validPatchBody));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/not found/i);
  });

  it("updates course fields and returns 200", async () => {
    const res = await PATCH(makePatch(validPatchBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.course).toBeDefined();
  });

  it("allows valid draft → submitted status transition", async () => {
    const res = await PATCH(makePatch({ courseId: 1, status: "submitted" }));
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid status transition (draft → draft)", async () => {
    const res = await PATCH(makePatch({ courseId: 1, status: "draft" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Cannot transition/i);
  });

  it("returns 400 when trying to transition from submitted status", async () => {
    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: null, error: null });
      b.maybeSingle = vi.fn(() =>
        Promise.resolve({ data: { id: 1, status: "submitted", advisor_professional_id: ADVISOR_ID }, error: null }),
      );
      return b;
    });
    const res = await PATCH(makePatch({ courseId: 1, status: "submitted" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Cannot transition from 'submitted'/i);
  });

  it("returns 400 when trying to transition from published status", async () => {
    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: null, error: null });
      b.maybeSingle = vi.fn(() =>
        Promise.resolve({ data: { id: 1, status: "published", advisor_professional_id: ADVISOR_ID }, error: null }),
      );
      return b;
    });
    const res = await PATCH(makePatch({ courseId: 1, status: "submitted" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Cannot transition from 'published'/i);
  });

  it("allows rejected → draft transition (admin re-open)", async () => {
    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: null, error: null });
      b.maybeSingle = vi.fn(() =>
        Promise.resolve({ data: { id: 1, status: "rejected", advisor_professional_id: ADVISOR_ID }, error: null }),
      );
      b.single = vi.fn(() =>
        Promise.resolve({ data: { ...mockCourse, status: "draft" }, error: null }),
      );
      return b;
    });
    const res = await PATCH(makePatch({ courseId: 1, status: "draft" }));
    expect(res.status).toBe(200);
  });

  it("returns 500 when DB update fails", async () => {
    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: null, error: null });
      b.maybeSingle = vi.fn(() =>
        Promise.resolve({ data: existingDraftCourse, error: null }),
      );
      b.single = vi.fn(() =>
        Promise.resolve({ data: null, error: { message: "update failed" } }),
      );
      return b;
    });
    const res = await PATCH(makePatch(validPatchBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to update course/i);
  });
});
