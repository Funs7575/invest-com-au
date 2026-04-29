import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/course/progress/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER = { id: "user-123" };

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/course/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function maybySingleChain(result: { data: unknown; error?: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.limit = vi.fn(() => c);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  return c;
}

function upsertChain(result: { error: unknown }) {
  const c: Record<string, unknown> = {};
  c.upsert = vi.fn(() => Promise.resolve(result));
  return c;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/course/progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: USER } });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost({ lesson_id: 1, course_slug: "investing-101" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when lesson_id is missing", async () => {
    const res = await POST(makePost({ course_slug: "investing-101" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/lesson_id/i);
  });

  it("returns 400 when lesson_id is not a number", async () => {
    const res = await POST(makePost({ lesson_id: "one", course_slug: "investing-101" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when course_slug is missing", async () => {
    const res = await POST(makePost({ lesson_id: 1 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/course_slug/i);
  });

  it("returns 400 when course_slug is not a string", async () => {
    const res = await POST(makePost({ lesson_id: 1, course_slug: 42 }));
    expect(res.status).toBe(400);
  });

  it("returns 403 when user has not purchased the course", async () => {
    mockAdminFrom.mockReturnValue(maybySingleChain({ data: null }));
    const res = await POST(makePost({ lesson_id: 1, course_slug: "investing-101" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/not purchased/i);
  });

  it("returns 200 on successful progress upsert", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return maybySingleChain({ data: { id: "purchase-1" } });
      return upsertChain({ error: null });
    });
    const res = await POST(makePost({ lesson_id: 5, course_slug: "investing-101" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("upserts on user_id+lesson_id conflict (idempotent)", async () => {
    let callCount = 0;
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return maybySingleChain({ data: { id: "purchase-1" } });
      return { upsert: upsertMock };
    });
    await POST(makePost({ lesson_id: 3, course_slug: "investing-101" }));
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ lesson_id: 3, user_id: USER.id }),
      expect.objectContaining({ onConflict: "user_id,lesson_id" }),
    );
  });

  it("returns 500 when upsert fails", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return maybySingleChain({ data: { id: "purchase-1" } });
      return upsertChain({ error: { message: "DB error" } });
    });
    const res = await POST(makePost({ lesson_id: 1, course_slug: "investing-101" }));
    expect(res.status).toBe(500);
  });

  it("returns 500 when supabase throws unexpectedly", async () => {
    mockGetUser.mockRejectedValue(new Error("Connection error"));
    const res = await POST(makePost({ lesson_id: 1, course_slug: "investing-101" }));
    expect(res.status).toBe(500);
  });
});
