/* eslint-disable @typescript-eslint/no-explicit-any -- test ctx/param casts */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is",
    "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter", "contains",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const {
  mockIsAllowed,
  mockRequireAdvisorSession,
  mockFrom,
  mockCreateReferral,
  MockReferralError,
  mockSendReferralReceivedEmail,
} = vi.hoisted(() => {
  class MockReferralError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
  return {
    mockIsAllowed: vi.fn(async () => true),
    mockRequireAdvisorSession: vi.fn(async () => 42),
    mockFrom: vi.fn(),
    mockCreateReferral: vi.fn(async () => ({ id: 1, status: "pending" })),
    MockReferralError,
    mockSendReferralReceivedEmail: vi.fn(async () => undefined),
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

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/team-brief-referrals", () => ({
  createReferral: mockCreateReferral,
  ReferralError: MockReferralError,
}));

vi.mock("@/lib/marketplace-squad-emails", () => ({
  sendReferralReceivedEmail: mockSendReferralReceivedEmail,
}));

import { POST } from "@/app/api/teams/[slug]/referrals/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/teams/test-squad/referrals", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

function makeCtx(slug = "test-squad") {
  return { params: Promise.resolve({ slug }) };
}

const validBody = {
  briefId: 1,
  toTeamId: 2,
  note: "Please take this one",
};

describe("/api/teams/[slug]/referrals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockCreateReferral.mockResolvedValue({ id: 1, status: "pending" });
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { id: 1, name: "Test Squad", verification_status: "verified" }, error: null }),
    );
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq(validBody), makeCtx() as any);
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(validBody), makeCtx() as any);
    expect(res.status).toBe(429);
  });

  it("returns 404 when team not found", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const res = await POST(makeReq(validBody), makeCtx() as any);
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid body (missing toTeamId)", async () => {
    const res = await POST(makeReq({ briefId: 1 }), makeCtx() as any);
    expect(res.status).toBe(400);
  });

  it("returns 201 with referral on success", async () => {
    const res = await POST(makeReq(validBody), makeCtx() as any);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty("referral");
  });

  it("returns 409 on duplicate referral error", async () => {
    mockCreateReferral.mockRejectedValue(new MockReferralError("duplicate_referral"));
    const res = await POST(makeReq(validBody), makeCtx() as any);
    expect(res.status).toBe(409);
  });

  it("returns 403 when not team member", async () => {
    mockCreateReferral.mockRejectedValue(new MockReferralError("not_team_member"));
    const res = await POST(makeReq(validBody), makeCtx() as any);
    expect(res.status).toBe(403);
  });
});