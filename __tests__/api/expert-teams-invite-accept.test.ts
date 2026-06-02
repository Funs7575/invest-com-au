import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockRequireAdvisorSession, mockAcceptInvitation } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockRequireAdvisorSession: vi.fn(),
  mockAcceptInvitation: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:test"),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/expert-teams", () => ({
  acceptInvitation: mockAcceptInvitation,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/expert-teams/invite/accept/route";

const TOKEN = "t".repeat(30);

function makeReq(body: unknown, raw = false): NextRequest {
  return new NextRequest("http://localhost/api/expert-teams/invite/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

describe("POST /api/expert-teams/invite/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue("advisor-1");
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq({ token: TOKEN }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not signed in", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq({ token: TOKEN }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sign in required." });
  });

  it("returns 400 on invalid JSON body", async () => {
    const res = await POST(makeReq("{not json", true));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body." });
  });

  it("returns 400 when the token is too short (zod)", async () => {
    const res = await POST(makeReq({ token: "short" }));
    expect(res.status).toBe(400);
  });

  it("accepts the invitation on the happy path", async () => {
    mockAcceptInvitation.mockResolvedValueOnce({ teamId: 99 });
    const res = await POST(makeReq({ token: TOKEN }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, team_id: 99 });
    expect(mockAcceptInvitation).toHaveBeenCalledWith({
      token: TOKEN,
      professionalId: "advisor-1",
    });
  });

  it("maps invalid_invitation to 404", async () => {
    mockAcceptInvitation.mockRejectedValueOnce(new Error("invalid_invitation"));
    const res = await POST(makeReq({ token: TOKEN }));
    expect(res.status).toBe(404);
  });

  it("maps invitation_unavailable to 410", async () => {
    mockAcceptInvitation.mockRejectedValueOnce(new Error("invitation_unavailable"));
    const res = await POST(makeReq({ token: TOKEN }));
    expect(res.status).toBe(410);
  });

  it("maps invitation_expired to 410", async () => {
    mockAcceptInvitation.mockRejectedValueOnce(new Error("invitation_expired"));
    const res = await POST(makeReq({ token: TOKEN }));
    expect(res.status).toBe(410);
  });

  it("maps invitation_email_mismatch to 403 (accept must match the invited identity)", async () => {
    mockAcceptInvitation.mockRejectedValueOnce(new Error("invitation_email_mismatch"));
    const res = await POST(makeReq({ token: TOKEN }));
    expect(res.status).toBe(403);
  });

  it("returns 500 on an unmapped error", async () => {
    mockAcceptInvitation.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(makeReq({ token: TOKEN }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to accept invitation." });
  });
});
