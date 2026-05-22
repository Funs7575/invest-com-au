import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockIsAllowed, mockGetUser, mockFromChain, mockStorageFrom, mockAdminFrom } = vi.hoisted(
  () => ({
    mockIsAllowed: vi.fn(),
    mockGetUser: vi.fn(),
    mockFromChain: vi.fn(),
    mockStorageFrom: vi.fn(),
    mockAdminFrom: vi.fn(),
  }),
);

vi.mock("@/lib/rate-limit-db", () => ({ isAllowed: mockIsAllowed }));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFromChain,
    storage: { from: mockStorageFrom },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
  }),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: vi.fn(async () => ({ ok: true, email: "admin@invest.com.au", response: null })),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { POST } from "@/app/api/wholesale-investor-cert/submit/route";
import { PATCH } from "@/app/api/wholesale-investor-cert/verify/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-abc-123";
const CERT_ID = "cert-xyz-456";

function makeMultipart(fields: Record<string, string | File>): Request {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return new NextRequest("http://localhost/api/wholesale-investor-cert/submit", {
    method: "POST",
    body: fd,
  });
}

function makeVerifyReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/wholesale-investor-cert/verify", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function pdfFile(name = "cert.pdf"): File {
  return new File(["PDF content"], name, { type: "application/pdf" });
}

function buildFromChain(overrides: {
  existingCert?: unknown;
  insertResult?: unknown;
} = {}) {
  const insertChain = { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: CERT_ID }, error: null }) };
  if (overrides.insertResult !== undefined) {
    insertChain.single = vi.fn().mockResolvedValue(overrides.insertResult);
  }
  const selectChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: overrides.existingCert ?? null, error: null }),
    single: vi.fn().mockResolvedValue({ data: overrides.existingCert ?? null, error: null }),
  };

  return vi.fn((table: string) => {
    if (table === "wholesale_investor_certifications") {
      return {
        ...selectChain,
        insert: vi.fn().mockReturnValue(insertChain),
      };
    }
    return selectChain;
  });
}

function buildStorageFrom() {
  return vi.fn(() => ({
    upload: vi.fn().mockResolvedValue({ error: null }),
    remove: vi.fn().mockResolvedValue({ error: null }),
  }));
}

// ─── submit route tests ────────────────────────────────────────────────────────

describe("POST /api/wholesale-investor-cert/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
    mockFromChain.mockImplementation(buildFromChain());
    mockStorageFrom.mockImplementation(buildStorageFrom());
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeMultipart({}) as NextRequest);
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeMultipart({ certification_type: "s708_sophisticated", evidence_doc: pdfFile() }) as NextRequest);
    expect(res.status).toBe(429);
  });

  it("returns 409 when active verified cert already exists", async () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString();
    mockFromChain.mockImplementation(buildFromChain({
      existingCert: { id: CERT_ID, status: "verified", expires_at: futureDate },
    }));
    const res = await POST(makeMultipart({ certification_type: "s708_sophisticated", evidence_doc: pdfFile() }) as NextRequest);
    expect(res.status).toBe(409);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/already have an active/i);
  });

  it("returns 409 when cert is pending review", async () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    mockFromChain.mockImplementation(buildFromChain({
      existingCert: { id: CERT_ID, status: "pending", expires_at: futureDate },
    }));
    const res = await POST(makeMultipart({ certification_type: "s708_sophisticated", evidence_doc: pdfFile() }) as NextRequest);
    expect(res.status).toBe(409);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/under review/i);
  });

  it("returns 400 for invalid certification_type", async () => {
    const res = await POST(makeMultipart({ certification_type: "fake_type", evidence_doc: pdfFile() }) as NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/certification_type/i);
  });

  it("returns 400 when evidence_doc is missing", async () => {
    const res = await POST(makeMultipart({ certification_type: "s708_sophisticated" }) as NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/evidence_doc/i);
  });

  it("returns 400 for unsupported file type", async () => {
    const badFile = new File(["content"], "cert.txt", { type: "text/plain" });
    const res = await POST(makeMultipart({ certification_type: "s708_sophisticated", evidence_doc: badFile }) as NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/PDF/i);
  });

  it("creates cert record and returns 201 on success", async () => {
    const res = await POST(makeMultipart({ certification_type: "s708_sophisticated", evidence_doc: pdfFile() }) as NextRequest);
    expect(res.status).toBe(201);
    const body = await res.json() as { certId: string; status: string };
    expect(body.certId).toBe(CERT_ID);
    expect(body.status).toBe("pending");
  });

  it("accepts professional_investor type", async () => {
    const res = await POST(makeMultipart({ certification_type: "professional_investor", evidence_doc: pdfFile() }) as NextRequest);
    expect(res.status).toBe(201);
  });

  it("rolls back storage if DB insert fails", async () => {
    const removeMock = vi.fn().mockResolvedValue({ error: null });
    mockStorageFrom.mockImplementation(() => ({
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: removeMock,
    }));
    mockFromChain.mockImplementation(buildFromChain({
      insertResult: { data: null, error: { message: "DB error" } },
    }));
    const res = await POST(makeMultipart({ certification_type: "s708_sophisticated", evidence_doc: pdfFile() }) as NextRequest);
    expect(res.status).toBe(500);
    expect(removeMock).toHaveBeenCalled();
  });
});

// ─── verify route tests ────────────────────────────────────────────────────────

describe("PATCH /api/wholesale-investor-cert/verify", () => {
  const pendingCert = {
    id: CERT_ID,
    user_id: USER_ID,
    status: "pending",
    certification_type: "s708_sophisticated",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    const updateChain = { eq: vi.fn().mockResolvedValue({ error: null }) };
    const _insertAuditChain = { then: vi.fn() };

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "wholesale_investor_certifications") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: pendingCert, error: null }),
          update: vi.fn(() => updateChain),
        };
      }
      if (table === "admin_audit_log") {
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }
      return {};
    });
  });

  it("returns 400 when certId is missing", async () => {
    const res = await PATCH(makeVerifyReq({ action: "approve" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when action is invalid", async () => {
    const res = await PATCH(makeVerifyReq({ certId: CERT_ID, action: "maybe" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when cert not found", async () => {
    mockAdminFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    const res = await PATCH(makeVerifyReq({ certId: CERT_ID, action: "approve" }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when cert is not pending", async () => {
    mockAdminFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { ...pendingCert, status: "verified" }, error: null }),
    }));
    const res = await PATCH(makeVerifyReq({ certId: CERT_ID, action: "approve" }));
    expect(res.status).toBe(409);
  });

  it("approves cert and returns verified status with expiresAt", async () => {
    const res = await PATCH(makeVerifyReq({ certId: CERT_ID, action: "approve" }));
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; status: string; expiresAt: string };
    expect(body.success).toBe(true);
    expect(body.status).toBe("verified");
    expect(body.expiresAt).toBeDefined();
    // expiresAt should be ~6 months from now
    const expiry = new Date(body.expiresAt);
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    expect(Math.abs(expiry.getTime() - sixMonthsFromNow.getTime())).toBeLessThan(5000);
  });

  it("rejects cert and returns rejected status", async () => {
    const res = await PATCH(makeVerifyReq({ certId: CERT_ID, action: "reject", rejectionReason: "Cert outdated" }));
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; status: string };
    expect(body.success).toBe(true);
    expect(body.status).toBe("rejected");
  });
});
