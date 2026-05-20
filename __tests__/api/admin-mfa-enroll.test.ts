/**
 * Tests for GET/POST/DELETE /api/admin/mfa/enroll
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockEnrollAdminMfa = vi.fn(async () => ({
  secret: "TESTSECRET",
  otpAuthUrl: "otpauth://totp/test",
  recoveryCodes: ["CODE1", "CODE2"],
}));
const mockIsAdminMfaEnrolled = vi.fn(async () => false);
const mockDisableAdminMfa = vi.fn(async () => undefined);

vi.mock("@/lib/admin-mfa", () => ({
  enrollAdminMfa: (...args: unknown[]) => mockEnrollAdminMfa(...args),
  isAdminMfaEnrolled: (...args: unknown[]) => mockIsAdminMfaEnrolled(...args),
  disableAdminMfa: (...args: unknown[]) => mockDisableAdminMfa(...args),
}));

const mockCheckAdminMfaEnv = vi.fn(() => ({ ok: true, missing: [] }));
vi.mock("@/lib/admin-mfa-env-check", () => ({
  checkAdminMfaEnv: () => mockCheckAdminMfaEnv(),
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

import { GET, POST, DELETE } from "@/app/api/admin/mfa/enroll/route";

describe("/api/admin/mfa/enroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true, email: "admin@invest.com.au", userId: "u1",
    });
    mockIsAdminMfaEnrolled.mockResolvedValue(false);
    mockEnrollAdminMfa.mockResolvedValue({
      secret: "TESTSECRET",
      otpAuthUrl: "otpauth://totp/test",
      recoveryCodes: ["CODE1", "CODE2"],
    });
    mockCheckAdminMfaEnv.mockReturnValue({ ok: true, missing: [] });
    mockFrom.mockReturnValue(makeBuilder());
  });

  describe("GET", () => {
    it("returns 401 when not admin", async () => {
      mockRequireAdmin.mockResolvedValue({
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      });
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("returns 200 with enrolled status", async () => {
      mockIsAdminMfaEnrolled.mockResolvedValue(true);
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.enrolled).toBe(true);
      expect(json.email).toBe("admin@invest.com.au");
    });

    it("returns enrolled=false when not enrolled", async () => {
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.enrolled).toBe(false);
    });
  });

  describe("POST", () => {
    it("returns 503 when env not configured", async () => {
      mockCheckAdminMfaEnv.mockReturnValue({ ok: false, missing: ["ADMIN_MFA_KEY"] });
      const res = await POST();
      expect(res.status).toBe(503);
    });

    it("returns 401 when not admin", async () => {
      mockRequireAdmin.mockResolvedValue({
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      });
      const res = await POST();
      expect(res.status).toBe(401);
    });

    it("returns 200 with secret and recovery codes on successful enroll", async () => {
      const res = await POST();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.secret).toBe("TESTSECRET");
      expect(json.recoveryCodes).toEqual(["CODE1", "CODE2"]);
      expect(json).toHaveProperty("warning");
    });

    it("returns 500 when enrollment throws", async () => {
      mockEnrollAdminMfa.mockRejectedValue(new Error("encrypt failed"));
      const res = await POST();
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE", () => {
    it("returns 401 when not admin", async () => {
      mockRequireAdmin.mockResolvedValue({
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      });
      const req = new Request("http://localhost/api/admin/mfa/enroll", {
        method: "DELETE",
        body: JSON.stringify({ reason: "Testing disable" }),
        headers: { "content-type": "application/json" },
      });
      const res = await DELETE(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 when reason is missing", async () => {
      const req = new Request("http://localhost/api/admin/mfa/enroll", {
        method: "DELETE",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      });
      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when reason is too short", async () => {
      const req = new Request("http://localhost/api/admin/mfa/enroll", {
        method: "DELETE",
        body: JSON.stringify({ reason: "no" }),
        headers: { "content-type": "application/json" },
      });
      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });

    it("returns 200 on successful disable", async () => {
      const req = new Request("http://localhost/api/admin/mfa/enroll", {
        method: "DELETE",
        body: JSON.stringify({ reason: "Switching authenticator app" }),
        headers: { "content-type": "application/json" },
      });
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(mockDisableAdminMfa).toHaveBeenCalledWith("admin@invest.com.au");
    });
  });
});
