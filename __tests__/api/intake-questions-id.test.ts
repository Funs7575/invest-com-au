/**
 * Tests for PATCH/DELETE /api/intake/questions/[id]
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { MockIntakeError, mockGetQuestionById, mockIsOwner, mockUpsertQuestion, mockRemoveQuestion, mockIsAllowed, mockRequireAdvisorSession } = vi.hoisted(() => {
  class MockIntakeError extends Error {
    status: number;
    constructor(msg: string, status: number) {
      super(msg);
      this.status = status;
    }
  }
  return {
    MockIntakeError,
    mockGetQuestionById: vi.fn(),
    mockIsOwner: vi.fn(),
    mockUpsertQuestion: vi.fn(),
    mockRemoveQuestion: vi.fn(),
    mockIsAllowed: vi.fn(async () => true),
    mockRequireAdvisorSession: vi.fn(async () => 42),
  };
});

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/pro-intake", () => ({
  IntakeError: MockIntakeError,
  getQuestionById: (...args: unknown[]) => mockGetQuestionById(...args),
  isOwner: (...args: unknown[]) => mockIsOwner(...args),
  upsertQuestion: (...args: unknown[]) => mockUpsertQuestion(...args),
  removeQuestion: (...args: unknown[]) => mockRemoveQuestion(...args),
  listForProfessional: vi.fn(),
  listForTeam: vi.fn(),
}));

import { PATCH, DELETE } from "@/app/api/intake/questions/[id]/route";

function makeReq(method: string, body?: unknown): NextRequest {
  return new Request("http://localhost/api/intake/questions/1", {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

const VALID_UPDATE_BODY = {
  prompt: "What is your investment goal?",
  kind: "text",
  options: [],
  required: true,
  sort_order: 0,
  enabled: true,
};

const MOCK_QUESTION = {
  id: 1,
  owner_kind: "professional",
  professional_id: 42,
  team_id: null,
  prompt: "Old prompt?",
  kind: "text",
};

describe("PATCH /api/intake/questions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockGetQuestionById.mockResolvedValue(MOCK_QUESTION);
    mockIsOwner.mockResolvedValue(true);
    mockUpsertQuestion.mockResolvedValue({ ...MOCK_QUESTION, prompt: "New prompt?" });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await PATCH(makeReq("PATCH", VALID_UPDATE_BODY), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(429);
  });

  it("returns 401 when advisor not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await PATCH(makeReq("PATCH", VALID_UPDATE_BODY), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric id", async () => {
    const res = await PATCH(makeReq("PATCH", VALID_UPDATE_BODY), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when question not found", async () => {
    mockGetQuestionById.mockResolvedValue(null);
    const res = await PATCH(makeReq("PATCH", VALID_UPDATE_BODY), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when not owner", async () => {
    mockIsOwner.mockResolvedValue(false);
    const res = await PATCH(makeReq("PATCH", VALID_UPDATE_BODY), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 when body fails schema (prompt too short)", async () => {
    const res = await PATCH(
      makeReq("PATCH", { ...VALID_UPDATE_BODY, prompt: "AB" }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 with updated question on success", async () => {
    const res = await PATCH(makeReq("PATCH", VALID_UPDATE_BODY), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.question).toBeDefined();
  });
});

describe("DELETE /api/intake/questions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockRemoveQuestion.mockResolvedValue(undefined);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await DELETE(makeReq("DELETE"), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(429);
  });

  it("returns 401 when advisor not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await DELETE(makeReq("DELETE"), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric id", async () => {
    const res = await DELETE(makeReq("DELETE"), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("returns 200 on successful delete", async () => {
    const res = await DELETE(makeReq("DELETE"), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns status from IntakeError when thrown", async () => {
    mockRemoveQuestion.mockRejectedValue(new MockIntakeError("Not found", 404));
    const res = await DELETE(makeReq("DELETE"), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(404);
  });
});
