import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────
// Must use vi.hoisted so they are available inside vi.mock factory bodies.

const { mockRequireOrgSession, mockIsRateLimited, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireOrgSession: vi.fn<() => Promise<{ organisationId: number; role: string; userId: string }>>(
    async () => ({ organisationId: 5, role: "admin", userId: "user-org-5" }),
  ),
  mockIsRateLimited: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false),
  mockAdminFrom: vi.fn(() => makeChain()),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/require-org-session", () => ({
  requireOrgSession: () => mockRequireOrgSession(),
}));

/**
 * withValidatedBody: invoke the handler directly with the parsed body.
 * Invalid JSON → calls handler with {} which Zod then rejects (400).
 * We intentionally do NOT validate in the mock — let the real Zod schema in
 * the route reject it so we test the actual validation paths.
 */
vi.mock("@/lib/validation/withValidatedBody", () => ({
  withValidatedBody: (
    schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { issues: Array<{ message: string }> } } },
    handler: (req: NextRequest, body: unknown) => unknown,
  ) =>
    async (req: NextRequest) => {
      let rawBody: unknown;
      try {
        rawBody = await req.json();
      } catch {
        const { NextResponse } = await import("next/server");
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
      const parsed = schema.safeParse(rawBody);
      if (!parsed.success) {
        const { NextResponse } = await import("next/server");
        const firstMsg = parsed.error?.issues[0]?.message ?? "Validation error";
        return NextResponse.json(
          { error: firstMsg, code: "validation_error", issues: parsed.error?.issues ?? [] },
          { status: 400 },
        );
      }
      return handler(req, parsed.data);
    },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * A chainable Supabase query-builder stub that is also thenable. Every method
 * returns the same object; awaiting it resolves to the given result. Use
 * mockReturnValueOnce / mockImplementation to script multiple sequential queries.
 */
function makeChain(res: { data?: unknown; error?: unknown; count?: number | null } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "range", "maybeSingle", "single", "like", "head",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(
      resolve({ data: res.data ?? null, error: res.error ?? null, count: res.count ?? null }),
    );
  chain.catch = () => chain;
  return chain;
}

function makeReq(method: string, body?: unknown, ip = "1.2.3.4"): NextRequest {
  return new Request("http://localhost/api/org-auth/courses", {
    method,
    headers: {
      "x-forwarded-for": ip,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }) as unknown as NextRequest;
}

const SESSION = { organisationId: 5, role: "admin", userId: "user-org-5" };

const VALID_CREATE_BODY = {
  title: "Intro to Investing",
  price: 0,
};

const SAMPLE_COURSE = {
  id: 10,
  slug: "intro-to-investing-org5-1234567890",
  title: "Intro to Investing",
  subtitle: null,
  description: null,
  price: 0,
  level: null,
  estimated_hours: null,
  cover_image_url: null,
  status: "draft",
  is_cpd_eligible: false,
  cpd_hours: null,
  cpd_category: null,
  created_at: "2026-05-01T00:00:00Z",
};

// ── Route under test (imported after all mocks) ───────────────────────────────
import { GET, POST, PATCH } from "@/app/api/org-auth/courses/route";

// ═══════════════════════════════════════════════════════════════════════════════
// GET
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/org-auth/courses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireOrgSession.mockResolvedValue(SESSION);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/too many requests/i);
  });

  it("returns 401 when requireOrgSession throws a 401 Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
    );
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
  });

  it("returns 500 when requireOrgSession throws an unexpected Error", async () => {
    mockRequireOrgSession.mockRejectedValue(new Error("unexpected"));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(500);
  });

  it("returns 500 when the courses DB query fails", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "db error" } }));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Failed to load courses/i);
  });

  it("returns 200 with empty array when org has no courses", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.courses).toEqual([]);
  });

  it("returns 200 with courses array on success", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: [SAMPLE_COURSE], error: null }));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.courses).toHaveLength(1);
    expect(body.courses[0].title).toBe("Intro to Investing");
    expect(body.courses[0].status).toBe("draft");
  });

  it("returns 200 with all courses when multiple exist", async () => {
    const courses = [
      { ...SAMPLE_COURSE, id: 10, title: "Course A" },
      { ...SAMPLE_COURSE, id: 11, title: "Course B" },
    ];
    mockAdminFrom.mockReturnValue(makeChain({ data: courses, error: null }));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    expect((await res.json()).courses).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/org-auth/courses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireOrgSession.mockResolvedValue(SESSION);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq("POST", VALID_CREATE_BODY));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/too many requests/i);
  });

  it("returns 401 when requireOrgSession throws a 401 Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
    );
    const res = await POST(makeReq("POST", VALID_CREATE_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/org-auth/courses", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "not-json{{",
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid json/i);
  });

  it("returns 400 when title is too short (Zod min 5)", async () => {
    const res = await POST(makeReq("POST", { title: "Hi", price: 0 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("validation_error");
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("returns 400 when title exceeds 120 chars (Zod max 120)", async () => {
    const longTitle = "A".repeat(121);
    const res = await POST(makeReq("POST", { title: longTitle, price: 0 }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("validation_error");
  });

  it("returns 400 when price is missing (required field)", async () => {
    const res = await POST(makeReq("POST", { title: "Valid Title" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when price is negative (min 0)", async () => {
    const res = await POST(makeReq("POST", { title: "Valid Title", price: -1 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when level is an invalid enum value", async () => {
    const res = await POST(makeReq("POST", { ...VALID_CREATE_BODY, level: "expert" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the org is not found in the DB", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "not found" } }));
    const res = await POST(makeReq("POST", VALID_CREATE_BODY));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/Organisation not found/i);
  });

  it("returns 403 when the tier course limit is reached", async () => {
    // First call: organisations table returns tier=free (limit=1)
    // Second call: courses count returns 1 (at limit)
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: { tier: "free" }, error: null });
      if (call === 2) return makeChain({ data: null, error: null, count: 1 });
      return makeChain();
    });
    const res = await POST(makeReq("POST", VALID_CREATE_BODY));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/course limit reached/i);
    expect(body.error).toMatch(/free/i);
  });

  it("returns 500 when the course count query fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: { tier: "starter" }, error: null });
      return makeChain({ data: null, error: { message: "count boom" }, count: null });
    });
    const res = await POST(makeReq("POST", VALID_CREATE_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Failed to check course limit/i);
  });

  it("returns 500 when the insert fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: { tier: "growth" }, error: null });
      if (call === 2) return makeChain({ data: null, error: null, count: 0 });
      return makeChain({ data: null, error: { message: "insert boom" } });
    });
    const res = await POST(makeReq("POST", VALID_CREATE_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Failed to create course/i);
  });

  it("returns 201 with the new course on success (free tier under limit)", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: { tier: "free" }, error: null });
      if (call === 2) return makeChain({ data: null, error: null, count: 0 }); // below limit
      return makeChain({ data: SAMPLE_COURSE, error: null });
    });
    const res = await POST(makeReq("POST", VALID_CREATE_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.course.title).toBe("Intro to Investing");
    expect(body.course.status).toBe("draft");
  });

  it("returns 201 skipping count check for featured tier (Infinity limit)", async () => {
    // featured tier has Infinity limit — count query should be skipped
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: { tier: "featured" }, error: null });
      // call 2 would be count if featured tier incorrectly checks; skip straight to insert
      return makeChain({ data: SAMPLE_COURSE, error: null });
    });
    const res = await POST(makeReq("POST", VALID_CREATE_BODY));
    expect(res.status).toBe(201);
  });

  it("includes all CreateCourseSchema optional fields in a full-body request", async () => {
    const fullBody = {
      title: "Advanced CPD Course",
      description: "A comprehensive course about investing",
      price: 4900,
      level: "advanced",
      estimated_hours: 5,
      is_cpd_eligible: true,
      cpd_hours: 5,
      cpd_category: "technical",
    };
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: { tier: "growth" }, error: null });
      if (call === 2) return makeChain({ data: null, error: null, count: 3 });
      return makeChain({ data: { ...SAMPLE_COURSE, ...fullBody }, error: null });
    });
    const res = await POST(makeReq("POST", fullBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.course.level).toBe("advanced");
    expect(body.course.is_cpd_eligible).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH
// ═══════════════════════════════════════════════════════════════════════════════

describe("PATCH /api/org-auth/courses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireOrgSession.mockResolvedValue(SESSION);
  });

  it("returns 401 when requireOrgSession throws a 401 Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
    );
    const res = await PATCH(makeReq("PATCH", { courseId: 10, title: "New Title" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/org-auth/courses", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "not-json{{",
    }) as unknown as NextRequest;
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when courseId is missing from PATCH body", async () => {
    const res = await PATCH(makeReq("PATCH", { title: "New Title" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("validation_error");
  });

  it("returns 400 when courseId is not a positive integer", async () => {
    const res = await PATCH(makeReq("PATCH", { courseId: -1, title: "New Title" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the course does not exist or does not belong to the org", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await PATCH(makeReq("PATCH", { courseId: 99, title: "New Title" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/Course not found/i);
  });

  it("returns 400 when attempting an invalid status transition (e.g., draft→published)", async () => {
    mockAdminFrom.mockReturnValue(
      makeChain({ data: { id: 10, status: "draft", organisation_id: 5 }, error: null }),
    );
    const res = await PATCH(makeReq("PATCH", { courseId: 10, status: "published" }));
    // "published" is not in the PatchCourseSchema enum (only draft/submitted) → Zod 400
    expect(res.status).toBe(400);
  });

  it("returns 400 when trying to transition from a non-draft status to submitted", async () => {
    mockAdminFrom.mockReturnValue(
      makeChain({ data: { id: 10, status: "published", organisation_id: 5 }, error: null }),
    );
    const res = await PATCH(makeReq("PATCH", { courseId: 10, status: "submitted" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/draft→submitted/i);
  });

  it("returns 500 when the update query fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: { id: 10, status: "draft", organisation_id: 5 }, error: null });
      return makeChain({ data: null, error: { message: "update boom" } });
    });
    const res = await PATCH(makeReq("PATCH", { courseId: 10, title: "Updated Title" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Failed to update course/i);
  });

  it("returns 200 with updated course on a simple field update", async () => {
    const updatedCourse = { ...SAMPLE_COURSE, title: "Updated Title" };
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: { id: 10, status: "draft", organisation_id: 5 }, error: null });
      return makeChain({ data: updatedCourse, error: null });
    });
    const res = await PATCH(makeReq("PATCH", { courseId: 10, title: "Updated Title" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.course.title).toBe("Updated Title");
  });

  it("returns 200 on valid draft→submitted status transition", async () => {
    const submittedCourse = { ...SAMPLE_COURSE, status: "submitted" };
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: { id: 10, status: "draft", organisation_id: 5 }, error: null });
      return makeChain({ data: submittedCourse, error: null });
    });
    const res = await PATCH(makeReq("PATCH", { courseId: 10, status: "submitted" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.course.status).toBe("submitted");
  });

  it("returns 400 when title is too short in PATCH body (Zod min 5)", async () => {
    const res = await PATCH(makeReq("PATCH", { courseId: 10, title: "X" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when requireOrgSession throws an unexpected Error", async () => {
    mockRequireOrgSession.mockRejectedValue(new Error("unexpected crash"));
    const res = await PATCH(makeReq("PATCH", { courseId: 10, title: "New Title" }));
    expect(res.status).toBe(500);
  });
});
