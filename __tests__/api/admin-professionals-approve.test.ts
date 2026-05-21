/**
 * Tests for POST /api/admin/professionals/[id]/approve.
 *
 * Body is parsed by withValidatedBody (real wrapper) BEFORE the admin guard
 * runs, so an invalid body returns 400 first. After validation: requireAdmin
 * gate -> IP rate limit -> id validation -> fetch professional (404 / 409 if
 * already verified) -> flip to verified + optional credit grant -> best-effort
 * pro-approved email.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockRequireAdmin,
  mockAdminFrom,
  mockIsAllowed,
  mockSendProApproved,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockIsAllowed: vi.fn(),
  mockSendProApproved: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...a: unknown[]) => mockIsAllowed(...a),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/pro-onboarding-emails", () => ({
  sendProApproved: (...a: unknown[]) => mockSendProApproved(...a),
}));

vi.mock("@/lib/pro-onboarding", () => ({
  STARTER_FREE_CREDITS: 5,
  STARTER_CREDIT_CENTS_PER_CREDIT: 100,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

import { POST } from "@/app/api/admin/professionals/[id]/approve/route";

const ADMIN_OK = {
  ok: true as const,
  email: "admin@invest.com.au",
  userId: "user-1",
};

function denyGuard(status: number) {
  return {
    ok: false as const,
    response: new Response(JSON.stringify({ error: "denied" }), { status }),
  };
}

function makeReq(id: string, body: unknown) {
  return new NextRequest(
    `http://localhost/api/admin/professionals/${id}/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

/**
 * professionals.select().eq().maybeSingle() resolves to `fetchResult`;
 * professionals.update().eq() resolves to `updateResult`. The update spy
 * captures the patch object.
 */
function setupProfessionals(
  fetchResult: { data: unknown; error: { message: string } | null },
  updateResult: { error: { message: string } | null } = { error: null },
  updateSpy = vi.fn(),
) {
  mockAdminFrom.mockImplementation(() => {
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.update = vi.fn((patch: unknown) => {
      updateSpy(patch);
      // update().eq() is awaited -> return a thenable-ish chain
      return {
        eq: vi.fn(async () => updateResult),
      };
    });
    builder.eq = vi.fn(() => builder);
    builder.maybeSingle = vi.fn(async () => fetchResult);
    return builder;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(ADMIN_OK);
  mockIsAllowed.mockResolvedValue(true);
  mockSendProApproved.mockResolvedValue(true);
  setupProfessionals({
    data: {
      id: 42,
      email: "pro@example.com",
      name: "Pro",
      verification_status: "pending",
      credit_balance_cents: 0,
    },
    error: null,
  });
});

describe("POST /api/admin/professionals/[id]/approve", () => {
  it("propagates 401 when guard refuses", async () => {
    mockRequireAdmin.mockResolvedValue(denyGuard(401));
    const res = await POST(makeReq("42", {}), ctx("42"));
    expect(res.status).toBe(401);
  });

  it("propagates 403 when guard forbids", async () => {
    mockRequireAdmin.mockResolvedValue(denyGuard(403));
    const res = await POST(makeReq("42", {}), ctx("42"));
    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid body (wrong field type)", async () => {
    const res = await POST(
      makeReq("42", { grant_starter_credits: "yes" }),
      ctx("42"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq("42", {}), ctx("42"));
    expect(res.status).toBe(429);
  });

  it("returns 400 for a non-numeric id", async () => {
    const res = await POST(makeReq("xx", {}), ctx("xx"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the professional is not found", async () => {
    setupProfessionals({ data: null, error: null });
    const res = await POST(makeReq("42", {}), ctx("42"));
    expect(res.status).toBe(404);
  });

  it("returns 409 when already verified", async () => {
    setupProfessionals({
      data: { id: 42, verification_status: "verified", credit_balance_cents: 0 },
      error: null,
    });
    const res = await POST(makeReq("42", {}), ctx("42"));
    expect(res.status).toBe(409);
  });

  it("returns 500 when the lookup errors", async () => {
    setupProfessionals({ data: null, error: { message: "boom" } });
    const res = await POST(makeReq("42", {}), ctx("42"));
    expect(res.status).toBe(500);
  });

  it("returns 500 when the update errors", async () => {
    const updateSpy = vi.fn();
    setupProfessionals(
      {
        data: {
          id: 42,
          email: "pro@example.com",
          name: "Pro",
          verification_status: "pending",
          credit_balance_cents: 0,
        },
        error: null,
      },
      { error: { message: "update failed" } },
      updateSpy,
    );
    const res = await POST(makeReq("42", {}), ctx("42"));
    expect(res.status).toBe(500);
  });

  it("approves the pro, flips to verified, and grants starter credits", async () => {
    const updateSpy = vi.fn();
    setupProfessionals(
      {
        data: {
          id: 42,
          email: "pro@example.com",
          name: "Pro",
          verification_status: "pending",
          credit_balance_cents: 0,
        },
        error: null,
      },
      { error: null },
      updateSpy,
    );

    const res = await POST(
      makeReq("42", { grant_starter_credits: true }),
      ctx("42"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.starter_credits_granted).toBe(5);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        verification_status: "verified",
        accepts_briefs: true,
        status: "active",
        credit_balance_cents: 500,
      }),
    );
    expect(mockSendProApproved).toHaveBeenCalled();
  });

  it("approves without credits when grant_starter_credits is false", async () => {
    const updateSpy = vi.fn();
    setupProfessionals(
      {
        data: {
          id: 42,
          email: "pro@example.com",
          name: "Pro",
          verification_status: "pending",
          credit_balance_cents: 0,
        },
        error: null,
      },
      { error: null },
      updateSpy,
    );

    const res = await POST(
      makeReq("42", { grant_starter_credits: false }),
      ctx("42"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.starter_credits_granted).toBe(0);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.not.objectContaining({ credit_balance_cents: expect.anything() }),
    );
  });

  it("still returns 200 when the approval email throws", async () => {
    mockSendProApproved.mockRejectedValue(new Error("smtp down"));
    const res = await POST(makeReq("42", {}), ctx("42"));
    expect(res.status).toBe(200);
  });
});
