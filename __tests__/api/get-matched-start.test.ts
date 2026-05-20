/**
 * Tests for POST /api/get-matched/start
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

const mockCreatePlan = vi.fn();
vi.mock("@/lib/getmatched/action-plans", () => ({
  createPlan: (...args: unknown[]) => mockCreatePlan(...args),
  getPlanById: vi.fn(),
  updatePlan: vi.fn(),
  toggleChecklistItem: vi.fn(() => []),
  getPlanByToken: vi.fn(),
  claimPlanForUser: vi.fn(),
  linkBriefToPlan: vi.fn(),
}));

const mockGetQuestions = vi.fn();
const mockNextQuestion = vi.fn();
vi.mock("@/lib/getmatched/questions", () => ({
  getQuestions: (...args: unknown[]) => mockGetQuestions(...args),
  nextQuestion: (...args: unknown[]) => mockNextQuestion(...args),
  nextQuestionWithAI: vi.fn(async () => ({ slug: "budget", step: 2 })),
}));

vi.mock("@/lib/getmatched/events", () => ({
  logEvent: vi.fn(async () => undefined),
}));

vi.mock("@/lib/getmatched/errors", () => ({
  classifyGetMatchedError: vi.fn((err) => ({ code: "unknown", detail: String(err) })),
  errorResponse: vi.fn(() => new Response(JSON.stringify({ error: "error" }), { status: 500 })),
}));

import { POST } from "@/app/api/get-matched/start/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/get-matched/start", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

const VALID_BODY = { session_id: "sess-1234567890" };

describe("POST /api/get-matched/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockCreatePlan.mockResolvedValue({ id: 42, share_token: "tok-abc" });
    mockGetQuestions.mockResolvedValue([{ slug: "goal", step: 1 }]);
    mockNextQuestion.mockReturnValue({ slug: "goal", step: 1 });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/get-matched/start", {
      method: "POST",
      body: "bad",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when session_id is missing", async () => {
    const res = await POST(makeReq({ mode: "both" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when session_id is too short", async () => {
    const res = await POST(makeReq({ session_id: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with plan_id and session_id on success", async () => {
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.plan_id).toBe(42);
    expect(json.session_id).toBe("sess-1234567890");
    expect(json.share_token).toBe("tok-abc");
    expect(json.ephemeral).toBe(false);
  });

  it("degrades to ephemeral when createPlan throws", async () => {
    mockCreatePlan.mockRejectedValue(new Error("db error"));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ephemeral).toBe(true);
    expect(json.plan_id).toBe(0);
  });
});
