import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockIsAllowed,
  mockIpKey,
  mockRequireAdvisorSession,
  mockGetQuestionById,
  mockIsOwner,
  mockRemoveQuestion,
  mockUpsertQuestion,
  IntakeError,
} = vi.hoisted(() => {
  class IntakeErrorCls extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "IntakeError";
      this.status = status;
    }
  }
  return {
    mockIsAllowed: vi.fn(),
    mockIpKey: vi.fn(() => "ip:1.2.3.4"),
    mockRequireAdvisorSession: vi.fn(),
    mockGetQuestionById: vi.fn(),
    mockIsOwner: vi.fn(),
    mockRemoveQuestion: vi.fn(),
    mockUpsertQuestion: vi.fn(),
    IntakeError: IntakeErrorCls,
  };
});

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: mockIpKey,
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/pro-intake", () => ({
  IntakeError,
  getQuestionById: mockGetQuestionById,
  isOwner: mockIsOwner,
  removeQuestion: mockRemoveQuestion,
  upsertQuestion: mockUpsertQuestion,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { PATCH, DELETE } from "@/app/api/intake/questions/[id]/route";

const ADVISOR_ID = 42;
const EXISTING = {
  id: 5,
  owner_kind: "professional" as const,
  professional_id: ADVISOR_ID,
  team_id: null,
  prompt: "Old prompt",
  kind: "text" as const,
  options: [],
  required: true,
  sort_order: 0,
  enabled: true,
};

const VALID_BODY = {
  prompt: "What is your time horizon?",
  kind: "text",
  options: [],
  required: true,
  sort_order: 1,
  enabled: true,
};

function makeReq(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/intake/questions/5", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("PATCH /api/intake/questions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await PATCH(makeReq("PATCH", VALID_BODY), ctx("5"));
    expect(res.status).toBe(429);
  });

  it("returns 401 when no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await PATCH(makeReq("PATCH", VALID_BODY), ctx("5"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid id", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(ADVISOR_ID);
    const res = await PATCH(makeReq("PATCH", VALID_BODY), ctx("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the question does not exist", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(ADVISOR_ID);
    mockGetQuestionById.mockResolvedValueOnce(null);
    const res = await PATCH(makeReq("PATCH", VALID_BODY), ctx("5"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when the advisor does not own the question", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(ADVISOR_ID);
    mockGetQuestionById.mockResolvedValueOnce(EXISTING);
    mockIsOwner.mockResolvedValueOnce(false);
    const res = await PATCH(makeReq("PATCH", VALID_BODY), ctx("5"));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid JSON", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(ADVISOR_ID);
    mockGetQuestionById.mockResolvedValueOnce(EXISTING);
    mockIsOwner.mockResolvedValueOnce(true);
    const req = new NextRequest("http://localhost/api/intake/questions/5", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{bad",
    });
    const res = await PATCH(req, ctx("5"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body." });
  });

  it("returns 400 for a body that fails validation", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(ADVISOR_ID);
    mockGetQuestionById.mockResolvedValueOnce(EXISTING);
    mockIsOwner.mockResolvedValueOnce(true);
    const res = await PATCH(makeReq("PATCH", { prompt: "no" }), ctx("5"));
    expect(res.status).toBe(400);
  });

  it("returns 500 when the team owner id is missing", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(ADVISOR_ID);
    mockGetQuestionById.mockResolvedValueOnce({
      ...EXISTING,
      owner_kind: "team",
      professional_id: null,
      team_id: null,
    });
    mockIsOwner.mockResolvedValueOnce(true);
    const res = await PATCH(makeReq("PATCH", VALID_BODY), ctx("5"));
    expect(res.status).toBe(500);
  });

  it("updates the question and returns it", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(ADVISOR_ID);
    mockGetQuestionById.mockResolvedValueOnce(EXISTING);
    mockIsOwner.mockResolvedValueOnce(true);
    const updated = { ...EXISTING, prompt: VALID_BODY.prompt };
    mockUpsertQuestion.mockResolvedValueOnce(updated);
    const res = await PATCH(makeReq("PATCH", VALID_BODY), ctx("5"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ question: updated });
    expect(mockUpsertQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, owner_id: ADVISOR_ID, acting_professional_id: ADVISOR_ID }),
    );
  });

  it("maps IntakeError to its status", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(ADVISOR_ID);
    mockGetQuestionById.mockResolvedValueOnce(EXISTING);
    mockIsOwner.mockResolvedValueOnce(true);
    mockUpsertQuestion.mockRejectedValueOnce(new IntakeError("Limit reached", 409));
    const res = await PATCH(makeReq("PATCH", VALID_BODY), ctx("5"));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Limit reached" });
  });

  it("returns 500 on an unexpected error", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(ADVISOR_ID);
    mockGetQuestionById.mockResolvedValueOnce(EXISTING);
    mockIsOwner.mockResolvedValueOnce(true);
    mockUpsertQuestion.mockRejectedValueOnce(new Error("db down"));
    const res = await PATCH(makeReq("PATCH", VALID_BODY), ctx("5"));
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/intake/questions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await DELETE(makeReq("DELETE"), ctx("5"));
    expect(res.status).toBe(429);
  });

  it("returns 401 when no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await DELETE(makeReq("DELETE"), ctx("5"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid id", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(ADVISOR_ID);
    const res = await DELETE(makeReq("DELETE"), ctx("0"));
    expect(res.status).toBe(400);
  });

  it("removes the question and returns ok", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(ADVISOR_ID);
    mockRemoveQuestion.mockResolvedValueOnce(undefined);
    const res = await DELETE(makeReq("DELETE"), ctx("5"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockRemoveQuestion).toHaveBeenCalledWith(5, ADVISOR_ID);
  });

  it("maps IntakeError to its status", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(ADVISOR_ID);
    mockRemoveQuestion.mockRejectedValueOnce(new IntakeError("Not authorised.", 403));
    const res = await DELETE(makeReq("DELETE"), ctx("5"));
    expect(res.status).toBe(403);
  });

  it("returns 500 on an unexpected error", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(ADVISOR_ID);
    mockRemoveQuestion.mockRejectedValueOnce(new Error("db down"));
    const res = await DELETE(makeReq("DELETE"), ctx("5"));
    expect(res.status).toBe(500);
  });
});
