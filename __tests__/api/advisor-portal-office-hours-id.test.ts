/**
 * Tests for PATCH + DELETE /api/advisor-portal/office-hours/[id]
 *
 * Auth: requireAdvisorSession
 * PATCH (withValidatedBody):
 *   400 (bad id), 400 (bad body), 401, 404 (session not found),
 *   409 (ended session without transcript transition), 500 (db error), 200
 * DELETE:
 *   400 (bad id), 401, 404 (not found), 409 (not draft), 200
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

import { PATCH, DELETE } from "@/app/api/advisor-portal/office-hours/[id]/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBuilder(data: unknown, error: unknown = null) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "order", "limit", "single", "maybeSingle",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data, error }));
  return b;
}

function makePatch(sessionId: number | string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/advisor-portal/office-hours/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDelete(sessionId: number | string): NextRequest {
  return new NextRequest(`http://localhost/api/advisor-portal/office-hours/${sessionId}`, {
    method: "DELETE",
  });
}

const EXISTING_SESSION = { id: 7, advisor_id: 42, status: "upcoming" };

// ── PATCH tests ───────────────────────────────────────────────────────────────

describe("PATCH /api/advisor-portal/office-hours/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(42);
  });

  it("returns 400 when session id in URL is not a valid integer", async () => {
    const res = await PATCH(makePatch("not-a-number", { title: "My Session" }));
    expect(res.status).toBe(400);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/invalid session id/i);
  });

  it("returns 400 when body fails Zod validation (title too short)", async () => {
    const res = await PATCH(makePatch(7, { title: "AB" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/advisor-portal/office-hours/7", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{bad json",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 when requireAdvisorSession returns null", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    mockAdminFrom.mockReturnValue(makeBuilder(EXISTING_SESSION));
    const res = await PATCH(makePatch(7, { status: "live" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when session not found for this advisor", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null));
    const res = await PATCH(makePatch(7, { status: "live" }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when trying to edit an ended session without transitioning to transcript", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ ...EXISTING_SESSION, status: "ended" }));
    const res = await PATCH(makePatch(7, { title: "Updated Title 1234" }));
    expect(res.status).toBe(409);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/cannot edit ended/i);
  });

  it("allows updating ended session status to transcript", async () => {
    const updatedSession = { id: 7, title: "Session", status: "transcript", is_published: false, updated_at: "now" };
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder({ ...EXISTING_SESSION, status: "ended" });
      return makeBuilder(updatedSession);
    });
    const res = await PATCH(makePatch(7, { status: "transcript" }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe("transcript");
  });

  it("returns 500 when update DB query fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder(EXISTING_SESSION);
      return makeBuilder(null, { message: "db error" });
    });
    const res = await PATCH(makePatch(7, { status: "live" }));
    expect(res.status).toBe(500);
  });

  it("returns 200 with updated session data on success", async () => {
    const updatedSession = { id: 7, title: "My Great Session", status: "upcoming", is_published: true, updated_at: "now" };
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder(EXISTING_SESSION);
      return makeBuilder(updatedSession);
    });
    const res = await PATCH(makePatch(7, { title: "My Great Session", is_published: true }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.id).toBe(7);
    expect(body.title).toBe("My Great Session");
    expect(body.is_published).toBe(true);
  });

  it("returns 400 for invalid status enum value", async () => {
    const res = await PATCH(makePatch(7, { status: "invalid_status" }));
    expect(res.status).toBe(400);
  });
});

// ── DELETE tests ──────────────────────────────────────────────────────────────

describe("DELETE /api/advisor-portal/office-hours/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(42);
  });

  it("returns 400 when session id is not a valid integer", async () => {
    const res = await DELETE(makeDelete("abc"), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/invalid session id/i);
  });

  it("returns 401 when advisor session is not found", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await DELETE(makeDelete(7), { params: Promise.resolve({ id: "7" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when session does not belong to this advisor", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null));
    const res = await DELETE(makeDelete(7), { params: Promise.resolve({ id: "7" }) });
    expect(res.status).toBe(404);
  });

  it("returns 409 when session is not in draft status", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ id: 7, advisor_id: 42, status: "upcoming" }));
    const res = await DELETE(makeDelete(7), { params: Promise.resolve({ id: "7" }) });
    expect(res.status).toBe(409);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/draft sessions/i);
  });

  it("returns 200 when draft session is successfully deleted", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder({ id: 7, advisor_id: 42, status: "draft" });
      return makeBuilder(null); // delete
    });
    const res = await DELETE(makeDelete(7), { params: Promise.resolve({ id: "7" }) });
    expect(res.status).toBe(200);
    expect((await res.json() as Record<string, unknown>).success).toBe(true);
  });
});
