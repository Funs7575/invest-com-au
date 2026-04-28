import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  signMfaCookie,
  verifyMfaCookie,
  MFA_COOKIE_NAME,
  MFA_COOKIE_MAX_AGE_S,
} from "@/lib/admin-mfa-cookie";

const TEST_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef"; // 48 chars

describe("admin-mfa-cookie", () => {
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

  it("exposes a stable cookie name + 12h TTL", () => {
    expect(MFA_COOKIE_NAME).toBe("admin_mfa_verified");
    expect(MFA_COOKIE_MAX_AGE_S).toBe(43200);
  });

  it("round-trips a signed cookie", () => {
    const cookie = signMfaCookie("admin@example.com");
    const result = verifyMfaCookie(cookie);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.email).toBe("admin@example.com");
  });

  it("normalises email to lowercase", () => {
    const cookie = signMfaCookie("Admin@Example.COM");
    const result = verifyMfaCookie(cookie);
    if (result.ok) expect(result.email).toBe("admin@example.com");
  });

  it("rejects missing cookie", () => {
    const r1 = verifyMfaCookie(undefined);
    const r2 = verifyMfaCookie(null);
    const r3 = verifyMfaCookie("");
    expect(r1).toEqual({ ok: false, reason: "missing" });
    expect(r2).toEqual({ ok: false, reason: "missing" });
    expect(r3).toEqual({ ok: false, reason: "missing" });
  });

  it("rejects malformed cookie (no dot)", () => {
    const result = verifyMfaCookie("garbage");
    expect(result).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects malformed cookie (extra dots)", () => {
    const result = verifyMfaCookie("a.b.c");
    expect(result).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects tampered payload", () => {
    const cookie = signMfaCookie("admin@example.com");
    // Replace payload with a different payload, keep original HMAC.
    const [, hmac] = cookie.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        email: "attacker@evil.com",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
      "utf8",
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const tampered = `${tamperedPayload}.${hmac}`;
    const result = verifyMfaCookie(tampered);
    expect(result).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects tampered HMAC", () => {
    const cookie = signMfaCookie("admin@example.com");
    const [payload] = cookie.split(".");
    const tampered = `${payload}.${"A".repeat(43)}`; // bogus HMAC
    const result = verifyMfaCookie(tampered);
    // Either bad_signature (if base64 parses) or malformed (if it doesn't).
    expect(["bad_signature", "malformed"]).toContain(
      result.ok ? "" : result.reason,
    );
  });

  it("rejects expired cookie", () => {
    const past = Date.now() - 13 * 60 * 60 * 1000; // 13h ago
    const cookie = signMfaCookie("admin@example.com", past);
    const result = verifyMfaCookie(cookie);
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("accepts cookie one second before expiry", () => {
    // sign at now-12h+1s so it's still 1s within window
    const issued = Date.now() - (MFA_COOKIE_MAX_AGE_S - 1) * 1000;
    const cookie = signMfaCookie("admin@example.com", issued);
    const result = verifyMfaCookie(cookie);
    expect(result.ok).toBe(true);
  });

  it("rejects when secret is missing", () => {
    const original = process.env.ADMIN_MFA_COOKIE_SECRET;
    delete process.env.ADMIN_MFA_COOKIE_SECRET;
    // Sign was done with the test secret; verify now has no secret.
    process.env.ADMIN_MFA_COOKIE_SECRET = TEST_SECRET;
    const cookie = signMfaCookie("admin@example.com");
    delete process.env.ADMIN_MFA_COOKIE_SECRET;
    const result = verifyMfaCookie(cookie);
    expect(result).toEqual({ ok: false, reason: "no_secret" });
    process.env.ADMIN_MFA_COOKIE_SECRET = original ?? TEST_SECRET;
  });

  it("refuses to sign when secret is too short", () => {
    const original = process.env.ADMIN_MFA_COOKIE_SECRET;
    process.env.ADMIN_MFA_COOKIE_SECRET = "short";
    expect(() => signMfaCookie("admin@example.com")).toThrow(/≥32/);
    process.env.ADMIN_MFA_COOKIE_SECRET = original ?? TEST_SECRET;
  });

  it("rejects cookie signed with a different secret", () => {
    const cookie = signMfaCookie("admin@example.com");
    const original = process.env.ADMIN_MFA_COOKIE_SECRET;
    // Rotate secret — old cookie should now be invalid.
    process.env.ADMIN_MFA_COOKIE_SECRET =
      "ffffffffffffffffffffffffffffffffffffffffffffffff";
    const result = verifyMfaCookie(cookie);
    expect(result).toEqual({ ok: false, reason: "bad_signature" });
    process.env.ADMIN_MFA_COOKIE_SECRET = original ?? TEST_SECRET;
  });
});
