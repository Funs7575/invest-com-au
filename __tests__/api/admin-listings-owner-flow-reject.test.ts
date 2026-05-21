/**
 * Tests for POST /api/admin/listings/owner-flow/[id]/reject.
 *
 * Admin-gated. Requires a non-empty `notes` field (Zod, strict). Delegates to
 * `rejectListing` (mocked); maps `not_found` -> 404, `notes_required` -> 400,
 * else 500. Writes a best-effort admin_audit_log row.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockRequireAdmin, mockRejectListing, mockAdminFrom } = vi.hoisted(
  () => ({
    mockRequireAdmin: vi.fn(),
    mockRejectListing: vi.fn(),
    mockAdminFrom: vi.fn(),
  }),
);

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/listings/moderate", () => ({
  rejectListing: (...a: unknown[]) => mockRejectListing(...a),
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

import { POST } from "@/app/api/admin/listings/owner-flow/[id]/reject/route";

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
    `http://localhost/api/admin/listings/owner-flow/${id}/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(ADMIN_OK);
  mockRejectListing.mockResolvedValue({
    ok: true,
    noOp: false,
    listing: { id: "abc", slug: "my-listing", status: "rejected" },
  });
  mockAdminFrom.mockReturnValue({ insert: vi.fn(async () => ({ error: null })) });
});

describe("POST /api/admin/listings/owner-flow/[id]/reject", () => {
  it("propagates 401 when guard refuses", async () => {
    mockRequireAdmin.mockResolvedValue(denyGuard(401));
    const res = await POST(makeReq("abc", { notes: "spam" }), ctx("abc"));
    expect(res.status).toBe(401);
    expect(mockRejectListing).not.toHaveBeenCalled();
  });

  it("propagates 403 when guard forbids", async () => {
    mockRequireAdmin.mockResolvedValue(denyGuard(403));
    const res = await POST(makeReq("abc", { notes: "spam" }), ctx("abc"));
    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid JSON body", async () => {
    const req = new NextRequest(
      "http://localhost/api/admin/listings/owner-flow/abc/reject",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{bad",
      },
    );
    const res = await POST(req, ctx("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when notes is empty", async () => {
    const res = await POST(makeReq("abc", { notes: "" }), ctx("abc"));
    expect(res.status).toBe(400);
    expect(mockRejectListing).not.toHaveBeenCalled();
  });

  it("rejects a listing and writes an audit row", async () => {
    const insertSpy = vi.fn(async () => ({ error: null }));
    mockAdminFrom.mockReturnValue({ insert: insertSpy });

    const res = await POST(makeReq("abc", { notes: "duplicate" }), ctx("abc"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.listing.status).toBe("rejected");
    expect(mockRejectListing).toHaveBeenCalledWith("abc", "user-1", "duplicate");
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ action: "listing:rejected" }),
    );
  });

  it("returns 404 when the listing is not found", async () => {
    mockRejectListing.mockResolvedValue({ ok: false, error: "not_found" });
    const res = await POST(makeReq("abc", { notes: "x" }), ctx("abc"));
    expect(res.status).toBe(404);
  });

  it("returns 500 on an unexpected helper failure", async () => {
    mockRejectListing.mockResolvedValue({ ok: false, error: "db_error" });
    const res = await POST(makeReq("abc", { notes: "x" }), ctx("abc"));
    expect(res.status).toBe(500);
  });
});
