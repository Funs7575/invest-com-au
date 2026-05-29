/**
 * Tests for GET + POST /api/advisor-portal/office-hours
 *
 * Auth: requireAdvisorSession
 * GET branches: 401, 500 (db error), 200 (empty list), 200 (list with sessions)
 * POST (withValidatedBody): 400 (bad body), 401, 500 (db error), 201 (created)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRequireAdvisorSession, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<() => Promise<number | null>>().mockResolvedValue(42),
  mockAdminFrom: vi.fn(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (..._args: unknown[]) => mockRequireAdvisorSession(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { GET, POST } from "@/app/api/advisor-portal/office-hours/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBuilder(data: unknown, error: unknown = null) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "order", "limit", "single", "maybeSingle",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data, error }));
  return b;
}

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-portal/office-hours", { method: "GET" });
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-portal/office-hours", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  title: "AMA: ETF Investing Basics",
  scheduled_at: "2026-06-15T10:00:00Z",
};

const SESSION_ROW = {
  id: 1,
  title: "AMA: ETF Investing Basics",
  scheduled_at: "2026-06-15T10:00:00Z",
  status: "upcoming",
  max_questions: 20,
  is_published: false,
};

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/advisor-portal/office-hours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(42);
  });

  it("returns 401 when requireAdvisorSession returns null", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/unauthorized/i);
  });

  it("returns 500 when the DB query fails", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, { message: "db error" }));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    expect((await res.json() as Record<string, unknown>).error).toBe("fetch_failed");
  });

  it("returns 200 with empty sessions array when advisor has no sessions", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.sessions).toEqual([]);
  });

  it("returns 200 with sessions list", async () => {
    const sessions = [
      { ...SESSION_ROW, id: 1 },
      { ...SESSION_ROW, id: 2, title: "Q&A: Property Investment" },
    ];
    mockAdminFrom.mockReturnValue(makeBuilder(sessions));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect((body.sessions as unknown[]).length).toBe(2);
    expect(((body.sessions as Array<Record<string, unknown>>)[0]).id).toBe(1);
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/advisor-portal/office-hours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(42);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/advisor-portal/office-hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalid-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is too short (less than 5 chars)", async () => {
    const res = await POST(makePost({ title: "AB", scheduled_at: "2026-06-15T10:00:00Z" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when scheduled_at is not a valid datetime", async () => {
    const res = await POST(makePost({ title: "Valid Title Here", scheduled_at: "not-a-date" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when scheduled_at is missing", async () => {
    const res = await POST(makePost({ title: "Valid Title Here" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when max_questions exceeds 100", async () => {
    const res = await POST(makePost({ ...VALID_BODY, max_questions: 101 }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when requireAdvisorSession returns null", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 500 when insert fails", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, { message: "insert error" }));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    expect((await res.json() as Record<string, unknown>).error).toBe("insert_failed");
  });

  it("returns 201 with created session on success", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(SESSION_ROW));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.id).toBe(1);
    expect(body.title).toBe("AMA: ETF Investing Basics");
    expect(body.status).toBe("upcoming");
    expect(body.max_questions).toBe(20);
    expect(body.is_published).toBe(false);
  });

  it("creates session with optional fields when provided", async () => {
    const fullBody = {
      ...VALID_BODY,
      description: "A session about ETF basics for beginners.",
      ends_at: "2026-06-15T11:00:00Z",
      max_questions: 50,
      is_published: true,
    };
    const fullSession = { ...SESSION_ROW, description: fullBody.description, max_questions: 50, is_published: true };
    mockAdminFrom.mockReturnValue(makeBuilder(fullSession));
    const res = await POST(makePost(fullBody));
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.max_questions).toBe(50);
    expect(body.is_published).toBe(true);
  });
});
