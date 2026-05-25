import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

const isAllowedMock = vi.fn<() => Promise<boolean>>();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: () => isAllowedMock(),
  ipKey: () => "test-ip",
}));

// vi.mock factories are hoisted above const/let — capture the mock fn (and the
// real ReferralError class so `instanceof` checks in the route match) via
// vi.hoisted.
const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn(),
}));
vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

const { acceptReferralMock, ReferralError } = vi.hoisted(() => {
  class ReferralError extends Error {
    constructor(public code: string, message?: string) {
      super(message ?? code);
      this.name = "ReferralError";
    }
  }
  return { acceptReferralMock: vi.fn(), ReferralError };
});
vi.mock("@/lib/team-brief-referrals", () => ({
  acceptReferral: (...a: unknown[]) => acceptReferralMock(...a),
  ReferralError,
}));

import { POST } from "@/app/api/referrals/[id]/accept/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(
  id = "12",
  ip = "1.2.3.4",
): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost/api/referrals/${id}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
  });
  return [req, { params: Promise.resolve({ id }) }];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/referrals/[id]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    acceptReferralMock.mockResolvedValue({ id: 12, status: "accepted" });
  });

  it("returns 429 when rate limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
    expect(acceptReferralMock).not.toHaveBeenCalled();
  });

  it("returns 401 when not signed in as an advisor", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
    expect(acceptReferralMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-numeric referral id", async () => {
    const [req, ctx] = makeReq("not-a-number");
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid referral id/i);
  });

  it("returns 404 when the referral is not found", async () => {
    acceptReferralMock.mockRejectedValueOnce(new ReferralError("referral_not_found"));
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("referral_not_found");
  });

  it("returns 409 when the referral is not pending", async () => {
    acceptReferralMock.mockRejectedValueOnce(new ReferralError("referral_not_pending"));
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(409);
  });

  it("returns 403 when the advisor is not a team member", async () => {
    acceptReferralMock.mockRejectedValueOnce(new ReferralError("not_team_member"));
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(403);
  });

  it("returns 200 with the accepted referral", async () => {
    const [req, ctx] = makeReq("12");
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).referral).toEqual({ id: 12, status: "accepted" });
    expect(acceptReferralMock).toHaveBeenCalledWith(12, 42);
  });

  it("returns 500 when a non-ReferralError is thrown", async () => {
    acceptReferralMock.mockRejectedValueOnce(new Error("unexpected"));
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/failed to accept referral/i);
  });
});
