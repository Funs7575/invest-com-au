import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

const mockEnrollAdminMfa = vi.fn();
const mockIsAdminMfaEnrolled = vi.fn();
const mockDisableAdminMfa = vi.fn();
vi.mock("@/lib/admin-mfa", () => ({
  enrollAdminMfa: (...args: unknown[]) => mockEnrollAdminMfa(...args),
  isAdminMfaEnrolled: (...args: unknown[]) => mockIsAdminMfaEnrolled(...args),
  disableAdminMfa: (...args: unknown[]) => mockDisableAdminMfa(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET, POST, DELETE } from "@/app/api/admin/mfa/enroll/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true, email: "admin@test.com", userId: "uid-1" } as const;
const DENY_GUARD = {
  ok: false,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
} as const;

const ENROLL_RESULT = {
  secret: "JBSWY3DPEHPK3PXP",
  otpAuthUrl: "otpauth://totp/admin%40test.com?secret=JBSWY3DPEHPK3PXP&issuer=invest.com.au",
  recoveryCodes: ["aaa-111", "bbb-222", "ccc-333"],
};

function makeDelete(body: unknown): Request {
  return new Request("http://localhost/api/admin/mfa/enroll", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupAuditMock() {
  mockFrom.mockImplementation((table: string) => {
    if (table === "admin_action_log") {
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }
    return {};
  });
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/admin/mfa/enroll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns enrolled=true when MFA is active", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockIsAdminMfaEnrolled.mockResolvedValue(true);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enrolled).toBe(true);
    expect(body.email).toBe("admin@test.com");
  });

  it("returns enrolled=false when MFA is not active", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockIsAdminMfaEnrolled.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enrolled).toBe(false);
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/admin/mfa/enroll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns secret + otpAuthUrl + recoveryCodes on success", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockEnrollAdminMfa.mockResolvedValue(ENROLL_RESULT);
    setupAuditMock();
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.secret).toBe(ENROLL_RESULT.secret);
    expect(body.otpAuthUrl).toBe(ENROLL_RESULT.otpAuthUrl);
    expect(body.recoveryCodes).toHaveLength(3);
    expect(body.warning).toMatch(/shown only once/i);
  });

  it("returns 500 when enrollment throws", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockEnrollAdminMfa.mockRejectedValue(new Error("totp_init_failed"));
    const res = await POST();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("totp_init_failed");
  });

  it("passes admin email to enrollAdminMfa", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockEnrollAdminMfa.mockResolvedValue(ENROLL_RESULT);
    setupAuditMock();
    await POST();
    expect(mockEnrollAdminMfa).toHaveBeenCalledWith("admin@test.com");
  });
});

// ── DELETE tests ──────────────────────────────────────────────────────────────

describe("DELETE /api/admin/mfa/enroll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await DELETE(makeDelete({ reason: "device replaced" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when reason is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await DELETE(makeDelete({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/reason/i);
  });

  it("returns 400 when reason is too short (< 5 chars)", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await DELETE(makeDelete({ reason: "bad" }));
    expect(res.status).toBe(400);
  });

  it("disables MFA and returns ok on success", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockDisableAdminMfa.mockResolvedValue(undefined);
    setupAuditMock();
    const res = await DELETE(makeDelete({ reason: "device replaced — new phone" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockDisableAdminMfa).toHaveBeenCalledWith("admin@test.com");
  });

  it("writes audit log on disable", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockDisableAdminMfa.mockResolvedValue(undefined);
    const actionInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "admin_action_log") {
        return { insert: actionInsert };
      }
      return {};
    });
    await DELETE(makeDelete({ reason: "device replaced" }));
    expect(actionInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_email: "admin@test.com",
        reason: "mfa_disabled",
      })
    );
  });
});
