import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockListPendingKyc = vi.fn();
const mockListKycDocuments = vi.fn();
const mockVerifyKyc = vi.fn();
const mockRejectKyc = vi.fn();
vi.mock("@/lib/advisor-kyc", () => ({
  listPendingKyc: () => mockListPendingKyc(),
  listKycDocuments: (...a: unknown[]) => mockListKycDocuments(...a),
  verifyKyc: (...a: unknown[]) => mockVerifyKyc(...a),
  rejectKyc: (...a: unknown[]) => mockRejectKyc(...a),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, PATCH } from "@/app/api/admin/advisor-kyc/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true as const, email: "admin@test.com", userId: "uid-1" };
const DENY_GUARD = {
  ok: false as const,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
};

function makePatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/advisor-kyc", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/admin/advisor-kyc", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const req = new NextRequest("http://localhost/api/admin/advisor-kyc");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns pending KYC queue when no professional_id", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockListPendingKyc.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const req = new NextRequest("http://localhost/api/admin/advisor-kyc");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(mockListPendingKyc).toHaveBeenCalled();
  });

  it("returns docs for specific professional_id", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockListKycDocuments.mockResolvedValue([{ id: 3, document_type: "passport" }]);
    const req = new NextRequest("http://localhost/api/admin/advisor-kyc?professional_id=99");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(mockListKycDocuments).toHaveBeenCalledWith(99);
  });
});

// ── PATCH ─────────────────────────────────────────────────────────────────────

describe("PATCH /api/admin/advisor-kyc", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await PATCH(makePatch({ id: 1, action: "verify" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await PATCH(makePatch({ action: "verify" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when action is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await PATCH(makePatch({ id: 5 }));
    expect(res.status).toBe(400);
  });

  it("verify: calls verifyKyc and writes audit log", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockVerifyKyc.mockResolvedValue(true);
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    const res = await PATCH(makePatch({ id: 5, action: "verify", notes: "looks good" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockVerifyKyc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, verifiedBy: "admin@test.com", notes: "looks good" })
    );
    expect(mockFrom).toHaveBeenCalledWith("admin_audit_log");
  });

  it("verify: audit log uses advisor_kyc:verified action", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockVerifyKyc.mockResolvedValue(true);
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: auditInsert });
    await PATCH(makePatch({ id: 5, action: "verify" }));
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "advisor_kyc:verified", entity_id: "5" })
    );
  });

  it("reject: returns 400 when reason is too short (<3 chars)", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await PATCH(makePatch({ id: 5, action: "reject", reason: "no" }));
    expect(res.status).toBe(400);
  });

  it("reject: calls rejectKyc and writes audit log", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockRejectKyc.mockResolvedValue(true);
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: auditInsert });
    const res = await PATCH(makePatch({ id: 5, action: "reject", reason: "Documents expired" }));
    expect(res.status).toBe(200);
    expect(mockRejectKyc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, reason: "Documents expired" })
    );
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "advisor_kyc:rejected" })
    );
  });

  it("returns 400 for unknown action", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await PATCH(makePatch({ id: 5, action: "approve_everything" }));
    expect(res.status).toBe(400);
  });
});
