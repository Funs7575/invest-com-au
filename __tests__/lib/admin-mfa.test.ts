import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Stub the pure-crypto layer so the test doesn't have to generate
// real TOTP codes — we're testing the glue, not the primitives.
vi.mock("@/lib/mfa-totp", () => ({
  generateTotpSecret: vi.fn(() => "SECRET123"),
  encryptSecret: vi.fn((s: string) => `enc(${s})`),
  decryptSecret: vi.fn((s: string) => {
    if (s === "bad-cipher") throw new Error("decrypt failed");
    return s.replace(/^enc\(|\)$/g, "");
  }),
  verifyTotpCode: vi.fn((_secret: string, code: string) => code === "123456"),
  buildOtpAuthUrl: vi.fn(
    (issuer: string, email: string, secret: string) =>
      `otpauth://totp/${issuer}:${email}?secret=${secret}`,
  ),
  generateRecoveryCodes: vi.fn((n: number) =>
    Array.from({ length: n }, (_, i) => `RC-${i}`),
  ),
  hashRecoveryCode: vi.fn((c: string) => `h(${c})`),
  verifyRecoveryCode: vi.fn((supplied: string, hashed: string[]) => {
    return hashed.indexOf(`h(${supplied})`);
  }),
}));

type Row = {
  admin_email: string;
  secret_encrypted: string;
  recovery_codes: string[];
  enrolled_at: string;
  last_verified_at: string | null;
  disabled_at: string | null;
} | null;

let currentRow: Row = null;
let upsertError: { message: string } | null = null;

const upsertCalls: Record<string, unknown>[] = [];
const updateCalls: { payload: Record<string, unknown>; email: string }[] = [];

const mockFrom = vi.fn((table: string) => {
  if (table !== "admin_mfa_enrollments") {
    throw new Error(`unexpected table: ${table}`);
  }
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: currentRow, error: null }),
      }),
    }),
    upsert: async (row: Record<string, unknown>) => {
      upsertCalls.push(row);
      return { data: null, error: upsertError };
    },
    update: (payload: Record<string, unknown>) => ({
      eq: async (_col: string, email: string) => {
        updateCalls.push({ payload, email });
        return { data: null, error: null };
      },
    }),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  enrollAdminMfa,
  isAdminMfaEnrolled,
  verifyAdminMfaCode,
  verifyAdminRecoveryCode,
  disableAdminMfa,
} from "@/lib/admin-mfa";

function row(overrides: Partial<NonNullable<Row>> = {}): NonNullable<Row> {
  return {
    admin_email: "admin@invest.com.au",
    secret_encrypted: "enc(SECRET123)",
    recovery_codes: ["h(RC-0)", "h(RC-1)", "h(RC-2)"],
    enrolled_at: "2026-01-01T00:00:00Z",
    last_verified_at: null,
    disabled_at: null,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("admin-mfa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentRow = null;
    upsertError = null;
    upsertCalls.length = 0;
    updateCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("enrollAdminMfa", () => {
    it("upserts an encrypted secret + hashed recovery codes and returns plaintexts", async () => {
      currentRow = null;
      const res = await enrollAdminMfa("Admin@Invest.com.au");

      expect(res.secret).toBe("SECRET123");
      expect(res.recoveryCodes).toHaveLength(10);
      expect(res.otpAuthUrl).toContain("otpauth://totp/");
      expect(res.otpAuthUrl).toContain("SECRET123");

      expect(upsertCalls).toHaveLength(1);
      const written = upsertCalls[0] as Record<string, unknown>;
      // Email lowercased
      expect(written.admin_email).toBe("admin@invest.com.au");
      expect(written.secret_encrypted).toBe("enc(SECRET123)");
      expect(written.recovery_codes).toEqual(
        Array.from({ length: 10 }, (_, i) => `h(RC-${i})`),
      );
      expect(written.enrolled_at).toEqual(expect.any(String));
      expect(written.disabled_at).toBeNull();
    });

    it("re-enrols when an existing disabled row is present", async () => {
      currentRow = row({ disabled_at: "2026-02-01T00:00:00Z" });
      const res = await enrollAdminMfa("admin@invest.com.au");
      expect(res.secret).toBe("SECRET123");
      expect(upsertCalls).toHaveLength(1);
    });

    it("throws when an active enrollment already exists (no silent rotation)", async () => {
      currentRow = row({ disabled_at: null });
      await expect(
        enrollAdminMfa("admin@invest.com.au"),
      ).rejects.toThrow(/already enrolled/);
      expect(upsertCalls).toHaveLength(0);
    });

    it("propagates DB write errors", async () => {
      currentRow = null;
      upsertError = { message: "unique violation" };
      await expect(enrollAdminMfa("x@y.com")).rejects.toThrow(/unique violation/);
    });
  });

  describe("isAdminMfaEnrolled", () => {
    it("false when no row exists", async () => {
      currentRow = null;
      expect(await isAdminMfaEnrolled("x@y.com")).toBe(false);
    });

    it("false when the row is disabled", async () => {
      currentRow = row({ disabled_at: "2026-01-01T00:00:00Z" });
      expect(await isAdminMfaEnrolled("x@y.com")).toBe(false);
    });

    it("true for an active enrollment", async () => {
      currentRow = row();
      expect(await isAdminMfaEnrolled("x@y.com")).toBe(true);
    });
  });

  describe("verifyAdminMfaCode", () => {
    it("returns not_enrolled when no row", async () => {
      currentRow = null;
      expect(await verifyAdminMfaCode("x@y.com", "123456")).toBe("not_enrolled");
    });

    it("returns disabled when disabled_at is set", async () => {
      currentRow = row({ disabled_at: "2026-01-01T00:00:00Z" });
      expect(await verifyAdminMfaCode("x@y.com", "123456")).toBe("disabled");
    });

    it("returns bad_code for wrong TOTP", async () => {
      currentRow = row();
      expect(await verifyAdminMfaCode("x@y.com", "000000")).toBe("bad_code");
      // No stamp written when bad code
      expect(updateCalls).toHaveLength(0);
    });

    it("returns bad_code when decrypt throws (treated as broken enrolment)", async () => {
      currentRow = row({ secret_encrypted: "bad-cipher" });
      expect(await verifyAdminMfaCode("x@y.com", "123456")).toBe("bad_code");
    });

    it("returns ok and stamps last_verified_at on match", async () => {
      currentRow = row();
      expect(await verifyAdminMfaCode("x@y.com", "123456")).toBe("ok");
      expect(updateCalls).toHaveLength(1);
      expect(updateCalls[0]?.payload.last_verified_at).toEqual(expect.any(String));
      expect(updateCalls[0]?.email).toBe("x@y.com");
    });
  });

  describe("verifyAdminRecoveryCode", () => {
    it("returns not_enrolled when no row", async () => {
      currentRow = null;
      expect(await verifyAdminRecoveryCode("x@y.com", "RC-0")).toBe("not_enrolled");
    });

    it("returns disabled when disabled_at is set", async () => {
      currentRow = row({ disabled_at: "2026-01-01T00:00:00Z" });
      expect(await verifyAdminRecoveryCode("x@y.com", "RC-0")).toBe("disabled");
    });

    it("returns bad_code for unknown recovery code", async () => {
      currentRow = row();
      expect(await verifyAdminRecoveryCode("x@y.com", "NOPE")).toBe("bad_code");
      expect(updateCalls).toHaveLength(0);
    });

    it("returns ok, removes the used code, and stamps last_verified_at", async () => {
      currentRow = row({
        recovery_codes: ["h(RC-0)", "h(RC-1)", "h(RC-2)"],
      });
      const result = await verifyAdminRecoveryCode("x@y.com", "RC-1");
      expect(result).toBe("ok");
      expect(updateCalls).toHaveLength(1);
      const remaining = updateCalls[0]?.payload.recovery_codes as string[];
      expect(remaining).toEqual(["h(RC-0)", "h(RC-2)"]);
      expect(updateCalls[0]?.payload.last_verified_at).toEqual(expect.any(String));
    });
  });

  describe("disableAdminMfa", () => {
    it("stamps disabled_at on the row", async () => {
      await disableAdminMfa("X@Y.com");
      expect(updateCalls).toHaveLength(1);
      expect(updateCalls[0]?.payload.disabled_at).toEqual(expect.any(String));
      expect(updateCalls[0]?.email).toBe("x@y.com");
    });
  });
});
