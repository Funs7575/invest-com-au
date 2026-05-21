import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockIsAllowed,
  mockIpKey,
  mockGetUser,
  mockRequireAdvisorSession,
  mockSendMessage,
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
    mockSendMessage: vi.fn(),
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
  sendMessage: mockSendMessage,
  BriefMessageError,
}));

vi.mock("@/lib/expert-teams", () => ({
  isProfessionalOnTeam: mockIsProfessionalOnTeam,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/briefs/[slug]/messages/route";

const BRIEF = {
  id: 42,
  contact_email: "owner@example.com",
  accepted_at: "2026-01-01",
  accepted_by_professional_id: 7,
  accepted_by_team_id: null,
};

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/briefs/abc/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ctx = { params: Promise.resolve({ slug: "abc" }) };

describe("POST /api/briefs/[slug]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockMaybeSingle.mockResolvedValue({ data: BRIEF });
    mockRequireAdvisorSession.mockResolvedValue(null);
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "owner@example.com" } },
    });
    mockSendMessage.mockResolvedValue({ id: 1, body: "hi" });
  });

  it("returns 429 when IP rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq({ body: "hi" }), ctx);
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/briefs/abc/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 on empty message body", async () => {
    const res = await POST(makeReq({ body: "" }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when brief not found", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    const res = await POST(makeReq({ body: "hi" }), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 409 when brief not yet accepted", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { ...BRIEF, accepted_at: null } });
    const res = await POST(makeReq({ body: "hi" }), ctx);
    expect(res.status).toBe(409);
  });

  it("returns 401 when sender resolves to nobody", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "stranger@example.com" } },
    });
    const res = await POST(makeReq({ body: "hi" }), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 429 when the per-user throttle trips", async () => {
    // First isAllowed (IP) true, second (per-user) false.
    mockIsAllowed.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const res = await POST(makeReq({ body: "hi" }), ctx);
    expect(res.status).toBe(429);
  });

  it("sends a message as the consumer on the happy path", async () => {
    const res = await POST(makeReq({ body: "hi" }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: { id: 1, body: "hi" } });
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ senderKind: "consumer", briefId: 42 }),
    );
  });

  it("sends as the accepted professional", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(7);
    const res = await POST(makeReq({ body: "hi" }), ctx);
    expect(res.status).toBe(200);
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ senderKind: "professional", senderProfessionalId: 7 }),
    );
  });

  it("maps a BriefMessageError to its status", async () => {
    mockSendMessage.mockRejectedValueOnce(new BriefMessageError("Blocked", 403));
    const res = await POST(makeReq({ body: "hi" }), ctx);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Blocked" });
  });

  it("returns 500 on unexpected error", async () => {
    mockSendMessage.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(makeReq({ body: "hi" }), ctx);
    expect(res.status).toBe(500);
  });
});
