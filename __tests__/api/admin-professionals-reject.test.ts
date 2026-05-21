/**
 * Tests for POST /api/admin/professionals/[id]/reject.
 *
 * Body parsed by withValidatedBody (real wrapper) first — `reason` is
 * mandatory (min 4 chars). Then requireAdmin -> IP rate limit -> id check ->
 * fetch (404 / 409 if verified) -> flip to rejected + inactive -> best-effort
 * pro-rejected email.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockRequireAdmin,
  mockAdminFrom,
  mockIsAllowed,
  mockSendProRejected,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockIsAllowed: vi.fn(),
  mockSendProRejected: vi.fn(),
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
  sendProRejected: (...a: unknown[]) => mockSendProRejected(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

import { POST } from "@/app/api/admin/professionals/[id]/reject/route";

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
    `http://localhost/api/admin/professionals/${id}/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

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
      return { eq: vi.fn(async () => updateResult) };
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
  mockSendProRejected.mockResolvedValue(true);
  setupProfessionals({
    data: {
      id: 42,
      email: "pro@example.com",
      name: "Pro",
      verification_status: "pending",
    },
    error: null,
  });
});

describe("POST /api/admin/professionals/[id]/reject", () => {
  it("propagates 401 when guard refuses", async () => {
    mockRequireAdmin.mockResolvedValue(denyGuard(401));
    const res = await POST(makeReq("42", { reason: "incomplete docs" }), ctx("42"));
    expect(res.status).toBe(401);
  });

  it("propagates 403 when guard forbids", async () => {
    mockRequireAdmin.mockResolvedValue(denyGuard(403));
    const res = await POST(makeReq("42", { reason: "incomplete docs" }), ctx("42"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when reason is missing", async () => {
    const res = await POST(makeReq("42", {}), ctx("42"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when reason is too short", async () => {
    const res = await POST(makeReq("42", { reason: "no" }), ctx("42"));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq("42", { reason: "incomplete docs" }), ctx("42"));
    expect(res.status).toBe(429);
  });

  it("returns 400 for a non-numeric id", async () => {
    const res = await POST(makeReq("xx", { reason: "incomplete docs" }), ctx("xx"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the professional is not found", async () => {
    setupProfessionals({ data: null, error: null });
    const res = await POST(makeReq("42", { reason: "incomplete docs" }), ctx("42"));
    expect(res.status).toBe(404);
  });

  it("returns 409 when the provider is already verified", async () => {
    setupProfessionals({
      data: { id: 42, verification_status: "verified" },
      error: null,
    });
    const res = await POST(makeReq("42", { reason: "incomplete docs" }), ctx("42"));
    expect(res.status).toBe(409);
  });

  it("returns 500 when the lookup errors", async () => {
    setupProfessionals({ data: null, error: { message: "boom" } });
    const res = await POST(makeReq("42", { reason: "incomplete docs" }), ctx("42"));
    expect(res.status).toBe(500);
  });

  it("returns 500 when the update errors", async () => {
    setupProfessionals(
      {
        data: { id: 42, email: "pro@example.com", name: "Pro", verification_status: "pending" },
        error: null,
      },
      { error: { message: "update failed" } },
    );
    const res = await POST(makeReq("42", { reason: "incomplete docs" }), ctx("42"));
    expect(res.status).toBe(500);
  });

  it("rejects the pro, flips to rejected + inactive, and emails them", async () => {
    const updateSpy = vi.fn();
    setupProfessionals(
      {
        data: { id: 42, email: "pro@example.com", name: "Pro", verification_status: "pending" },
        error: null,
      },
      { error: null },
      updateSpy,
    );

    const res = await POST(
      makeReq("42", { reason: "incomplete documentation" }),
      ctx("42"),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        verification_status: "rejected",
        accepts_briefs: false,
        status: "inactive",
        verification_notes: "incomplete documentation",
      }),
    );
    expect(mockSendProRejected).toHaveBeenCalledWith(
      "pro@example.com",
      "Pro",
      "incomplete documentation",
    );
  });

  it("still returns 200 when the rejection email throws", async () => {
    mockSendProRejected.mockRejectedValue(new Error("smtp down"));
    const res = await POST(makeReq("42", { reason: "incomplete docs" }), ctx("42"));
    expect(res.status).toBe(200);
  });
});
