import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockError } = vi.hoisted(() => ({ mockError: vi.fn() }));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: mockError,
  })),
}));

// Each case re-imports the module so the module-level `warned` Set starts
// empty (it is not resettable from the outside).
async function loadChecker() {
  const mod = await import("@/lib/admin-mfa-env-check");
  return mod.checkAdminMfaEnv;
}

beforeEach(() => {
  vi.resetModules();
  mockError.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("checkAdminMfaEnv", () => {
  it("returns ok with no missing vars and never logs when both are set", async () => {
    vi.stubEnv("ADMIN_MFA_COOKIE_SECRET", "cookie-secret");
    vi.stubEnv("ADMIN_MFA_KEY", "totp-key");
    const checkAdminMfaEnv = await loadChecker();

    expect(checkAdminMfaEnv()).toEqual({ ok: true, missing: [] });
    expect(mockError).not.toHaveBeenCalled();
  });

  it("reports ADMIN_MFA_KEY missing when only it is unset", async () => {
    // Use empty string per CI-stub caveat: the CI env: block may set values.
    vi.stubEnv("ADMIN_MFA_COOKIE_SECRET", "cookie-secret");
    vi.stubEnv("ADMIN_MFA_KEY", "");
    const checkAdminMfaEnv = await loadChecker();

    expect(checkAdminMfaEnv()).toEqual({ ok: false, missing: ["ADMIN_MFA_KEY"] });
  });

  it("reports ADMIN_MFA_COOKIE_SECRET missing when only it is unset", async () => {
    vi.stubEnv("ADMIN_MFA_COOKIE_SECRET", "");
    vi.stubEnv("ADMIN_MFA_KEY", "totp-key");
    const checkAdminMfaEnv = await loadChecker();

    expect(checkAdminMfaEnv()).toEqual({
      ok: false,
      missing: ["ADMIN_MFA_COOKIE_SECRET"],
    });
  });

  it("reports both missing in source order when neither is set", async () => {
    vi.stubEnv("ADMIN_MFA_COOKIE_SECRET", "");
    vi.stubEnv("ADMIN_MFA_KEY", "");
    const checkAdminMfaEnv = await loadChecker();

    expect(checkAdminMfaEnv()).toEqual({
      ok: false,
      missing: ["ADMIN_MFA_COOKIE_SECRET", "ADMIN_MFA_KEY"],
    });
    expect(mockError).toHaveBeenCalledTimes(1);
    expect(mockError).toHaveBeenCalledWith(expect.any(String), {
      missing: ["ADMIN_MFA_COOKIE_SECRET", "ADMIN_MFA_KEY"],
    });
  });

  it("warns only once per process for the same missing set", async () => {
    vi.stubEnv("ADMIN_MFA_COOKIE_SECRET", "");
    vi.stubEnv("ADMIN_MFA_KEY", "");
    const checkAdminMfaEnv = await loadChecker();

    const first = checkAdminMfaEnv();
    const second = checkAdminMfaEnv();

    expect(first).toEqual(second);
    expect(first.ok).toBe(false);
    // The module-level `warned` Set dedupes the log.error across calls.
    expect(mockError).toHaveBeenCalledTimes(1);
  });
});
