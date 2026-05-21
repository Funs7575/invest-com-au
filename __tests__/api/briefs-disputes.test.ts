import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockIsAllowed,
  mockIpKey,
  mockGetUser,
  mockRequireAdvisorSession,
  mockOpenDispute,
  mockIsProfessionalOnTeam,
  mockMaybeSingle,
  DisputeError,
} = vi.hoisted(() => {
  class DisputeError extends Error {
    constructor(message: string, public readonly status: number) {
      super(message);
      this.name = "DisputeError";
    }
  }
  return {
    mockIsAllowed: vi.fn(),
    mockIpKey: vi.fn(() => "ip:1.2.3.4"),
    mockGetUser: vi.fn(),
    mockRequireAdvisorSession: vi.fn(),
    mockOpenDispute: vi.fn(),
    mockIsProfessionalOnTeam: vi.fn(),
    mockMaybeSingle: vi.fn(),
    DisputeError,
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

vi.mock("@/lib/disputes", () => ({
  openDispute: mockOpenDispute,
  DisputeError,
}));

vi.mock("@/lib/expert-teams", () => ({
  isProfessionalOnTeam: mockIsProfessionalOnTeam,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/briefs/[slug]/disputes/route";

const BRIEF = {
  id: 42,
  contact_email: "owner@example.com",
  accepted_at: "2026-01-01",
  accepted_by_professional_id: 7,
  accepted_by_team_id: null,
};

const REASON = "x".repeat(250);

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/briefs/abc/disputes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ctx = { params: Promise.resolve({ slug: "abc" }) };

describe("POST /api/briefs/[slug]/disputes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockMaybeSingle.mockResolvedValue({ data: BRIEF, email: "pro@example.com" });
    // advisorEmail also calls maybeSingle; default returns BRIEF which has no email,
    // tests that exercise advisor path override per-call.
    mockRequireAdvisorSession.mockResolvedValue(null);
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "owner@example.com" } },
    });
    mockOpenDispute.mockResolvedValue({ id: 1, status: "open" });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq({ reason: REASON }), ctx);
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/briefs/abc/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when reason too short", async () => {
    const res = await POST(makeReq({ reason: "too short" }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when brief not found", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    const res = await POST(makeReq({ reason: REASON }), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 401 when caller is neither consumer nor accepted pro", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "stranger@example.com" } },
    });
    const res = await POST(makeReq({ reason: REASON }), ctx);
    expect(res.status).toBe(401);
  });

  it("opens a dispute as the consumer on the happy path", async () => {
    const res = await POST(makeReq({ reason: REASON }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ dispute: { id: 1, status: "open" } });
    expect(mockOpenDispute).toHaveBeenCalledWith(
      expect.objectContaining({ openedByKind: "consumer", briefId: 42 }),
    );
  });

  it("opens a dispute as the accepted professional", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(7);
    // brief lookup, then advisorEmail lookup
    mockMaybeSingle
      .mockResolvedValueOnce({ data: BRIEF })
      .mockResolvedValueOnce({ data: { email: "pro@example.com" } });
    const res = await POST(makeReq({ reason: REASON }), ctx);
    expect(res.status).toBe(200);
    expect(mockOpenDispute).toHaveBeenCalledWith(
      expect.objectContaining({ openedByKind: "professional" }),
    );
  });

  it("maps a DisputeError to its status", async () => {
    mockOpenDispute.mockRejectedValueOnce(new DisputeError("Already open", 409));
    const res = await POST(makeReq({ reason: REASON }), ctx);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Already open" });
  });

  it("returns 500 on unexpected error", async () => {
    mockOpenDispute.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(makeReq({ reason: REASON }), ctx);
    expect(res.status).toBe(500);
  });
});
