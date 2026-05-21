import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  isAllowedMock,
  ipKeyMock,
  requireAdvisorSessionMock,
  declineReferralMock,
  ReferralError,
} = vi.hoisted(() => {
  class ReferralError extends Error {
    constructor(public code: string, message?: string) {
      super(message ?? code);
      this.name = "ReferralError";
    }
  }
  return {
    isAllowedMock: vi.fn(() => Promise.resolve(true)),
    ipKeyMock: vi.fn(() => "ip:1.2.3.4"),
    requireAdvisorSessionMock: vi.fn<() => Promise<number | null>>(() => Promise.resolve(42)),
    declineReferralMock: vi.fn(),
    ReferralError,
  };
});

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/rate-limit-db", () => ({ isAllowed: isAllowedMock, ipKey: ipKeyMock }));
vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: requireAdvisorSessionMock,
}));
vi.mock("@/lib/team-brief-referrals", () => ({
  declineReferral: declineReferralMock,
  ReferralError,
}));

import { POST } from "@/app/api/referrals/[id]/decline/route";

function req(): NextRequest {
  return new NextRequest("http://localhost/api/referrals/5/decline", {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("POST /api/referrals/[id]/decline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
    requireAdvisorSessionMock.mockResolvedValue(42);
  });

  it("returns 429 when rate-limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    const res = await POST(req(), ctx("5"));
    expect(res.status).toBe(429);
    expect(requireAdvisorSessionMock).not.toHaveBeenCalled();
  });

  it("returns 401 when there is no advisor session", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(null);
    const res = await POST(req(), ctx("5"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sign in required." });
  });

  it("returns 400 for a non-numeric id", async () => {
    const res = await POST(req(), ctx("nope"));
    expect(res.status).toBe(400);
    expect(declineReferralMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-positive id", async () => {
    const res = await POST(req(), ctx("-3"));
    expect(res.status).toBe(400);
  });

  it("declines the referral and returns it", async () => {
    const referral = { id: 5, status: "declined" };
    declineReferralMock.mockResolvedValueOnce(referral);
    const res = await POST(req(), ctx("5"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ referral });
    expect(declineReferralMock).toHaveBeenCalledWith(5, 42);
  });

  it("maps referral_not_found to 404", async () => {
    declineReferralMock.mockRejectedValueOnce(new ReferralError("referral_not_found"));
    const res = await POST(req(), ctx("5"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "referral_not_found" });
  });

  it("maps not_team_member to 403", async () => {
    declineReferralMock.mockRejectedValueOnce(new ReferralError("not_team_member"));
    const res = await POST(req(), ctx("5"));
    expect(res.status).toBe(403);
  });

  it("maps referral_not_pending to 409", async () => {
    declineReferralMock.mockRejectedValueOnce(new ReferralError("referral_not_pending"));
    const res = await POST(req(), ctx("5"));
    expect(res.status).toBe(409);
  });

  it("maps an unknown ReferralError code to 500", async () => {
    declineReferralMock.mockRejectedValueOnce(new ReferralError("weird"));
    const res = await POST(req(), ctx("5"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "weird" });
  });

  it("returns 500 when a non-ReferralError is thrown", async () => {
    declineReferralMock.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(req(), ctx("5"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to decline referral." });
  });
});
