/**
 * Tests for POST /api/get-matched/answer
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

const mockGetQuestions = vi.fn();
const mockNextQuestion = vi.fn();
const mockNextQuestionWithAI = vi.fn();
vi.mock("@/lib/getmatched/questions", () => ({
  getQuestions: (...args: unknown[]) => mockGetQuestions(...args),
  nextQuestion: (...args: unknown[]) => mockNextQuestion(...args),
  nextQuestionWithAI: (...args: unknown[]) => mockNextQuestionWithAI(...args),
}));

const mockGetPlanById = vi.fn();
const mockUpdatePlan = vi.fn();
vi.mock("@/lib/getmatched/action-plans", () => ({
  getPlanById: (...args: unknown[]) => mockGetPlanById(...args),
  updatePlan: (...args: unknown[]) => mockUpdatePlan(...args),
  createPlan: vi.fn(),
  toggleChecklistItem: vi.fn(() => []),
  getPlanByToken: vi.fn(),
  claimPlanForUser: vi.fn(),
  linkBriefToPlan: vi.fn(),
}));

vi.mock("@/lib/getmatched/events", () => ({
  logEvent: vi.fn(async () => undefined),
}));

vi.mock("@/lib/getmatched/errors", () => ({
  classifyGetMatchedError: vi.fn((err) => ({
    code: "unknown",
    detail: String(err),
  })),
  errorResponse: vi.fn(() => new Response(JSON.stringify({ error: "error" }), { status: 500 })),
}));

import { POST } from "@/app/api/get-matched/answer/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/get-matched/answer", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

const MOCK_QUESTION = {
  slug: "goal",
  maps_to: "goal",
  step: 1,
};

describe("POST /api/get-matched/answer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetQuestions.mockResolvedValue([MOCK_QUESTION]);
    mockNextQuestion.mockReturnValue({ slug: "budget", step: 2 });
    mockNextQuestionWithAI.mockResolvedValue({ slug: "budget", step: 2 });
    mockGetPlanById.mockResolvedValue({
      id: 99,
      session_id: "sess1",
      auth_user_id: null,
      answers: {},
    });
    mockUpdatePlan.mockResolvedValue({ id: 99, answers: { goal: "invest" } });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({ plan_id: 0, question_slug: "goal", value: "invest" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/get-matched/answer", {
      method: "POST",
      body: "not json",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when body fails schema (missing plan_id)", async () => {
    const res = await POST(makeReq({ question_slug: "goal", value: "invest" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown question_slug", async () => {
    const res = await POST(makeReq({ plan_id: 0, question_slug: "unknown_q", value: "x" }));
    expect(res.status).toBe(400);
  });

  it("returns ephemeral result when plan_id is 0", async () => {
    const res = await POST(makeReq({ plan_id: 0, question_slug: "goal", value: "invest" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ephemeral).toBe(true);
    expect(json.plan_id).toBe(0);
  });

  it("returns DB-backed result when plan_id > 0", async () => {
    const res = await POST(makeReq({ plan_id: 99, question_slug: "goal", value: "invest" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.plan_id).toBe(99);
  });

  it("returns 404 when plan not found in DB", async () => {
    mockGetPlanById.mockResolvedValue(null);
    const res = await POST(makeReq({ plan_id: 99, question_slug: "goal", value: "invest" }));
    expect(res.status).toBe(404);
  });
});
