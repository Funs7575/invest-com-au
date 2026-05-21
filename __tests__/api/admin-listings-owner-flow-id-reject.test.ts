/**
 * Tests for POST /api/admin/listings/owner-flow/[id]/reject
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockRejectListing = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
  ok: true,
  noOp: false,
  listing: { slug: "test-listing" },
}));
vi.mock("@/lib/listings/moderate", () => ({
  rejectListing: (...args: unknown[]) => mockRejectListing(...args),
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["insert", "select", "eq", "single"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { POST } from "@/app/api/admin/listings/owner-flow/[id]/reject/route";

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/listings/owner-flow/listing-1/reject", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

function makeCtx(id = "listing-1") {
  return { params: Promise.resolve({ id }) } as { params: Promise<{ id: string }> };
}

describe("POST /api/admin/listings/owner-flow/[id]/reject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true, email: "admin@invest.com.au", userId: "u1",
    });
    mockRejectListing.mockResolvedValue({
      ok: true,
      noOp: false,
      listing: { slug: "test-listing" },
    });
    mockFrom.mockReturnValue(makeBuilder());
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq({ notes: "Reason for rejection" }), makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/admin/listings/owner-flow/listing-1/reject", {
      method: "POST",
      body: "bad-json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req, makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when notes is missing", async () => {
    const res = await POST(makeReq({}), makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 200 on successful reject", async () => {
    const res = await POST(makeReq({ notes: "Policy violation" }), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockRejectListing).toHaveBeenCalledWith("listing-1", "u1", "Policy violation");
  });

  it("returns 404 when listing not found", async () => {
    mockRejectListing.mockResolvedValue({ ok: false, error: "not_found" });
    const res = await POST(makeReq({ notes: "Reason" }), makeCtx("missing-id"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when notes_required error returned", async () => {
    mockRejectListing.mockResolvedValue({ ok: false, error: "notes_required" });
    const res = await POST(makeReq({ notes: "x" }), makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 500 on internal error", async () => {
    mockRejectListing.mockResolvedValue({ ok: false, error: "db_error" });
    const res = await POST(makeReq({ notes: "Reason" }), makeCtx());
    expect(res.status).toBe(500);
  });
});
