import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockRequireAdmin, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockAdminFrom: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

import { PATCH } from "@/app/api/wholesale-investor-cert/verify/route";

const ADMIN_OK = { ok: true as const, email: "admin@invest.com.au", userId: "admin-1" };

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/wholesale-investor-cert/verify", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// from("wholesale_investor_certifications") select+update; from("admin_audit_log") insert
function buildAdminFrom(opts: {
  cert?: { id: string; user_id: string; status: string; certification_type: string } | null;
  updateError?: { message: string } | null;
} = {}) {
  const auditInsert = vi.fn(async () => ({ data: null, error: null }));
  return vi.fn((table: string) => {
    if (table === "wholesale_investor_certifications") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(async () => ({ data: opts.cert ?? null, error: null })),
        update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: opts.updateError ?? null })) })),
      };
    }
    if (table === "admin_audit_log") {
      return { insert: auditInsert };
    }
    return {};
  });
}

const PENDING = { id: "cert-1", user_id: "user-5", status: "pending", certification_type: "s708_sophisticated" };

describe("PATCH /api/wholesale-investor-cert/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(ADMIN_OK);
    mockAdminFrom.mockImplementation(buildAdminFrom({ cert: PENDING }));
  });

  it("returns the guard response when the caller is not an admin", async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });
    const res = await PATCH(makeReq({ certId: "cert-1", action: "approve" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 on an invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/wholesale-investor-cert/verify", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when certId is missing", async () => {
    const res = await PATCH(makeReq({ action: "approve" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when the action is not approve/reject", async () => {
    const res = await PATCH(makeReq({ certId: "cert-1", action: "maybe" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the certification is not found", async () => {
    mockAdminFrom.mockImplementation(buildAdminFrom({ cert: null }));
    const res = await PATCH(makeReq({ certId: "missing", action: "approve" }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when the certification is no longer pending", async () => {
    mockAdminFrom.mockImplementation(buildAdminFrom({ cert: { ...PENDING, status: "verified" } }));
    const res = await PATCH(makeReq({ certId: "cert-1", action: "approve" }));
    expect(res.status).toBe(409);
    expect((await res.json() as { error: string }).error).toMatch(/already 'verified'/i);
  });

  it("approves a pending cert and returns status verified with a 6-month expiry", async () => {
    const res = await PATCH(makeReq({ certId: "cert-1", action: "approve" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; status: string; expiresAt: string };
    expect(json.success).toBe(true);
    expect(json.status).toBe("verified");
    // ~6 months ahead — sanity-check it is comfortably in the future.
    expect(new Date(json.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects a pending cert and returns status rejected", async () => {
    const res = await PATCH(makeReq({ certId: "cert-1", action: "reject", rejectionReason: "doc unreadable" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; status: string };
    expect(json.success).toBe(true);
    expect(json.status).toBe("rejected");
  });

  it("writes an admin_audit_log entry on approval", async () => {
    let auditCalled = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "wholesale_investor_certifications") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => ({ data: PENDING, error: null })),
          update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
        };
      }
      return { insert: vi.fn(async () => { auditCalled += 1; return { data: null, error: null }; }) };
    });
    await PATCH(makeReq({ certId: "cert-1", action: "approve" }));
    expect(auditCalled).toBe(1);
  });

  it("returns 500 when the approve update fails", async () => {
    mockAdminFrom.mockImplementation(buildAdminFrom({ cert: PENDING, updateError: { message: "update boom" } }));
    const res = await PATCH(makeReq({ certId: "cert-1", action: "approve" }));
    expect(res.status).toBe(500);
  });

  it("returns 500 when the reject update fails", async () => {
    mockAdminFrom.mockImplementation(buildAdminFrom({ cert: PENDING, updateError: { message: "update boom" } }));
    const res = await PATCH(makeReq({ certId: "cert-1", action: "reject" }));
    expect(res.status).toBe(500);
  });
});
