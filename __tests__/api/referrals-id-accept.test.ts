/* eslint-disable @typescript-eslint/no-explicit-any -- test ctx/param casts */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const {
  mockIsAllowed,
  mockRequireAdvisorSession,
  mockAcceptReferral,
  MockReferralError,
} = vi.hoisted(() => {
  class MockReferralError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
  return {
    mockIsAllowed: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true),
    mockRequireAdvisorSession: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 42),
    mockAcceptReferral: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ id: 1, status: "accepted" })),
    MockReferralError,
  };
});

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/team-brief-referrals", () => ({
  acceptReferral: mockAcceptReferral,
  ReferralError: MockReferralError,
}));

import { POST } from "@/app/api/referrals/[id]/accept/route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/referrals/1/accept", {
    method: "POST",
  }) as unknown as NextRequest;
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("/api/referrals/[id]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAcceptReferral.mockResolvedValue({ id: 1, status: "accepted" });
  });

  it("rejects unauthenticated (no advisor session)", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq(), makeCtx("1") as any);
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(), makeCtx("1") as any);
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid id (non-numeric)", async () => {
    const res = await POST(makeReq(), makeCtx("abc") as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 for id = 0", async () => {
    const res = await POST(makeReq(), makeCtx("0") as any);
    expect(res.status).toBe(400);
  });

  it("returns 200 with referral on success", async () => {
    const res = await POST(makeReq(), makeCtx("1") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("referral");
  });

  it("returns 409 when referral is not pending", async () => {
    mockAcceptReferral.mockRejectedValue(new MockReferralError("referral_not_pending"));
    const res = await POST(makeReq(), makeCtx("1") as any);
    expect(res.status).toBe(409);
  });

  it("returns 403 when not team member", async () => {
    mockAcceptReferral.mockRejectedValue(new MockReferralError("not_team_member"));
    const res = await POST(makeReq(), makeCtx("1") as any);
    expect(res.status).toBe(403);
  });

  it("returns 404 when referral not found", async () => {
    mockAcceptReferral.mockRejectedValue(new MockReferralError("referral_not_found"));
    const res = await POST(makeReq(), makeCtx("1") as any);
    expect(res.status).toBe(404);
  });
});