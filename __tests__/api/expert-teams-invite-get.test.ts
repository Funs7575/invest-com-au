import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockGetInvitationByToken, mockMaybeSingle, mockEq, mockFrom } =
  vi.hoisted(() => {
    const mockMaybeSingle = vi.fn();
    const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    return {
      mockIsAllowed: vi.fn(),
      mockGetInvitationByToken: vi.fn(),
      mockMaybeSingle,
      mockEq,
      mockSelect,
      mockFrom,
    };
  });

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:test"),
}));

vi.mock("@/lib/expert-teams", () => ({
  getInvitationByToken: mockGetInvitationByToken,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET } from "@/app/api/expert-teams/invite/route";

function makeReq(token?: string): NextRequest {
  const url = token
    ? `http://localhost/api/expert-teams/invite?token=${token}`
    : "http://localhost/api/expert-teams/invite";
  return new NextRequest(url, { method: "GET" });
}

const FUTURE = new Date(Date.now() + 86400000).toISOString();
const PAST = new Date(Date.now() - 86400000).toISOString();

function invitation(overrides: Record<string, unknown> = {}) {
  return {
    email: "pro@example.com",
    name: "Pat Pro",
    invited_role: "accountant",
    status: "pending",
    expires_at: FUTURE,
    team_id: 42,
    ...overrides,
  };
}

describe("GET /api/expert-teams/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await GET(makeReq("a".repeat(30)));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "Too many requests" });
  });

  it("returns 400 when no token provided", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Token required." });
  });

  it("returns 404 when the invitation is not found", async () => {
    mockGetInvitationByToken.mockResolvedValueOnce(null);
    const res = await GET(makeReq("tok"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Invalid invitation." });
  });

  it("returns 410 when the invitation is not pending", async () => {
    mockGetInvitationByToken.mockResolvedValueOnce(invitation({ status: "accepted" }));
    const res = await GET(makeReq("tok"));
    expect(res.status).toBe(410);
  });

  it("returns 410 when the invitation has expired", async () => {
    mockGetInvitationByToken.mockResolvedValueOnce(invitation({ expires_at: PAST }));
    const res = await GET(makeReq("tok"));
    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({ error: "This invitation has expired." });
  });

  it("returns the invitation and team on the happy path", async () => {
    mockGetInvitationByToken.mockResolvedValueOnce(invitation());
    const team = { id: 42, name: "Team A", slug: "team-a", team_category: "tax" };
    mockMaybeSingle.mockResolvedValueOnce({ data: team, error: null });
    const res = await GET(makeReq("tok"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      email: "pro@example.com",
      name: "Pat Pro",
      role: "accountant",
      team,
    });
    expect(mockEq).toHaveBeenCalledWith("id", 42);
  });
});
