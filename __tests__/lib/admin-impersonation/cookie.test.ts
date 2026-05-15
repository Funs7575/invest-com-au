import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  IMPERSONATE_COOKIE,
  buildClearImpersonateCookieAttrs,
  buildImpersonateCookieAttrs,
} from "@/lib/admin-impersonation";

describe("buildImpersonateCookieAttrs", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the correct cookie name", () => {
    expect(IMPERSONATE_COOKIE).toBe("iv_impersonate");
  });

  it("sets HttpOnly + SameSite=Lax + 1h max-age", () => {
    const cookie = buildImpersonateCookieAttrs(42);
    expect(cookie).toContain("iv_impersonate=42");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=3600");
  });

  it("omits Secure outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(buildImpersonateCookieAttrs(42)).not.toContain("Secure");
  });

  it("includes Secure in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(buildImpersonateCookieAttrs(42)).toContain("Secure");
  });
});

describe("buildClearImpersonateCookieAttrs", () => {
  it("zeros the value and sets Max-Age=0", () => {
    const cookie = buildClearImpersonateCookieAttrs();
    expect(cookie).toContain("iv_impersonate=;");
    expect(cookie).toContain("Max-Age=0");
  });
});
