import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "node:crypto";
import {
  encryptToken,
  decryptToken,
} from "@/lib/sharesight/token-crypto";

const HEX_KEY = "a".repeat(64);

describe("sharesight token-crypto", () => {
  beforeEach(() => {
    vi.stubEnv("SHARESIGHT_TOKEN_KEY", HEX_KEY);
    vi.stubEnv("OAUTH_TOKEN_KEY", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips an access token plaintext", () => {
    const plain = "abc.def.ghi-very-long-bearer-token";
    const env = encryptToken(plain);
    expect(env.split(":")).toHaveLength(3);
    expect(decryptToken(env)).toBe(plain);
  });

  it("two encryptions of the same plaintext yield different envelopes (IV randomness)", () => {
    const plain = "same-secret";
    const a = encryptToken(plain);
    const b = encryptToken(plain);
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe(plain);
    expect(decryptToken(b)).toBe(plain);
  });

  it("decryption fails on tampered ciphertext (GCM auth tag)", () => {
    const plain = "secret";
    const env = encryptToken(plain);
    const [iv, ct, tag] = env.split(":");
    const tampered = [iv, mutateBase64(ct!), tag].join(":");
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("throws on malformed envelope shape", () => {
    expect(() => decryptToken("only-two:parts")).toThrow(/malformed/);
  });

  it("supports base64 keys (32-byte payload)", () => {
    vi.stubEnv("SHARESIGHT_TOKEN_KEY", crypto.randomBytes(32).toString("base64"));
    const plain = "x";
    expect(decryptToken(encryptToken(plain))).toBe(plain);
  });

  it("rejects keys that don't decode to 32 bytes", () => {
    vi.stubEnv("SHARESIGHT_TOKEN_KEY", "too-short");
    expect(() => encryptToken("x")).toThrow(/32 bytes/);
  });

  it("falls back to OAUTH_TOKEN_KEY when SHARESIGHT_TOKEN_KEY is missing", () => {
    vi.stubEnv("SHARESIGHT_TOKEN_KEY", "");
    vi.stubEnv("OAUTH_TOKEN_KEY", "b".repeat(64));
    const plain = "fallback-works";
    expect(decryptToken(encryptToken(plain))).toBe(plain);
  });

  it("throws when no key env var is set at all", () => {
    vi.stubEnv("SHARESIGHT_TOKEN_KEY", "");
    vi.stubEnv("OAUTH_TOKEN_KEY", "");
    expect(() => encryptToken("x")).toThrow(/required/);
  });
});

function mutateBase64(b64: string): string {
  const buf = Buffer.from(b64, "base64");
  buf[0] = (buf[0] ?? 0) ^ 0xff;
  return buf.toString("base64");
}
