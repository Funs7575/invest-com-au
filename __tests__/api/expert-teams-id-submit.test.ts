import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockRequireAdvisorSession, mockSubmitForVerification } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockRequireAdvisorSession: vi.fn(),
  mockSubmitForVerification: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:test"),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/expert-teams", () => ({
  submitForVerification: mockSubmitForVerification,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/expert-teams/[id]/submit/route";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/expert-teams/5/submit", { method: "POST" });
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/expert-teams/[id]/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue("advisor-1");
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq(), ctx("5"));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not signed in", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq(), ctx("5"));
    expect(res.status).toBe(401);
  });

  it("returns 400 on a non-numeric team id", async () => {
    const res = await POST(makeReq(), ctx("xyz"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid team id." });
  });

  it("submits for verification on the happy path", async () => {
    const team = { id: 5, status: "submitted" };
    mockSubmitForVerification.mockResolvedValueOnce(team);
    const res = await POST(makeReq(), ctx("5"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ team });
    expect(mockSubmitForVerification).toHaveBeenCalledWith(5, "advisor-1");
  });

  it("maps team_not_found to 404", async () => {
    mockSubmitForVerification.mockRejectedValueOnce(new Error("team_not_found"));
    const res = await POST(makeReq(), ctx("5"));
    expect(res.status).toBe(404);
  });

  it("maps not_owner to 403", async () => {
    mockSubmitForVerification.mockRejectedValueOnce(new Error("not_owner"));
    const res = await POST(makeReq(), ctx("5"));
    expect(res.status).toBe(403);
  });

  it("maps incomplete:* to 400 with the missing list", async () => {
    mockSubmitForVerification.mockRejectedValueOnce(new Error("incomplete:disclosure,members"));
    const res = await POST(makeReq(), ctx("5"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Team is not ready for verification.",
      missing: ["disclosure", "members"],
    });
  });

  it("returns 500 on an unmapped error", async () => {
    mockSubmitForVerification.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(makeReq(), ctx("5"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to submit team." });
  });
});
