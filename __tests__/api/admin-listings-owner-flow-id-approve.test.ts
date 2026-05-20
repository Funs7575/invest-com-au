/**
 * Tests for POST /api/admin/listings/owner-flow/[id]/approve
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

const mockApproveListing = vi.fn(async () => ({
  ok: true,
  noOp: false,
  listing: { slug: "test-listing" },
}));
vi.mock("@/lib/listings/moderate", () => ({
  approveListing: (...args: unknown[]) => mockApproveListing(...args),
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

import { POST } from "@/app/api/admin/listings/owner-flow/[id]/approve/route";

function makeReq(body?: unknown): NextRequest {
  const headers: Record<string, string> = {};
  let reqBody: string | undefined;
  if (body !== undefined) {
    reqBody = JSON.stringify(body);
    headers["content-type"] = "application/json";
    headers["content-length"] = String(reqBody.length);
  }
  return new NextRequest("http://localhost/api/admin/listings/owner-flow/listing-1/approve", {
    method: "POST",
    ...(reqBody !== undefined ? { body: reqBody, headers } : {}),
  });
}

function makeCtx(id = "listing-1") {
  return { params: Promise.resolve({ id }) } as { params: Promise<{ id: string }> };
}

describe("POST /api/admin/listings/owner-flow/[id]/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true, email: "admin@invest.com.au", userId: "u1",
    });
    mockApproveListing.mockResolvedValue({
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
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 200 on successful approve", async () => {
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.noOp).toBe(false);
    expect(mockApproveListing).toHaveBeenCalledWith("listing-1", "u1");
  });

  it("returns 404 when listing not found", async () => {
    mockApproveListing.mockResolvedValue({ ok: false, error: "not_found" });
    const res = await POST(makeReq(), makeCtx("nonexistent-id"));
    expect(res.status).toBe(404);
  });

  it("returns 500 on internal error", async () => {
    mockApproveListing.mockResolvedValue({ ok: false, error: "db_error" });
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(500);
  });

  it("returns 200 with noOp true when already approved", async () => {
    mockApproveListing.mockResolvedValue({
      ok: true,
      noOp: true,
      listing: { slug: "test-listing" },
    });
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.noOp).toBe(true);
  });
});
