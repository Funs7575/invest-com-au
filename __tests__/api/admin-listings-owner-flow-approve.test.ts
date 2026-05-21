/**
 * Tests for POST /api/admin/listings/owner-flow/[id]/approve.
 *
 * Admin-gated. Delegates to `approveListing` (mocked) which returns either a
 * ModerationResult or ModerationFailure; the route maps `not_found` -> 404,
 * other failures -> 500. Writes a best-effort admin_audit_log row.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockRequireAdmin, mockApproveListing, mockAdminFrom } = vi.hoisted(
  () => ({
    mockRequireAdmin: vi.fn(),
    mockApproveListing: vi.fn(),
    mockAdminFrom: vi.fn(),
  }),
);

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/listings/moderate", () => ({
  approveListing: (...a: unknown[]) => mockApproveListing(...a),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

import { POST } from "@/app/api/admin/listings/owner-flow/[id]/approve/route";

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

function makeReq(id: string, body?: unknown) {
  const headers: Record<string, string> = {};
  const init: RequestInit = { method: "POST", headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return new NextRequest(
    `http://localhost/api/admin/listings/owner-flow/${id}/approve`,
    init,
  );
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(ADMIN_OK);
  mockApproveListing.mockResolvedValue({
    ok: true,
    noOp: false,
    listing: { id: "abc", slug: "my-listing", status: "approved" },
  });
  mockAdminFrom.mockReturnValue({ insert: vi.fn(async () => ({ error: null })) });
});

describe("POST /api/admin/listings/owner-flow/[id]/approve", () => {
  it("propagates 401 when guard refuses", async () => {
    mockRequireAdmin.mockResolvedValue(denyGuard(401));
    const res = await POST(makeReq("abc"), ctx("abc"));
    expect(res.status).toBe(401);
    expect(mockApproveListing).not.toHaveBeenCalled();
  });

  it("propagates 403 when guard forbids", async () => {
    mockRequireAdmin.mockResolvedValue(denyGuard(403));
    const res = await POST(makeReq("abc"), ctx("abc"));
    expect(res.status).toBe(403);
  });

  it("accepts an explicit empty body", async () => {
    const res = await POST(makeReq("abc", {}), ctx("abc"));
    expect(res.status).toBe(200);
    expect(mockApproveListing).toHaveBeenCalledWith("abc", "user-1");
  });

  it("approves a listing (no body) and writes an audit row", async () => {
    const insertSpy = vi.fn(async () => ({ error: null }));
    mockAdminFrom.mockReturnValue({ insert: insertSpy });

    const res = await POST(makeReq("abc"), ctx("abc"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      ok: true,
      noOp: false,
      listing: { id: "abc", slug: "my-listing", status: "approved" },
    });
    expect(mockApproveListing).toHaveBeenCalledWith("abc", "user-1");
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ action: "listing:approved" }),
    );
  });

  it("returns 404 when the listing is not found", async () => {
    mockApproveListing.mockResolvedValue({ ok: false, error: "not_found" });
    const res = await POST(makeReq("abc"), ctx("abc"));
    expect(res.status).toBe(404);
  });

  it("returns 500 on a non-not_found failure", async () => {
    mockApproveListing.mockResolvedValue({ ok: false, error: "db_error" });
    const res = await POST(makeReq("abc"), ctx("abc"));
    expect(res.status).toBe(500);
  });

  it("still returns 200 if the audit log insert throws", async () => {
    mockAdminFrom.mockReturnValue({
      insert: vi.fn(async () => {
        throw new Error("audit down");
      }),
    });
    const res = await POST(makeReq("abc"), ctx("abc"));
    expect(res.status).toBe(200);
  });
});
