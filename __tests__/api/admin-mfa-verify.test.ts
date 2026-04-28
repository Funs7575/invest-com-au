import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { makeRequest } from "@/__tests__/helpers";

const TEST_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
const mockIsEnrolled = vi.fn();
const mockVerifyTotp = vi.fn();
const mockVerifyRecovery = vi.fn();

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/admin-mfa", () => ({
  isAdminMfaEnrolled: (email: string) => mockIsEnrolled(email),
  verifyAdminMfaCode: (email: string, code: string) =>
    mockVerifyTotp(email, code),
  verifyAdminRecoveryCode: (email: string, code: string) =>
    mockVerifyRecovery(email, code),
}));

import { POST } from "@/app/api/admin/mfa/verify/route";
import { MFA_COOKIE_NAME, verifyMfaCookie } from "@/lib/admin-mfa-cookie";

describe("POST /api/admin/mfa/verify", () => {
  let originalSecret: string | undefined;

  beforeAll(() => {
    originalSecret = process.env.ADMIN_MFA_COOKIE_SECRET;
    process.env.ADMIN_MFA_COOKIE_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.ADMIN_MFA_COOKIE_SECRET;
    } else {
      process.env.ADMIN_MFA_COOKIE_SECRET = originalSecret;
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      email: "admin@invest.com.au",
      userId: "user-1",
    });
  });

  it("returns 401 when not authenticated as admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      }),
    });
    const req = makeRequest("/api/admin/mfa/verify", { code: "123456" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when neither code nor recovery_code provided", async () => {
    const req = makeRequest("/api/admin/mfa/verify", {});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/code or recovery_code required/);
  });

  it("returns 400 on malformed JSON", async () => {
    const req = new (await import("next/server")).NextRequest(
      "http://localhost/api/admin/mfa/verify",
      {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when admin not enrolled", async () => {
    mockIsEnrolled.mockResolvedValue(false);
    const req = makeRequest("/api/admin/mfa/verify", { code: "123456" });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.code).toBe("not_enrolled");
  });

  it("returns 422 with 'bad_code' when TOTP wrong", async () => {
    mockIsEnrolled.mockResolvedValue(true);
    mockVerifyTotp.mockResolvedValue("bad_code");
    const req = makeRequest("/api/admin/mfa/verify", { code: "999999" });
    const res = await POST(req);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.code).toBe("bad_code");
    expect(json.error).toBe("Invalid code");
  });

  it("returns 200 + sets signed cookie on valid TOTP", async () => {
    mockIsEnrolled.mockResolvedValue(true);
    mockVerifyTotp.mockResolvedValue("ok");
    const req = makeRequest("/api/admin/mfa/verify", { code: "123456" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain(MFA_COOKIE_NAME);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=strict");
    // Extract cookie value and verify the signature
    const match = setCookie.match(new RegExp(`${MFA_COOKIE_NAME}=([^;]+)`));
    expect(match).not.toBeNull();
    if (match) {
      const verdict = verifyMfaCookie(match[1]);
      expect(verdict.ok).toBe(true);
      if (verdict.ok) expect(verdict.email).toBe("admin@invest.com.au");
    }
  });

  it("returns 200 + sets cookie on valid recovery code", async () => {
    mockIsEnrolled.mockResolvedValue(true);
    mockVerifyRecovery.mockResolvedValue("ok");
    const req = makeRequest("/api/admin/mfa/verify", {
      recovery_code: "ABCD-EFGH-IJKL",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockVerifyRecovery).toHaveBeenCalledWith(
      "admin@invest.com.au",
      "ABCD-EFGH-IJKL",
    );
    expect(mockVerifyTotp).not.toHaveBeenCalled();
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain(MFA_COOKIE_NAME);
  });

  it("trims whitespace from submitted code", async () => {
    mockIsEnrolled.mockResolvedValue(true);
    mockVerifyTotp.mockResolvedValue("ok");
    const req = makeRequest("/api/admin/mfa/verify", { code: "  123456  " });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockVerifyTotp).toHaveBeenCalledWith(
      "admin@invest.com.au",
      "123456",
    );
  });

  it("treats disabled MFA as 403, not 422", async () => {
    mockIsEnrolled.mockResolvedValue(true);
    mockVerifyTotp.mockResolvedValue("disabled");
    const req = makeRequest("/api/admin/mfa/verify", { code: "123456" });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
