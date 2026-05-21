import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockIsAllowed,
  mockIpKey,
  mockRequireAdvisorSession,
  mockAcceptBrief,
  mockIsProfessionalOnTeam,
  mockMaybeSingle,
} = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockIpKey: vi.fn(() => "ip:1.2.3.4"),
  mockRequireAdvisorSession: vi.fn(),
  mockAcceptBrief: vi.fn(),
  mockIsProfessionalOnTeam: vi.fn(),
  mockMaybeSingle: vi.fn(),
}));

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

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: mockIpKey,
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/briefs/credits", () => ({
  acceptBrief: mockAcceptBrief,
}));

vi.mock("@/lib/expert-teams", () => ({
  isProfessionalOnTeam: mockIsProfessionalOnTeam,
}));

vi.mock("@/lib/marketplace-emails", () => ({
  sendConsumerProviderAccepted: vi.fn(async () => undefined),
}));

vi.mock("@/lib/user-notifications", () => ({
  enqueueUserNotificationByEmail: vi.fn(async () => true),
}));

vi.mock("@/lib/pro-affiliate/track", () => ({
  attributeBriefAccepted: vi.fn(async () => undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/briefs/[slug]/accept/route";

const BRIEF = {
  id: 42,
  slug: "abc",
  job_title: "Tax help",
  contact_email: "owner@example.com",
  contact_name: "Owner",
  contact_phone: "0400",
};

function makeReq(body: unknown = {}): NextRequest {
  return new NextRequest("http://localhost/api/briefs/abc/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ctx = { params: Promise.resolve({ slug: "abc" }) };

describe("POST /api/briefs/[slug]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(7);
    mockMaybeSingle.mockResolvedValue({ data: BRIEF });
    mockAcceptBrief.mockResolvedValue({
      accepted: true,
      creditsSpent: 1,
      balanceAfterCents: 5000,
      brief: { id: 42 },
    });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(429);
  });

  it("returns 401 when not an advisor", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    const res = await POST(makeReq({ team_id: -1 }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when brief not found", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 403 when team_id supplied but advisor not a member", async () => {
    mockIsProfessionalOnTeam.mockResolvedValueOnce(false);
    const res = await POST(makeReq({ team_id: 9 }), ctx);
    expect(res.status).toBe(403);
  });

  it("returns 409 when already accepted by another provider", async () => {
    mockAcceptBrief.mockResolvedValueOnce({ accepted: false, reason: "already_accepted" });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ reason: "already_accepted" });
  });

  it("returns 402 when insufficient credits", async () => {
    mockAcceptBrief.mockResolvedValueOnce({ accepted: false, reason: "insufficient_credits" });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(402);
  });

  it("maps an unknown reason to 400", async () => {
    mockAcceptBrief.mockResolvedValueOnce({ accepted: false, reason: "weird" });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(400);
  });

  it("accepts the brief on the happy path", async () => {
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      success: true,
      credits_spent: 1,
      balance_after_cents: 5000,
      contact: { email: "owner@example.com" },
    });
  });

  it("accepts on behalf of a team when member", async () => {
    mockIsProfessionalOnTeam.mockResolvedValueOnce(true);
    const res = await POST(makeReq({ team_id: 9 }), ctx);
    expect(res.status).toBe(200);
    expect(mockAcceptBrief).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 9, professionalId: 7 }),
    );
  });

  it("returns 500 when acceptBrief throws", async () => {
    mockAcceptBrief.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(500);
  });
});
