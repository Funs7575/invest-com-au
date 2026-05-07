import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  signListingOwnerCookie,
  verifyListingOwnerCookie,
  LISTING_OWNER_COOKIE_NAME,
  LISTING_OWNER_COOKIE_MAX_AGE_S,
} from "@/lib/listing-owner-cookie";

const TEST_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef"; // 48 chars

describe("listing-owner-cookie", () => {
  let originalSecret: string | undefined;

  beforeAll(() => {
    originalSecret = process.env.LISTING_OWNER_COOKIE_SECRET;
    process.env.LISTING_OWNER_COOKIE_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.LISTING_OWNER_COOKIE_SECRET;
    } else {
      process.env.LISTING_OWNER_COOKIE_SECRET = originalSecret;
    }
  });

  it("exposes a stable cookie name + 1h TTL", () => {
    expect(LISTING_OWNER_COOKIE_NAME).toBe("listing_owner_verified");
    expect(LISTING_OWNER_COOKIE_MAX_AGE_S).toBe(3600);
  });

  it("round-trips a signed cookie", () => {
    const cookie = signListingOwnerCookie("owner@example.com");
    const result = verifyListingOwnerCookie(cookie);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.email).toBe("owner@example.com");
  });

  it("normalises email to lowercase + trims whitespace", () => {
    const cookie = signListingOwnerCookie("  Owner@Example.COM  ");
    const result = verifyListingOwnerCookie(cookie);
    if (result.ok) expect(result.email).toBe("owner@example.com");
  });

  it("rejects missing cookie", () => {
    expect(verifyListingOwnerCookie(undefined)).toEqual({
      ok: false,
      reason: "missing",
    });
    expect(verifyListingOwnerCookie(null)).toEqual({
      ok: false,
      reason: "missing",
    });
    expect(verifyListingOwnerCookie("")).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("rejects malformed cookie (no dot)", () => {
    expect(verifyListingOwnerCookie("garbage")).toEqual({
      ok: false,
      reason: "malformed",
    });
  });

  it("rejects malformed cookie (extra dots)", () => {
    expect(verifyListingOwnerCookie("a.b.c")).toEqual({
      ok: false,
      reason: "malformed",
    });
  });

  it("rejects tampered HMAC", () => {
    const cookie = signListingOwnerCookie("owner@example.com");
    const [payload, hmac] = cookie.split(".");
    const tamperedHmac =
      hmac && hmac.length > 0
        ? (hmac[0] === "A" ? "B" : "A") + hmac.slice(1)
        : "AAAA";
    const result = verifyListingOwnerCookie(`${payload}.${tamperedHmac}`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["bad_signature", "malformed"]).toContain(result.reason);
    }
  });

  it("rejects tampered payload (HMAC won't match)", () => {
    const cookie = signListingOwnerCookie("owner@example.com");
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
    const result = verifyListingOwnerCookie(`${tamperedPayload}.${hmac}`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_signature");
  });

  it("rejects expired cookie", () => {
    const expiredAt = Date.now() - (LISTING_OWNER_COOKIE_MAX_AGE_S + 60) * 1000;
    const cookie = signListingOwnerCookie("owner@example.com", expiredAt);
    const result = verifyListingOwnerCookie(cookie);
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("accepts cookie just inside the validity window", () => {
    const issuedAt = Date.now() - (LISTING_OWNER_COOKIE_MAX_AGE_S - 30) * 1000;
    const cookie = signListingOwnerCookie("owner@example.com", issuedAt);
    const result = verifyListingOwnerCookie(cookie);
    expect(result.ok).toBe(true);
  });

  it("rejects cookie at exact expiry boundary (>= exp is expired)", () => {
    const issuedAt = Date.now() - LISTING_OWNER_COOKIE_MAX_AGE_S * 1000;
    const cookie = signListingOwnerCookie("owner@example.com", issuedAt);
    const result = verifyListingOwnerCookie(cookie);
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("enforces expectedEmail when provided", () => {
    const cookie = signListingOwnerCookie("victim@example.com");
    const matchResult = verifyListingOwnerCookie(cookie, {
      expectedEmail: "victim@example.com",
    });
    expect(matchResult.ok).toBe(true);

    const mismatchResult = verifyListingOwnerCookie(cookie, {
      expectedEmail: "attacker@example.com",
    });
    expect(mismatchResult).toEqual({ ok: false, reason: "email_mismatch" });
  });

  it("expectedEmail comparison is case-insensitive + trims", () => {
    const cookie = signListingOwnerCookie("owner@example.com");
    const result = verifyListingOwnerCookie(cookie, {
      expectedEmail: "  Owner@Example.COM  ",
    });
    expect(result.ok).toBe(true);
  });

  it("returns no_secret when env var missing", () => {
    const original = process.env.LISTING_OWNER_COOKIE_SECRET;
    delete process.env.LISTING_OWNER_COOKIE_SECRET;
    const result = verifyListingOwnerCookie("anything.here");
    expect(result).toEqual({ ok: false, reason: "no_secret" });
    process.env.LISTING_OWNER_COOKIE_SECRET = original;
  });

  it("throws on sign when env var missing", () => {
    const original = process.env.LISTING_OWNER_COOKIE_SECRET;
    delete process.env.LISTING_OWNER_COOKIE_SECRET;
    expect(() => signListingOwnerCookie("owner@example.com")).toThrow(
      /LISTING_OWNER_COOKIE_SECRET/,
    );
    process.env.LISTING_OWNER_COOKIE_SECRET = original;
  });

  it("throws on sign when env var is too short", () => {
    const original = process.env.LISTING_OWNER_COOKIE_SECRET;
    process.env.LISTING_OWNER_COOKIE_SECRET = "tooshort";
    expect(() => signListingOwnerCookie("owner@example.com")).toThrow(
      /≥32 characters/,
    );
    if (original !== undefined) {
      process.env.LISTING_OWNER_COOKIE_SECRET = original;
    }
  });

  it("rejects cookie signed with a different secret", () => {
    const original = process.env.LISTING_OWNER_COOKIE_SECRET;
    process.env.LISTING_OWNER_COOKIE_SECRET =
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const cookie = signListingOwnerCookie("owner@example.com");
    process.env.LISTING_OWNER_COOKIE_SECRET = TEST_SECRET;
    const result = verifyListingOwnerCookie(cookie);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_signature");
    if (original !== undefined) {
      process.env.LISTING_OWNER_COOKIE_SECRET = original;
    }
  });
});
