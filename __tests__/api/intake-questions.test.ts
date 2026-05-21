/**
 * Tests for POST /api/intake/questions
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

const mockRequireAdvisorSession = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 42);
vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

const { MockIntakeError, mockUpsertQuestion } = vi.hoisted(() => {
  class MockIntakeError extends Error {
    status: number;
    constructor(msg: string, status: number) {
      super(msg);
      this.status = status;
    }
  }
  return {
    MockIntakeError,
    mockUpsertQuestion: vi.fn(),
  };
});

vi.mock("@/lib/pro-intake", () => ({
  IntakeError: MockIntakeError,
  upsertQuestion: (...args: unknown[]) => mockUpsertQuestion(...args),
  listForProfessional: vi.fn(),
  listForTeam: vi.fn(),
  getQuestionById: vi.fn(),
  isOwner: vi.fn(),
  removeQuestion: vi.fn(),
}));

import { POST } from "@/app/api/intake/questions/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/intake/questions", {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

const VALID_BODY = {
  owner_kind: "professional",
  owner_id: 5,
  prompt: "What is your investment goal?",
  kind: "text",
  options: [],
  required: true,
  sort_order: 0,
  enabled: true,
};

const MOCK_QUESTION = {
  id: 10,
  owner_kind: "professional",
  professional_id: 5,
  team_id: null,
  prompt: "What is your investment goal?",
  kind: "text",
  enabled: true,
};

describe("POST /api/intake/questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockUpsertQuestion.mockResolvedValue(MOCK_QUESTION);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 401 when advisor not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/intake/questions", {
      method: "POST",
      body: "bad json",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when body fails schema (prompt too short)", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, prompt: "AB" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when owner_kind is invalid", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, owner_kind: "admin" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with created question on success", async () => {
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.question).toBeDefined();
    expect(json.question.id).toBe(10);
  });

  it("returns error status from IntakeError", async () => {
    mockUpsertQuestion.mockRejectedValue(new MockIntakeError("Owner not found", 422));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(422);
  });
});
