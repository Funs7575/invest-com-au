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

const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn(),
}));
vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

const { declineReferralMock, ReferralError } = vi.hoisted(() => {
  class ReferralError extends Error {
    constructor(public code: string, message?: string) {
      super(message ?? code);
      this.name = "ReferralError";
    }
  }
  return { declineReferralMock: vi.fn(), ReferralError };
});
vi.mock("@/lib/team-brief-referrals", () => ({
  declineReferral: (...a: unknown[]) => declineReferralMock(...a),
  ReferralError,
}));

import { POST } from "@/app/api/referrals/[id]/decline/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(
  id = "12",
  ip = "1.2.3.4",
): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost/api/referrals/${id}/decline`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
  });
  return [req, { params: Promise.resolve({ id }) }];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/referrals/[id]/decline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    declineReferralMock.mockResolvedValue({ id: 12, status: "declined" });
  });

  it("returns 429 when rate limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
    expect(declineReferralMock).not.toHaveBeenCalled();
  });

  it("returns 401 when not signed in as an advisor", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });

  it("returns 400 for a non-numeric referral id", async () => {
    const [req, ctx] = makeReq("xyz");
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when the referral is not found", async () => {
    declineReferralMock.mockRejectedValueOnce(new ReferralError("referral_not_found"));
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("referral_not_found");
  });

  it("returns 409 when the referral is not pending", async () => {
    declineReferralMock.mockRejectedValueOnce(new ReferralError("referral_not_pending"));
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(409);
  });

  it("returns 200 with the declined referral", async () => {
    const [req, ctx] = makeReq("12");
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).referral).toEqual({ id: 12, status: "declined" });
    expect(declineReferralMock).toHaveBeenCalledWith(12, 42);
  });

  it("returns 500 when a non-ReferralError is thrown", async () => {
    declineReferralMock.mockRejectedValueOnce(new Error("unexpected"));
    const [req, ctx] = makeReq();
    const res = await POST(req, ctx);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/failed to decline referral/i);
  });
});
