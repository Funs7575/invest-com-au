import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockRequireAdvisorSession, mockGetTeamById, mockInviteMember } = vi.hoisted(
  () => ({
    mockIsAllowed: vi.fn(),
    mockRequireAdvisorSession: vi.fn(),
    mockGetTeamById: vi.fn(),
    mockInviteMember: vi.fn(),
  }),
);

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:test"),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/expert-teams", () => ({
  getTeamById: mockGetTeamById,
  inviteMember: mockInviteMember,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/expert-teams/[id]/invite/route";

const VALID_BODY = { email: "pro@example.com", name: "Pat", role: "accountant" };

function makeReq(body: unknown, raw = false): NextRequest {
  return new NextRequest("http://localhost/api/expert-teams/5/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/expert-teams/[id]/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue("advisor-1");
    mockGetTeamById.mockResolvedValue({ id: 5, owner_professional_id: "advisor-1" });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq(VALID_BODY), ctx("5"));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not signed in", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq(VALID_BODY), ctx("5"));
    expect(res.status).toBe(401);
  });

  it("returns 400 on a non-numeric team id", async () => {
    const res = await POST(makeReq(VALID_BODY), ctx("abc"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid team id." });
  });

  it("returns 404 when the team does not exist", async () => {
    mockGetTeamById.mockResolvedValueOnce(null);
    const res = await POST(makeReq(VALID_BODY), ctx("5"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when the caller is not the team owner", async () => {
    mockGetTeamById.mockResolvedValueOnce({ id: 5, owner_professional_id: "someone-else" });
    const res = await POST(makeReq(VALID_BODY), ctx("5"));
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid JSON body", async () => {
    const res = await POST(makeReq("{bad", true), ctx("5"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body." });
  });

  it("returns 400 on an invalid email (zod)", async () => {
    const res = await POST(makeReq({ email: "not-an-email" }), ctx("5"));
    expect(res.status).toBe(400);
  });

  it("invites the member on the happy path", async () => {
    const invitation = { id: 1, email: "pro@example.com" };
    mockInviteMember.mockResolvedValueOnce(invitation);
    const res = await POST(makeReq(VALID_BODY), ctx("5"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ invitation });
    expect(mockInviteMember).toHaveBeenCalledWith({
      teamId: 5,
      invitedByProfessionalId: "advisor-1",
      email: "pro@example.com",
      name: "Pat",
      role: "accountant",
    });
  });

  it("maps invitation_already_pending to 409", async () => {
    mockInviteMember.mockRejectedValueOnce(new Error("invitation_already_pending"));
    const res = await POST(makeReq(VALID_BODY), ctx("5"));
    expect(res.status).toBe(409);
  });

  it("maps already_member to 409", async () => {
    mockInviteMember.mockRejectedValueOnce(new Error("already_member"));
    const res = await POST(makeReq(VALID_BODY), ctx("5"));
    expect(res.status).toBe(409);
  });

  it("returns 500 on an unmapped error", async () => {
    mockInviteMember.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(makeReq(VALID_BODY), ctx("5"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to invite member." });
  });
});
