import { describe, expect, it, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { encryptToken, decryptToken } from "@/lib/sharesight/crypto";

const TEST_KEY_HEX = crypto.randomBytes(32).toString("hex");

describe("sharesight crypto envelope", () => {
  beforeEach(() => {
    process.env.INVESTOR_OAUTH_KEY = TEST_KEY_HEX;
  });
  afterEach(() => {
    delete process.env.INVESTOR_OAUTH_KEY;
  });

  it("round-trips a plaintext token", () => {
    const env = encryptToken("hunter2");
    expect(env.split(":")).toHaveLength(3);
    expect(decryptToken(env)).toBe("hunter2");
  });

  it("produces a different envelope each call (IV randomness)", () => {
    const a = encryptToken("same");
    const b = encryptToken("same");
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe("same");
    expect(decryptToken(b)).toBe("same");
  });

  it("throws on tampered ciphertext (GCM auth tag check)", () => {
    const env = encryptToken("secret");
    const [iv, ct, tag] = env.split(":");
    const flipped = Buffer.from(ct!, "base64");
    flipped[0] ^= 0xff;
    const tampered = `${iv}:${flipped.toString("base64")}:${tag}`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("throws on a malformed envelope", () => {
    expect(() => decryptToken("notanenvelope")).toThrow(/malformed/i);
    expect(() => decryptToken("a:b")).toThrow(/malformed/i);
  });

  it("refuses to operate without the key env var", () => {
    delete process.env.INVESTOR_OAUTH_KEY;
    expect(() => encryptToken("x")).toThrow(/INVESTOR_OAUTH_KEY/);
    expect(() => decryptToken("a:b:c")).toThrow(/INVESTOR_OAUTH_KEY/);
  });

  it("accepts base64-encoded 32-byte keys", () => {
    process.env.INVESTOR_OAUTH_KEY = crypto.randomBytes(32).toString("base64");
    const env = encryptToken("via-base64");
    expect(decryptToken(env)).toBe("via-base64");
  });
});
