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

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(async () => false),
}));

// withValidatedBody: pass through schema validation so Zod 400 tests work.
vi.mock("@/lib/validation/withValidatedBody", () => ({
  withValidatedBody:
    (
      schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { issues: unknown[] } } },
      handler: (req: NextRequest, body: unknown) => unknown,
    ) =>
    async (req: NextRequest) => {
      let raw: unknown;
      try {
        raw = await req.json();
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
      }
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const issues = parsed.error!.issues as Array<{ path?: string[]; message?: string }>;
        const first = issues[0];
        const path = first?.path?.join(".") ?? "";
        const message = first?.message ?? "Invalid request body";
        return new Response(
          JSON.stringify({ error: path ? `${path}: ${message}` : message, code: "validation_error", issues }),
          { status: 400 },
        );
      }
      return handler(req, parsed.data);
    },
}));

// vi.hoisted so the fn reference is captured before factory runs.
const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<() => Promise<number | null>>(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args as []),
}));

// ── Supabase admin chain builder ───────────────────────────────────────────────

function makeBuilder(result: unknown = { data: null, error: null, count: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "in",
    "is",
    "not",
    "or",
    "order",
    "limit",
    "like",
    "ilike",
    "filter",
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

import { GET, POST, PATCH, DELETE } from "@/app/api/advisor-auth/courses/[courseId]/lessons/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Request factories ─────────────────────────────────────────────────────────

const BASE_URL = "http://localhost/api/advisor-auth/courses/5/lessons";

function makeGet(ip = "1.2.3.4"): [NextRequest, { params: Promise<{ courseId: string }> }] {
  return [
    new NextRequest(BASE_URL, { method: "GET", headers: { "x-forwarded-for": ip } }),
    { params: Promise.resolve({ courseId: "5" }) },
  ];
}

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest(BASE_URL, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
  });
}

function makePatch(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest(BASE_URL, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
  });
}

function makeDelete(body: unknown, ip = "1.2.3.4"): [NextRequest, { params: Promise<{ courseId: string }> }] {
  return [
    new NextRequest(BASE_URL, {
      method: "DELETE",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    }),
    { params: Promise.resolve({ courseId: "5" }) },
  ];
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADVISOR_ID = 42;

const mockCourse = { id: 5, slug: "my-course-slug" };

const mockLesson = {
  id: 100,
  slug: "my-course-slug-m1-l0-intro",
  title: "Introduction",
  module_title: "Module 1",
  module_index: 1,
  lesson_index: 0,
  content: "Hello world",
  video_url: null,
  duration_minutes: 15,
  is_free_preview: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const validCreateBody = {
  title: "Introduction",
  module_title: "Module 1",
  module_index: 1,
  lesson_index: 0,
  content: "Hello world",
  duration_minutes: 15,
  is_free_preview: false,
};

const validPatchBody = {
  lessonId: 100,
  title: "Updated Introduction",
};

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/courses/[courseId]/lessons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    // Still need a course ownership check to not fire — mock courses as null
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const res = await GET(...makeGet());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 400 when courseId is not a valid integer", async () => {
    const req = new NextRequest("http://localhost/api/advisor-auth/courses/abc/lessons", {
      method: "GET",
    });
    const ctx = { params: Promise.resolve({ courseId: "abc" }) };
    const res = await GET(req, ctx);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid courseId/i);
  });

  it("returns 404 when advisor does not own the course", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const res = await GET(...makeGet());
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/Course not found/i);
  });

  it("returns lessons array on success", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        b.maybeSingle = vi.fn(() => Promise.resolve({ data: mockCourse, error: null }));
        return b;
      }
      if (table === "course_lessons") {
        return makeBuilder({ data: [mockLesson], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(...makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.lessons).toHaveLength(1);
    expect(json.lessons[0].slug).toBe("my-course-slug-m1-l0-intro");
  });

  it("returns empty array when course has no lessons", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        b.maybeSingle = vi.fn(() => Promise.resolve({ data: mockCourse, error: null }));
        return b;
      }
      if (table === "course_lessons") {
        return makeBuilder({ data: null, error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(...makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.lessons).toEqual([]);
  });

  it("returns 500 when lessons DB query fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        b.maybeSingle = vi.fn(() => Promise.resolve({ data: mockCourse, error: null }));
        return b;
      }
      if (table === "course_lessons") {
        return makeBuilder({ data: null, error: { message: "db error" } });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(...makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to fetch lessons/i);
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/courses/[courseId]/lessons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await POST(makePost(validCreateBody));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const res = await POST(makePost(validCreateBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makePost({ module_title: "Module 1", module_index: 1, lesson_index: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is too short", async () => {
    const res = await POST(makePost({ ...validCreateBody, title: "X" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when module_index is negative", async () => {
    const res = await POST(makePost({ ...validCreateBody, module_index: -1 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when video_url is not a valid URL", async () => {
    const res = await POST(makePost({ ...validCreateBody, video_url: "not-a-url" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when advisor does not own the course", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        b.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
        return b;
      }
      return makeBuilder({ data: null, error: null });
    });
    const res = await POST(makePost(validCreateBody));
    expect(res.status).toBe(404);
  });

  it("creates lesson and returns 201 when slug has no conflict", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        b.maybeSingle = vi.fn(() => Promise.resolve({ data: mockCourse, error: null }));
        return b;
      }
      if (table === "course_lessons") {
        const b = makeBuilder({ data: null, error: null });
        // slug-count query (count = 0 → no conflict)
        b.then = (cb: (v: unknown) => unknown) =>
          Promise.resolve(cb({ data: null, error: null, count: 0 }));
        b.single = vi.fn(() => Promise.resolve({ data: mockLesson, error: null }));
        return b;
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(validCreateBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.lesson).toBeDefined();
    expect(json.lesson.id).toBe(100);
  });

  it("appends timestamp to slug when slug conflict exists", async () => {
    let lessonInsertSlug = "";
    mockFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        b.maybeSingle = vi.fn(() => Promise.resolve({ data: mockCourse, error: null }));
        return b;
      }
      if (table === "course_lessons") {
        const b = makeBuilder({ data: null, error: null });
        b.then = (cb: (v: unknown) => unknown) =>
          Promise.resolve(cb({ data: null, error: null, count: 1 }));
        b.insert = vi.fn((row: Record<string, unknown>) => {
          lessonInsertSlug = row.slug as string;
          return b;
        });
        b.single = vi.fn(() => Promise.resolve({ data: { ...mockLesson, slug: lessonInsertSlug }, error: null }));
        return b;
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(validCreateBody));
    expect(res.status).toBe(201);
    // Slug should include a timestamp suffix after a dash
    const json = await res.json();
    expect(json.lesson.slug).toMatch(/-\d+/);
  });

  it("returns 500 when DB insert fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        b.maybeSingle = vi.fn(() => Promise.resolve({ data: mockCourse, error: null }));
        return b;
      }
      if (table === "course_lessons") {
        const b = makeBuilder({ data: null, error: null });
        b.then = (cb: (v: unknown) => unknown) =>
          Promise.resolve(cb({ data: null, error: null, count: 0 }));
        b.single = vi.fn(() => Promise.resolve({ data: null, error: { message: "insert failed" } }));
        return b;
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await POST(makePost(validCreateBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to create lesson/i);
  });
});

// ── PATCH ─────────────────────────────────────────────────────────────────────

describe("PATCH /api/advisor-auth/courses/[courseId]/lessons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await PATCH(makePatch(validPatchBody));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const res = await PATCH(makePatch(validPatchBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 when lessonId is missing", async () => {
    const res = await PATCH(makePatch({ title: "Some title" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when lessonId is not a positive integer", async () => {
    const res = await PATCH(makePatch({ lessonId: -1, title: "Some title" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when advisor does not own the course", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        b.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
        return b;
      }
      return makeBuilder({ data: null, error: null });
    });
    const res = await PATCH(makePatch(validPatchBody));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/Course not found/i);
  });

  it("returns 404 when lesson does not belong to the course", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        b.maybeSingle = vi.fn(() => Promise.resolve({ data: mockCourse, error: null }));
        return b;
      }
      if (table === "course_lessons") {
        const b = makeBuilder({ data: null, error: null });
        // maybeSingle for ownership check returns null
        b.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
        return b;
      }
      return makeBuilder({ data: null, error: null });
    });
    const res = await PATCH(makePatch(validPatchBody));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/Lesson not found/i);
  });

  it("updates lesson and returns 200 on success", async () => {
    const updatedLesson = { ...mockLesson, title: "Updated Introduction" };
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        b.maybeSingle = vi.fn(() => Promise.resolve({ data: mockCourse, error: null }));
        return b;
      }
      if (table === "course_lessons") {
        callCount++;
        const b = makeBuilder({ data: null, error: null });
        if (callCount === 1) {
          // First call: ownership check (maybeSingle)
          b.maybeSingle = vi.fn(() => Promise.resolve({ data: { id: 100 }, error: null }));
        } else {
          // Second call: update + single
          b.single = vi.fn(() => Promise.resolve({ data: updatedLesson, error: null }));
        }
        return b;
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await PATCH(makePatch(validPatchBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.lesson.title).toBe("Updated Introduction");
  });

  it("returns 500 when DB update fails", async () => {
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        b.maybeSingle = vi.fn(() => Promise.resolve({ data: mockCourse, error: null }));
        return b;
      }
      if (table === "course_lessons") {
        callCount++;
        const b = makeBuilder({ data: null, error: null });
        if (callCount === 1) {
          b.maybeSingle = vi.fn(() => Promise.resolve({ data: { id: 100 }, error: null }));
        } else {
          b.single = vi.fn(() => Promise.resolve({ data: null, error: { message: "update failed" } }));
        }
        return b;
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await PATCH(makePatch(validPatchBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to update lesson/i);
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe("DELETE /api/advisor-auth/courses/[courseId]/lessons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await DELETE(...makeDelete({ lessonId: 100 }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const res = await DELETE(...makeDelete({ lessonId: 100 }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 400 when courseId is invalid", async () => {
    const req = new NextRequest("http://localhost/api/advisor-auth/courses/nan/lessons", {
      method: "DELETE",
      body: JSON.stringify({ lessonId: 100 }),
      headers: { "Content-Type": "application/json" },
    });
    const ctx = { params: Promise.resolve({ courseId: "nan" }) };
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid courseId/i);
  });

  it("returns 400 when lessonId is missing from request body", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        b.maybeSingle = vi.fn(() => Promise.resolve({ data: mockCourse, error: null }));
        return b;
      }
      return makeBuilder({ data: null, error: null });
    });
    const res = await DELETE(...makeDelete({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when request body is not valid JSON", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        b.maybeSingle = vi.fn(() => Promise.resolve({ data: mockCourse, error: null }));
        return b;
      }
      return makeBuilder({ data: null, error: null });
    });
    const req = new NextRequest(BASE_URL, {
      method: "DELETE",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const ctx = { params: Promise.resolve({ courseId: "5" }) };
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid request body/i);
  });

  it("returns 404 when advisor does not own the course", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        b.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
        return b;
      }
      return makeBuilder({ data: null, error: null });
    });
    const res = await DELETE(...makeDelete({ lessonId: 100 }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/Course not found/i);
  });

  it("deletes lesson and returns success on happy path", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        b.maybeSingle = vi.fn(() => Promise.resolve({ data: mockCourse, error: null }));
        return b;
      }
      if (table === "course_lessons") {
        // delete chain resolves with no error
        return makeBuilder({ data: null, error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await DELETE(...makeDelete({ lessonId: 100 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 500 when DB delete fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "courses") {
        const b = makeBuilder({ data: null, error: null });
        b.maybeSingle = vi.fn(() => Promise.resolve({ data: mockCourse, error: null }));
        return b;
      }
      if (table === "course_lessons") {
        return makeBuilder({ data: null, error: { message: "delete failed" } });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await DELETE(...makeDelete({ lessonId: 100 }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to delete lesson/i);
  });
});
