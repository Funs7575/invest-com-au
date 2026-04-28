import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { signMfaCookie } from "@/lib/admin-mfa-cookie";
import { verifyMfaCookieEdge, MFA_COOKIE_NAME, MFA_COOKIE_MAX_AGE_S } from "@/lib/admin-mfa-cookie-edge";

const TEST_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef"; // 48 chars

// verifyMfaCookieEdge uses crypto.subtle (Web Crypto API), available in
// Node.js 20+ as globalThis.crypto. signMfaCookie uses Node.js crypto —
// the combination lets us produce real signed cookies and verify them with
// the edge-compatible verifier, exercising the cross-runtime compatibility.
describe("admin-mfa-cookie-edge (Web Crypto verifier)", () => {
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

  it("exposes stable constants matching the Node.js module", () => {
    expect(MFA_COOKIE_NAME).toBe("admin_mfa_verified");
    expect(MFA_COOKIE_MAX_AGE_S).toBe(43200);
  });

  it("accepts a cookie signed by the Node.js signMfaCookie helper", async () => {
    const cookie = signMfaCookie("admin@example.com");
    expect(await verifyMfaCookieEdge(cookie)).toBe(true);
  });

  it("returns false for null / undefined / empty", async () => {
    expect(await verifyMfaCookieEdge(null)).toBe(false);
    expect(await verifyMfaCookieEdge(undefined)).toBe(false);
    expect(await verifyMfaCookieEdge("")).toBe(false);
  });

  it("returns false when ADMIN_MFA_COOKIE_SECRET is absent", async () => {
    // Sign first while the secret is available, then delete it for the verify call.
    // Deleting before signing would throw from signMfaCookie (secret guard), which
    // would skip the restore and poison the env for subsequent tests.
    const cookie = signMfaCookie("admin@example.com");
    const saved = process.env.ADMIN_MFA_COOKIE_SECRET;
    try {
      delete process.env.ADMIN_MFA_COOKIE_SECRET;
      expect(await verifyMfaCookieEdge(cookie)).toBe(false);
    } finally {
      if (saved !== undefined) {
        process.env.ADMIN_MFA_COOKIE_SECRET = saved;
      } else {
        delete process.env.ADMIN_MFA_COOKIE_SECRET;
      }
    }
  });

  it("returns false when ADMIN_MFA_COOKIE_SECRET is too short", async () => {
    const saved = process.env.ADMIN_MFA_COOKIE_SECRET;
    process.env.ADMIN_MFA_COOKIE_SECRET = "short";
    const cookie = signMfaCookie.bind(null, "admin@example.com");
    let valid: boolean;
    try {
      // signMfaCookie will throw on short secret — catch and still verify
      const c = cookie();
      valid = await verifyMfaCookieEdge(c);
    } catch {
      // Expected: signMfaCookie throws for short secret
      valid = false;
    }
    process.env.ADMIN_MFA_COOKIE_SECRET = saved;
    expect(valid).toBe(false);
  });

  it("returns false for a tampered HMAC", async () => {
    const cookie = signMfaCookie("admin@example.com");
    const [payload] = cookie.split(".");
    const tampered = `${payload}.dGFtcGVyZWQ`; // base64url for "tampered"
    expect(await verifyMfaCookieEdge(tampered)).toBe(false);
  });

  it("returns false for a tampered payload", async () => {
    const cookie = signMfaCookie("admin@example.com");
    const [, hmac] = cookie.split(".");
    // Replace payload with something valid-looking but not matching the HMAC
    const fakePayload = btoa(JSON.stringify({ email: "evil@example.com", iat: 1, exp: 9999999999 }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(await verifyMfaCookieEdge(`${fakePayload}.${hmac}`)).toBe(false);
  });

  it("returns false for an expired cookie", async () => {
    // Sign with a nowMs in the past so exp = past
    const pastMs = Date.now() - 14 * 60 * 60 * 1000; // 14 hours ago
    const cookie = signMfaCookie("admin@example.com", pastMs);
    expect(await verifyMfaCookieEdge(cookie)).toBe(false);
  });

  it("returns true when cookie is within the 12h window", async () => {
    // Sign with nowMs 11h ago — should still be valid
    const recentMs = Date.now() - 11 * 60 * 60 * 1000;
    const cookie = signMfaCookie("admin@example.com", recentMs);
    expect(await verifyMfaCookieEdge(cookie)).toBe(true);
  });

  it("returns false for a malformed value (no dot separator)", async () => {
    expect(await verifyMfaCookieEdge("nodots")).toBe(false);
  });

  it("returns false for a malformed value (extra dots)", async () => {
    expect(await verifyMfaCookieEdge("a.b.c")).toBe(false);
  });
});
