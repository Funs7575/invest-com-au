import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockIsAllowed,
  mockIpKey,
  mockGetUser,
  mockRequireAdvisorSession,
  mockMarkRead,
  mockIsProfessionalOnTeam,
  mockMaybeSingle,
  BriefMessageError,
} = vi.hoisted(() => {
  class BriefMessageError extends Error {
    constructor(message: string, public readonly status: number) {
      super(message);
      this.name = "BriefMessageError";
    }
  }
  return {
    mockIsAllowed: vi.fn(),
    mockIpKey: vi.fn(() => "ip:1.2.3.4"),
    mockGetUser: vi.fn(),
    mockRequireAdvisorSession: vi.fn(),
    mockMarkRead: vi.fn(),
    mockIsProfessionalOnTeam: vi.fn(),
    mockMaybeSingle: vi.fn(),
    BriefMessageError,
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.maybeSingle = mockMaybeSingle;
    return chain;
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/rate-limit-db", () => ({ isAllowed: mockIsAllowed, ipKey: mockIpKey }));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/brief-messages", () => ({
  markRead: mockMarkRead,
  BriefMessageError,
}));

vi.mock("@/lib/expert-teams", () => ({
  isProfessionalOnTeam: mockIsProfessionalOnTeam,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/briefs/[slug]/messages/mark-read/route";

const BRIEF = {
  id: 42,
  contact_email: "owner@example.com",
  accepted_at: "2026-01-01",
  accepted_by_professional_id: 7,
  accepted_by_team_id: null,
};

function makeReq(body: unknown = {}): NextRequest {
  return new NextRequest("http://localhost/api/briefs/abc/messages/mark-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ctx = { params: Promise.resolve({ slug: "abc" }) };

describe("POST /api/briefs/[slug]/messages/mark-read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockMaybeSingle.mockResolvedValue({ data: BRIEF });
    mockRequireAdvisorSession.mockResolvedValue(null);
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "owner@example.com" } },
    });
    mockMarkRead.mockResolvedValue(3);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(429);
  });

  it("returns 404 when brief not found", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(404);
  });

  it("returns {updated:0} when brief not yet accepted", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { ...BRIEF, accepted_at: null } });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ updated: 0 });
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it("returns 401 when caller resolves to nobody", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "stranger@example.com" } },
    });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(401);
  });

  it("marks read as the consumer on the happy path", async () => {
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ updated: 3 });
    expect(mockMarkRead).toHaveBeenCalledWith({ briefId: 42, asKind: "consumer" });
  });

  it("marks read as the pro when advisor is the accepted professional", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(7);
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(200);
    expect(mockMarkRead).toHaveBeenCalledWith({ briefId: 42, asKind: "pro" });
  });

  it("tolerates an empty/absent body", async () => {
    const req = new NextRequest("http://localhost/api/briefs/abc/messages/mark-read", {
      method: "POST",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
  });

  it("maps a BriefMessageError to its status", async () => {
    mockMarkRead.mockRejectedValueOnce(new BriefMessageError("Nope", 403));
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(403);
  });

  it("returns 500 on unexpected error", async () => {
    mockMarkRead.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(500);
  });
});
