/**
 * Tests for PATCH /api/advisor-portal/office-hours/[id]/questions/[qid]
 *
 * Auth: requireAdvisorSession
 * Branches: 400 (bad sessionId), 400 (bad questionId), 400 (bad body),
 *           401, 404 (session not found), 404 (question not found),
 *           500 (db error), 200 (answer set), 200 (is_removed set)
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

import { PATCH } from "@/app/api/advisor-portal/office-hours/[id]/questions/[qid]/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBuilder(data: unknown, error: unknown = null) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "update", "eq", "order", "limit", "single", "maybeSingle",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data, error }));
  return b;
}

function makePatch(sessionId: number | string, questionId: number | string, body: unknown): NextRequest {
  return new NextRequest(
    `http://localhost/api/advisor-portal/office-hours/${sessionId}/questions/${questionId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

const SESSION = { id: 7, advisor_id: 42 };
const QUESTION = { id: 3, session_id: 7 };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PATCH /api/advisor-portal/office-hours/[id]/questions/[qid]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(42);
  });

  it("returns 400 when session id in URL is not a valid integer", async () => {
    const res = await PATCH(makePatch("not-id", 3, { answer: "Great question!" }));
    expect(res.status).toBe(400);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/invalid session id/i);
  });

  it("returns 400 when question id in URL is not a valid integer", async () => {
    const res = await PATCH(makePatch(7, "not-qid", { answer: "Hello" }));
    expect(res.status).toBe(400);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/invalid question id/i);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest(
      "http://localhost/api/advisor-portal/office-hours/7/questions/3",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{bad json",
      },
    );
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when answer exceeds max length (2000 chars)", async () => {
    const longAnswer = "x".repeat(2001);
    const res = await PATCH(makePatch(7, 3, { answer: longAnswer }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when requireAdvisorSession returns null", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    mockAdminFrom.mockReturnValue(makeBuilder(SESSION));
    const res = await PATCH(makePatch(7, 3, { answer: "My answer" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when session does not belong to this advisor", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null));
    const res = await PATCH(makePatch(7, 3, { answer: "My answer" }));
    expect(res.status).toBe(404);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/session not found/i);
  });

  it("returns 404 when question does not belong to this session", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder(SESSION); // session
      return makeBuilder(null);                    // question not found
    });
    const res = await PATCH(makePatch(7, 3, { answer: "My answer" }));
    expect(res.status).toBe(404);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/question not found/i);
  });

  it("returns 500 when the update query fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder(SESSION);
      if (call === 2) return makeBuilder(QUESTION);
      return makeBuilder(null, { message: "db error" });
    });
    const res = await PATCH(makePatch(7, 3, { answer: "My answer" }));
    expect(res.status).toBe(500);
  });

  it("returns 200 with updated question when answer is set", async () => {
    const updated = {
      id: 3,
      question: "What about ETFs?",
      answer: "They are great.",
      answered_at: "2026-05-01T10:00:00Z",
      is_removed: false,
    };
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder(SESSION);
      if (call === 2) return makeBuilder(QUESTION);
      return makeBuilder(updated);
    });
    const res = await PATCH(makePatch(7, 3, { answer: "They are great." }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.id).toBe(3);
    expect(body.answer).toBe("They are great.");
    expect(body.answered_at).not.toBeNull();
  });

  it("returns 200 when is_removed is set to true", async () => {
    const updated = {
      id: 3,
      question: "Off-topic question",
      answer: null,
      answered_at: null,
      is_removed: true,
    };
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder(SESSION);
      if (call === 2) return makeBuilder(QUESTION);
      return makeBuilder(updated);
    });
    const res = await PATCH(makePatch(7, 3, { is_removed: true }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.is_removed).toBe(true);
  });

  it("returns 200 when both answer and is_removed are updated together", async () => {
    const updated = {
      id: 3,
      question: "Test",
      answer: "Yes",
      answered_at: "2026-05-01T10:00:00Z",
      is_removed: false,
    };
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder(SESSION);
      if (call === 2) return makeBuilder(QUESTION);
      return makeBuilder(updated);
    });
    const res = await PATCH(makePatch(7, 3, { answer: "Yes", is_removed: false }));
    expect(res.status).toBe(200);
  });
});
