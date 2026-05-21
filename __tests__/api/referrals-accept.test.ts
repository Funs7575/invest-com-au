import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks (all fns via vi.hoisted so the vi.mock factories can reference them) ──
const {
  isAllowedMock,
  ipKeyMock,
  requireAdvisorSessionMock,
  acceptReferralMock,
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
    acceptReferralMock: vi.fn(),
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
  acceptReferral: acceptReferralMock,
  ReferralError,
}));

import { POST } from "@/app/api/referrals/[id]/accept/route";

function req(): NextRequest {
  return new NextRequest("http://localhost/api/referrals/5/accept", {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("POST /api/referrals/[id]/accept", () => {
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
    const res = await POST(req(), ctx("abc"));
    expect(res.status).toBe(400);
    expect(acceptReferralMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-positive id", async () => {
    const res = await POST(req(), ctx("0"));
    expect(res.status).toBe(400);
  });

  it("accepts the referral and returns it", async () => {
    const referral = { id: 5, status: "accepted" };
    acceptReferralMock.mockResolvedValueOnce(referral);
    const res = await POST(req(), ctx("5"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ referral });
    expect(acceptReferralMock).toHaveBeenCalledWith(5, 42);
  });

  it("maps referral_not_found to 404", async () => {
    acceptReferralMock.mockRejectedValueOnce(new ReferralError("referral_not_found"));
    const res = await POST(req(), ctx("5"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "referral_not_found" });
  });

  it("maps not_team_member to 403", async () => {
    acceptReferralMock.mockRejectedValueOnce(new ReferralError("not_team_member"));
    const res = await POST(req(), ctx("5"));
    expect(res.status).toBe(403);
  });

  it("maps referral_not_pending to 409", async () => {
    acceptReferralMock.mockRejectedValueOnce(new ReferralError("referral_not_pending"));
    const res = await POST(req(), ctx("5"));
    expect(res.status).toBe(409);
  });

  it("maps brief_already_accepted to 409", async () => {
    acceptReferralMock.mockRejectedValueOnce(new ReferralError("brief_already_accepted"));
    const res = await POST(req(), ctx("5"));
    expect(res.status).toBe(409);
  });

  it("maps an unknown ReferralError code to 500", async () => {
    acceptReferralMock.mockRejectedValueOnce(new ReferralError("weird"));
    const res = await POST(req(), ctx("5"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "weird" });
  });

  it("returns 500 when a non-ReferralError is thrown", async () => {
    acceptReferralMock.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(req(), ctx("5"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to accept referral." });
  });
});
