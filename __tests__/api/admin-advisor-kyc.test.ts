import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockRequireAdmin,
  mockListPendingKyc,
  mockListKycDocuments,
  mockVerifyKyc,
  mockRejectKyc,
  mockAdminFrom,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockListPendingKyc: vi.fn(),
  mockListKycDocuments: vi.fn(),
  mockVerifyKyc: vi.fn(),
  mockRejectKyc: vi.fn(),
  mockAdminFrom: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/advisor-kyc", () => ({
  listPendingKyc: () => mockListPendingKyc(),
  listKycDocuments: (id: number) => mockListKycDocuments(id),
  verifyKyc: (opts: unknown) => mockVerifyKyc(opts),
  rejectKyc: (opts: unknown) => mockRejectKyc(opts),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET, PATCH } from "@/app/api/admin/advisor-kyc/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true as const, email: "admin@invest.com.au", response: undefined };
const UNAUTH_GUARD = {
  ok: false as const,
  email: "",
  response: new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
};

const KYC_DOC = {
  id: 1,
  professional_id: 42,
  document_type: "afsl_certificate",
  storage_path: "advisor-kyc/42/cert.pdf",
  status: "submitted",
};

function makeAuditChain() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  mockAdminFrom.mockReturnValue({ insert });
  return { insert };
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/admin/advisor-kyc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockListPendingKyc.mockResolvedValue([KYC_DOC]);
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(UNAUTH_GUARD);
    const req = new NextRequest("http://localhost/api/admin/advisor-kyc");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns all pending docs when no professional_id param", async () => {
    const req = new NextRequest("http://localhost/api/admin/advisor-kyc");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(json.items[0].id).toBe(1);
    expect(mockListPendingKyc).toHaveBeenCalledOnce();
    expect(mockListKycDocuments).not.toHaveBeenCalled();
  });

  it("returns docs for specific professional_id", async () => {
    mockListKycDocuments.mockResolvedValue([KYC_DOC]);
    const req = new NextRequest(
      "http://localhost/api/admin/advisor-kyc?professional_id=42",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(mockListKycDocuments).toHaveBeenCalledWith(42);
    expect(mockListPendingKyc).not.toHaveBeenCalled();
  });
});

// ── PATCH tests ───────────────────────────────────────────────────────────────

function makePatch(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/admin/advisor-kyc", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/advisor-kyc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockVerifyKyc.mockResolvedValue(true);
    mockRejectKyc.mockResolvedValue(true);
    makeAuditChain();
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(UNAUTH_GUARD);
    const res = await PATCH(makePatch({ id: 1, action: "verify" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    const res = await PATCH(makePatch({ action: "verify" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when action is missing", async () => {
    const res = await PATCH(makePatch({ id: 1 }));
    expect(res.status).toBe(400);
  });

  it("verifies a KYC document and inserts audit log", async () => {
    const { insert } = makeAuditChain();
    const res = await PATCH(makePatch({ id: 1, action: "verify", notes: "Looks good" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockVerifyKyc).toHaveBeenCalledWith({
      id: 1,
      verifiedBy: "admin@invest.com.au",
      notes: "Looks good",
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "advisor_kyc:verified" }),
    );
  });

  it("returns 400 when reject reason is too short", async () => {
    const res = await PATCH(makePatch({ id: 1, action: "reject", reason: "no" }));
    expect(res.status).toBe(400);
    expect(mockRejectKyc).not.toHaveBeenCalled();
  });

  it("rejects a KYC document and inserts audit log", async () => {
    const { insert } = makeAuditChain();
    const res = await PATCH(
      makePatch({ id: 1, action: "reject", reason: "Document unclear" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockRejectKyc).toHaveBeenCalledWith({
      id: 1,
      verifiedBy: "admin@invest.com.au",
      reason: "Document unclear",
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "advisor_kyc:rejected" }),
    );
  });

  it("returns 400 for unknown action", async () => {
    const res = await PATCH(makePatch({ id: 1, action: "approve" }));
    expect(res.status).toBe(400);
  });
});
