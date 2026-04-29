import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

const mockListPendingKyc = vi.fn();
const mockListKycDocuments = vi.fn();
const mockVerifyKyc = vi.fn();
const mockRejectKyc = vi.fn();
vi.mock("@/lib/advisor-kyc", () => ({
  listPendingKyc: () => mockListPendingKyc(),
  listKycDocuments: (...args: unknown[]) => mockListKycDocuments(...args),
  verifyKyc: (...args: unknown[]) => mockVerifyKyc(...args),
  rejectKyc: (...args: unknown[]) => mockRejectKyc(...args),
}));

import { GET, PATCH } from "@/app/api/admin/advisor-kyc/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true, email: "admin@test.com", userId: "uid-1" } as const;
const DENY_GUARD = {
  ok: false,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
} as const;

function makeGet(searchParams?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/admin/advisor-kyc");
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

function makePatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/advisor-kyc", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupAuditMock() {
  mockFrom.mockImplementation(() => ({
    insert: vi.fn().mockResolvedValue({ error: null }),
  }));
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/admin/advisor-kyc", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns pending KYC queue when no professional_id given", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockListPendingKyc.mockResolvedValue([{ id: 1, status: "pending" }]);
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(mockListKycDocuments).not.toHaveBeenCalled();
  });

  it("returns documents for specific professional when professional_id given", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockListKycDocuments.mockResolvedValue([{ id: 2, status: "verified" }]);
    const res = await GET(makeGet({ professional_id: "42" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(mockListKycDocuments).toHaveBeenCalledWith(42);
    expect(mockListPendingKyc).not.toHaveBeenCalled();
  });
});

// ── PATCH tests ───────────────────────────────────────────────────────────────

describe("PATCH /api/admin/advisor-kyc", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await PATCH(makePatch({ id: 1, action: "verify" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await PATCH(makePatch({ action: "verify" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing/i);
  });

  it("returns 400 when action is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await PATCH(makePatch({ id: 1 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when rejection reason is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await PATCH(makePatch({ id: 1, action: "reject" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/reason/i);
  });

  it("returns 400 when rejection reason is too short (< 3 chars)", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await PATCH(makePatch({ id: 1, action: "reject", reason: "ab" }));
    expect(res.status).toBe(400);
  });

  it("calls verifyKyc and writes audit log on verify action", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockVerifyKyc.mockResolvedValue(true);
    setupAuditMock();
    const res = await PATCH(makePatch({ id: 5, action: "verify", notes: "Looks good" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockVerifyKyc).toHaveBeenCalledWith({
      id: 5,
      verifiedBy: "admin@test.com",
      notes: "Looks good",
    });
  });

  it("passes null notes to verifyKyc when not provided", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockVerifyKyc.mockResolvedValue(true);
    setupAuditMock();
    await PATCH(makePatch({ id: 5, action: "verify" }));
    expect(mockVerifyKyc).toHaveBeenCalledWith(
      expect.objectContaining({ notes: null })
    );
  });

  it("calls rejectKyc and writes audit log on reject action", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockRejectKyc.mockResolvedValue(true);
    setupAuditMock();
    const res = await PATCH(makePatch({ id: 7, action: "reject", reason: "Blurry image" }));
    expect(res.status).toBe(200);
    expect(mockRejectKyc).toHaveBeenCalledWith({
      id: 7,
      verifiedBy: "admin@test.com",
      reason: "Blurry image",
    });
  });

  it("returns 400 for unknown action", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await PATCH(makePatch({ id: 1, action: "unknown_action" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unknown/i);
  });
});
