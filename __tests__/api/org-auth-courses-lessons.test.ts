import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Hoisted mock refs (must use vi.hoisted so they're available inside vi.mock factories) ──

const { mockRequireOrgSession, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireOrgSession: vi.fn<() => Promise<{ organisationId: number; email: string }>>(
    async () => ({ organisationId: 1, email: "org@example.com" }),
  ),
  mockAdminFrom: vi.fn(() => makeChain()),
}));

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit", () => ({ isRateLimited: vi.fn(async () => false) }));

vi.mock("@/lib/require-org-session", () => ({
  requireOrgSession: mockRequireOrgSession,
}));

vi.mock("@/lib/validation/withValidatedBody", () => ({
  withValidatedBody: (_schema: unknown, handler: (req: NextRequest, body: unknown) => unknown) =>
    async (req: NextRequest) => {
      const body = await req.json().catch(() => ({}));
      return handler(req, body);
    },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeChain(res: { data?: unknown; error?: unknown; count?: number } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "maybeSingle", "single", "like",
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

function makeReq(method: string, url: string, body?: unknown): NextRequest {
  return new Request(url, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

const COURSE_URL = "http://localhost/api/org-auth/courses/42/lessons";

const validCreateBody = {
  title: "Intro to Investing",
  slug: "intro-to-investing",
  module_title: "Module 1",
  module_index: 0,
  lesson_index: 0,
  content: "Lesson content here",
};

const validPatchBody = {
  lessonId: 7,
  title: "Updated Title",
};

// ── Route under test (imported after all mocks) ─────────────────────────────

import { GET, POST, PATCH } from "@/app/api/org-auth/courses/[courseId]/lessons/route";

// ── GET ─────────────────────────────────────────────────────────────────────

describe("GET /api/org-auth/courses/[courseId]/lessons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrgSession.mockResolvedValue({ organisationId: 1, email: "org@example.com" });
  });

  it("returns 401 when requireOrgSession throws a Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );
    const req = makeReq("GET", COURSE_URL);
    const res = await GET(req, { params: Promise.resolve({ courseId: "42" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric courseId", async () => {
    const req = makeReq("GET", "http://localhost/api/org-auth/courses/abc/lessons");
    const res = await GET(req, { params: Promise.resolve({ courseId: "abc" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid course id/i);
  });

  it("returns 404 when course not found or not owned", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const req = makeReq("GET", COURSE_URL);
    const res = await GET(req, { params: Promise.resolve({ courseId: "42" }) });
    expect(res.status).toBe(404);
  });

  it("returns 500 when lessons query fails", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return makeChain({ data: { id: 42, slug: "my-course" }, error: null });
      return makeChain({ data: null, error: { message: "db error" } });
    });
    const req = makeReq("GET", COURSE_URL);
    const res = await GET(req, { params: Promise.resolve({ courseId: "42" }) });
    expect(res.status).toBe(500);
  });

  it("returns 200 with lessons array on success", async () => {
    const mockLessons = [
      { id: 1, title: "Lesson 1", slug: "lesson-1", module_title: "M1", module_index: 0, lesson_index: 0 },
    ];
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return makeChain({ data: { id: 42, slug: "my-course" }, error: null });
      return makeChain({ data: mockLessons, error: null });
    });
    const req = makeReq("GET", COURSE_URL);
    const res = await GET(req, { params: Promise.resolve({ courseId: "42" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("lessons");
    expect(json.lessons).toHaveLength(1);
  });

  it("returns 200 with empty array when no lessons exist", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return makeChain({ data: { id: 42, slug: "my-course" }, error: null });
      return makeChain({ data: null, error: null });
    });
    const req = makeReq("GET", COURSE_URL);
    const res = await GET(req, { params: Promise.resolve({ courseId: "42" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.lessons).toEqual([]);
  });
});

// ── POST ────────────────────────────────────────────────────────────────────

describe("POST /api/org-auth/courses/[courseId]/lessons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrgSession.mockResolvedValue({ organisationId: 1, email: "org@example.com" });
  });

  it("returns 401 when requireOrgSession throws a Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );
    const req = makeReq("POST", COURSE_URL, validCreateBody);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric courseId in URL", async () => {
    const req = makeReq("POST", "http://localhost/api/org-auth/courses/NaN/lessons", validCreateBody);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when course not found", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const req = makeReq("POST", COURSE_URL, validCreateBody);
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 500 when lesson insert fails", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return makeChain({ data: { id: 42, slug: "my-course" }, error: null });
      return makeChain({ data: null, error: { message: "unique violation" } });
    });
    const req = makeReq("POST", COURSE_URL, validCreateBody);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("returns 201 with lesson on success", async () => {
    const newLesson = { id: 10, title: "Intro to Investing", slug: "intro-to-investing" };
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return makeChain({ data: { id: 42, slug: "my-course" }, error: null });
      return makeChain({ data: newLesson, error: null });
    });
    const req = makeReq("POST", COURSE_URL, validCreateBody);
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty("lesson");
    expect(json.lesson.title).toBe("Intro to Investing");
  });
});

// ── PATCH ───────────────────────────────────────────────────────────────────

describe("PATCH /api/org-auth/courses/[courseId]/lessons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrgSession.mockResolvedValue({ organisationId: 1, email: "org@example.com" });
  });

  it("returns 401 when requireOrgSession throws a Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );
    const req = makeReq("PATCH", COURSE_URL, validPatchBody);
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("returns 404 when course not found", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const req = makeReq("PATCH", COURSE_URL, validPatchBody);
    const res = await PATCH(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/course not found/i);
  });

  it("returns 404 when lesson does not belong to course", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return makeChain({ data: { id: 42, slug: "my-course" }, error: null });
      return makeChain({ data: null, error: null });
    });
    const req = makeReq("PATCH", COURSE_URL, validPatchBody);
    const res = await PATCH(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/lesson not found/i);
  });

  it("returns 500 when update query fails", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return makeChain({ data: { id: 42, slug: "my-course" }, error: null });
      if (callCount === 2) return makeChain({ data: { id: 7 }, error: null });
      return makeChain({ data: null, error: { message: "update failed" } });
    });
    const req = makeReq("PATCH", COURSE_URL, validPatchBody);
    const res = await PATCH(req);
    expect(res.status).toBe(500);
  });

  it("returns 200 with updated lesson on success", async () => {
    const updatedLesson = { id: 7, title: "Updated Title", slug: "intro-to-investing" };
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return makeChain({ data: { id: 42, slug: "my-course" }, error: null });
      if (callCount === 2) return makeChain({ data: { id: 7 }, error: null });
      return makeChain({ data: updatedLesson, error: null });
    });
    const req = makeReq("PATCH", COURSE_URL, validPatchBody);
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("lesson");
    expect(json.lesson.title).toBe("Updated Title");
  });

  it("returns 400 for non-numeric courseId in URL", async () => {
    const req = makeReq("PATCH", "http://localhost/api/org-auth/courses/bad/lessons", validPatchBody);
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});
