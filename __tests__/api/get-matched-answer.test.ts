/**
 * Tests for POST /api/get-matched/answer — adaptive question walker step.
 *
 * Pipeline: rate-limit → JSON parse → AnswerQuestionRequest (real schema) →
 * resolve the question → ephemeral (plan_id 0) or DB-backed path → next
 * question. The action-plan / questions / events / errors helpers are mocked
 * so each branch (ephemeral, persisted, not-found, degrade-on-throw) is
 * exercised in isolation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockIsAllowed,
  mockGetPlanById,
  mockUpdatePlan,
  mockGetQuestions,
  mockNextQuestion,
  mockNextQuestionWithAI,
  mockLogEvent,
  mockClassify,
} = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockGetPlanById: vi.fn(),
  mockUpdatePlan: vi.fn(),
  mockGetQuestions: vi.fn(),
  mockNextQuestion: vi.fn(),
  mockNextQuestionWithAI: vi.fn(),
  mockLogEvent: vi.fn(),
  mockClassify: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/getmatched/action-plans", () => ({
  getPlanById: (...args: unknown[]) => mockGetPlanById(...args),
  updatePlan: (...args: unknown[]) => mockUpdatePlan(...args),
}));

vi.mock("@/lib/getmatched/questions", () => ({
  getQuestions: (...args: unknown[]) => mockGetQuestions(...args),
  nextQuestion: (...args: unknown[]) => mockNextQuestion(...args),
  nextQuestionWithAI: (...args: unknown[]) => mockNextQuestionWithAI(...args),
}));

vi.mock("@/lib/getmatched/events", () => ({
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
}));

vi.mock("@/lib/getmatched/errors", () => ({
  classifyGetMatchedError: (...args: unknown[]) => mockClassify(...args),
  errorResponse: vi.fn(() =>
    // Mirror the real helper's status semantics for the fallback path.
    new Response(JSON.stringify({ error: "Failed to save answer." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }),
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/get-matched/answer/route";

const QUESTION = { slug: "intent", maps_to: "intent", step: 1 };
const NEXT = { slug: "budget", maps_to: "budget", step: 2 };

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/get-matched/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAllowed.mockResolvedValue(true);
  mockGetQuestions.mockResolvedValue([QUESTION]);
  mockNextQuestion.mockReturnValue(NEXT);
  mockNextQuestionWithAI.mockResolvedValue(NEXT);
});

describe("POST /api/get-matched/answer", () => {
  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq({ plan_id: 0, question_slug: "intent", value: "compare" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/get-matched/answer", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid JSON body." });
  });

  it("returns 400 when the body fails schema validation (missing value)", async () => {
    const res = await POST(makeReq({ plan_id: 0, question_slug: "intent" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown question slug", async () => {
    const res = await POST(
      makeReq({ plan_id: 0, question_slug: "does-not-exist", value: "x" }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Unknown question." });
  });

  it("ephemeral path (plan_id 0): computes next question without touching the DB", async () => {
    const res = await POST(
      makeReq({ plan_id: 0, question_slug: "intent", value: "compare" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ plan_id: 0, next: NEXT, ephemeral: true });
    expect(mockGetPlanById).not.toHaveBeenCalled();
    expect(mockNextQuestion).toHaveBeenCalled();
  });

  it("DB-backed path: persists the answer, logs the event, returns the next question", async () => {
    mockGetPlanById.mockResolvedValueOnce({
      id: 42,
      session_id: "sess-1",
      auth_user_id: "user-1",
      answers: { existing: true },
    });
    mockUpdatePlan.mockResolvedValueOnce({ id: 42, answers: { existing: true, intent: "compare" } });

    const res = await POST(
      makeReq({ plan_id: 42, question_slug: "intent", value: "compare" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ plan_id: 42, next: NEXT });
    expect(mockUpdatePlan).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42, answers: expect.objectContaining({ intent: "compare" }) }),
    );
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "question_answered", step: 1 }),
    );
    expect(mockNextQuestionWithAI).toHaveBeenCalled();
  });

  it("returns 404 when the persisted plan is not found", async () => {
    mockGetPlanById.mockResolvedValueOnce(null);
    const res = await POST(
      makeReq({ plan_id: 7, question_slug: "intent", value: "compare" }),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "Plan not found." });
  });

  it("degrades to ephemeral when getPlanById fails with a DB-not-ready code", async () => {
    mockGetPlanById.mockRejectedValueOnce(new Error("relation does not exist"));
    mockClassify.mockReturnValueOnce({ code: "database_not_ready", status: 503, detail: "x" });
    const res = await POST(
      makeReq({ plan_id: 7, question_slug: "intent", value: "compare" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ plan_id: 0, next: NEXT, ephemeral: true });
  });
});
