import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

let mockUser: { id: string; email: string | null } | null = null;
let mockMfaCookie: string | undefined;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: async () => ({ data: { user: mockUser }, error: null }),
    },
  })),
}));

// requireAdmin reads the admin_mfa_verified cookie via next/headers when
// the MFA step-up gate is active. Mock cookies() with a settable value.
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === "admin_mfa_verified" && mockMfaCookie
        ? { name, value: mockMfaCookie }
        : undefined,
  })),
}));

// requireAdmin reads getAdminEmails() each call — mock via env.
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { requireAdmin } from "@/lib/require-admin";
import { signMfaCookie } from "@/lib/admin-mfa-cookie";

describe("requireAdmin", () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS;
  const originalMfaSecret = process.env.ADMIN_MFA_COOKIE_SECRET;

  beforeEach(() => {
    // Known allowlist for the suite
    process.env.ADMIN_EMAILS = "admin@invest.com.au,finn@invest.com.au";
    // MFA gate OFF by default (no secret, non-prod) so the base cases
    // exercise only the session + allowlist checks. The MFA describe opts in.
    delete process.env.ADMIN_MFA_COOKIE_SECRET;
    mockUser = null;
    mockMfaCookie = undefined;
  });

  afterEach(() => {
    if (originalAdminEmails === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = originalAdminEmails;
    if (originalMfaSecret === undefined) delete process.env.ADMIN_MFA_COOKIE_SECRET;
    else process.env.ADMIN_MFA_COOKIE_SECRET = originalMfaSecret;
  });

  it("returns 401 when no user is logged in", async () => {
    mockUser = null;
    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      const json = await result.response.json();
      expect(json.error).toBe("Unauthorized");
    }
  });

  it("returns 401 when user has no email (e.g. anonymous auth)", async () => {
    mockUser = { id: "u1", email: null };
    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 403 when the logged-in email is not in the admin allowlist", async () => {
    mockUser = { id: "u1", email: "notadmin@invest.com.au" };
    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      const json = await result.response.json();
      expect(json.error).toBe("Forbidden");
    }
  });

  it("returns ok=true with email + userId for an allowlisted user", async () => {
    mockUser = { id: "user-42", email: "admin@invest.com.au" };
    const result = await requireAdmin();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.email).toBe("admin@invest.com.au");
      expect(result.userId).toBe("user-42");
    }
  });

  it("is case-insensitive on the email check (allowlist is lowercased)", async () => {
    mockUser = { id: "user-42", email: "ADMIN@INVEST.COM.AU" };
    const result = await requireAdmin();
    expect(result.ok).toBe(true);
  });

  it("respects runtime ADMIN_EMAILS changes (not just import-time)", async () => {
    process.env.ADMIN_EMAILS = "runtime-only@example.com";
    mockUser = { id: "u1", email: "runtime-only@example.com" };
    const result = await requireAdmin();
    expect(result.ok).toBe(true);
  });

  it("rejects users from the 'looks-similar' address space (exact match only)", async () => {
    // Don't want a regression that matches by substring or prefix
    mockUser = { id: "u1", email: "admin@invest.com.au.attacker.com" };
    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  // ── MFA step-up gate (P1-2) ──────────────────────────────────────────
  // When the signing secret is configured the gate is active; an
  // allowlisted admin still needs a valid admin_mfa_verified cookie before
  // any /api/admin/* route runs — closing the gap where proxy.ts only
  // gated admin *pages*.
  describe("MFA step-up gate", () => {
    const SECRET = "0123456789abcdef0123456789abcdef0123456789"; // ≥32 chars

    beforeEach(() => {
      process.env.ADMIN_MFA_COOKIE_SECRET = SECRET;
      mockUser = { id: "user-42", email: "admin@invest.com.au" };
    });

    it("returns 403 mfa_required for an allowlisted admin without an MFA cookie", async () => {
      mockMfaCookie = undefined;
      const result = await requireAdmin();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(403);
        const json = await result.response.json();
        expect(json.code).toBe("mfa_required");
      }
    });

    it("returns 403 when the MFA cookie is forged / not validly signed", async () => {
      mockMfaCookie = "not-a-validly-signed.cookie";
      const result = await requireAdmin();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.response.status).toBe(403);
    });

    it("returns ok=true with a validly signed MFA cookie", async () => {
      mockMfaCookie = signMfaCookie("admin@invest.com.au");
      const result = await requireAdmin();
      expect(result.ok).toBe(true);
    });

    it("bypasses the MFA gate when requireMfa:false (the enroll/verify routes)", async () => {
      mockMfaCookie = undefined;
      const result = await requireAdmin({ requireMfa: false });
      expect(result.ok).toBe(true);
    });

    it("still rejects a non-allowlisted user even with requireMfa:false", async () => {
      mockUser = { id: "u1", email: "notadmin@invest.com.au" };
      const result = await requireAdmin({ requireMfa: false });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.response.status).toBe(403);
    });
  });
});
