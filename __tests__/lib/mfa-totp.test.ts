import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  buildOtpAuthUrl,
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCode,
} from "@/lib/mfa-totp";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  // 32-byte key encoded as 64 hex chars
  process.env.ADMIN_MFA_KEY = crypto.randomBytes(32).toString("hex");
});

afterEach(() => {
  for (const k of Object.keys(process.env)) delete process.env[k];
  Object.assign(process.env, ORIGINAL_ENV);
});

describe("base32", () => {
  it("round-trips an arbitrary byte buffer", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const encoded = base32Encode(bytes);
    const decoded = base32Decode(encoded);
    expect(decoded).toEqual(bytes);
  });

  it("encodes an empty buffer to an empty string", () => {
    expect(base32Encode(new Uint8Array())).toBe("");
  });

  it("is tolerant of lowercase + spaces on decode", () => {
    const bytes = new Uint8Array([0xff, 0x00, 0xaa]);
    const encoded = base32Encode(bytes);
    const decoded = base32Decode(encoded.toLowerCase().split("").join(" "));
    expect(decoded).toEqual(bytes);
  });

  it("throws on an invalid base32 character", () => {
    expect(() => base32Decode("1234!@#$")).toThrow(/invalid/);
  });
});

describe("generateTotpSecret", () => {
  it("returns a base32 string", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
  });

  it("produces at least 160 bits of entropy (default 20 bytes)", () => {
    // 20 bytes → ceil(20*8/5) = 32 base32 chars
    expect(generateTotpSecret().length).toBe(32);
  });

  it("generates different secrets each call", () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(a).not.toBe(b);
  });
});

describe("generateTotpCode — RFC 6238 reference vectors", () => {
  // RFC 6238 Appendix B test vectors (SHA-1, seed "12345678901234567890")
  const SECRET_BYTES = Buffer.from("12345678901234567890", "ascii");
  const SECRET_B32 = base32Encode(SECRET_BYTES);

  it("returns 6 digits", () => {
    const code = generateTotpCode(SECRET_B32);
    expect(code).toMatch(/^\d{6}$/);
  });

  it("matches RFC 6238 vector at T=59 (SHA-1 → 94287082 → 287082)", () => {
    const code = generateTotpCode(SECRET_B32, 59);
    expect(code).toBe("287082");
  });

  it("matches RFC 6238 vector at T=1111111109 → 07081804 → 081804", () => {
    const code = generateTotpCode(SECRET_B32, 1111111109);
    expect(code).toBe("081804");
  });

  it("different timestamps (>30s apart) produce different codes", () => {
    const a = generateTotpCode(SECRET_B32, 1_000_000);
    const b = generateTotpCode(SECRET_B32, 1_000_060);
    expect(a).not.toBe(b);
  });
});

describe("verifyTotpCode", () => {
  it("accepts the code at the exact time", () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000;
    const code = generateTotpCode(secret, now);
    expect(verifyTotpCode(secret, code, now)).toBe(true);
  });

  it("tolerates a ±30s drift", () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000;
    const past = generateTotpCode(secret, now - 30);
    const future = generateTotpCode(secret, now + 30);
    expect(verifyTotpCode(secret, past, now)).toBe(true);
    expect(verifyTotpCode(secret, future, now)).toBe(true);
  });

  it("rejects a code from more than one window ago", () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000;
    const stale = generateTotpCode(secret, now - 120);
    expect(verifyTotpCode(secret, stale, now)).toBe(false);
  });

  it("rejects an obviously wrong code", () => {
    expect(verifyTotpCode(generateTotpSecret(), "000000")).toBe(false);
  });

  it("rejects non-6-digit input", () => {
    const secret = generateTotpSecret();
    expect(verifyTotpCode(secret, "abcdef")).toBe(false);
    expect(verifyTotpCode(secret, "12345")).toBe(false);
    expect(verifyTotpCode(secret, "1234567")).toBe(false);
  });
});

describe("buildOtpAuthUrl", () => {
  it("returns a valid otpauth:// URL", () => {
    const url = buildOtpAuthUrl("Invest.com.au", "admin@example.com", "ABCDEF234567");
    expect(url.startsWith("otpauth://totp/")).toBe(true);
    expect(url).toContain("secret=ABCDEF234567");
    expect(url).toContain("issuer=Invest.com.au");
  });

  it("URL-encodes the label", () => {
    const url = buildOtpAuthUrl("Invest.com.au", "alex+test@example.com", "ABC");
    expect(url).toContain("alex%2Btest");
  });
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a secret", () => {
    const original = generateTotpSecret();
    const envelope = encryptSecret(original);
    expect(envelope).toContain(":");
    expect(envelope).not.toContain(original); // never leak the plaintext
    const recovered = decryptSecret(envelope);
    expect(recovered).toBe(original);
  });

  it("throws on tamper (GCM integrity check)", () => {
    const envelope = encryptSecret("JBSWY3DPEHPK3PXP");
    const [iv, ct, tag] = envelope.split(":");
    // Flip one bit in the ciphertext
    const tampered = Buffer.from(ct, "base64");
    tampered[0] ^= 0x01;
    const bad = [iv, tampered.toString("base64"), tag].join(":");
    expect(() => decryptSecret(bad)).toThrow();
  });

  it("refuses to run without ADMIN_MFA_KEY", () => {
    delete process.env.ADMIN_MFA_KEY;
    expect(() => encryptSecret("hi")).toThrow(/ADMIN_MFA_KEY/);
  });

  it("accepts a 64-char hex key", () => {
    process.env.ADMIN_MFA_KEY = "00".repeat(32);
    expect(() => encryptSecret("hi")).not.toThrow();
  });

  it("accepts a base64 key", () => {
    process.env.ADMIN_MFA_KEY = crypto.randomBytes(32).toString("base64");
    expect(() => encryptSecret("hi")).not.toThrow();
  });
});

describe("recovery codes", () => {
  it("generates N unique codes", () => {
    const codes = generateRecoveryCodes(10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
  });

  it("codes look like xxxx-xxxx-xxxx", () => {
    for (const code of generateRecoveryCodes(3)) {
      expect(code).toMatch(/^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/);
    }
  });

  it("hashRecoveryCode is deterministic for the same pepper", () => {
    process.env.ADMIN_MFA_RECOVERY_PEPPER = "test-pepper";
    expect(hashRecoveryCode("abcd-efgh-ijkl")).toBe(hashRecoveryCode("abcd-efgh-ijkl"));
  });

  it("verifyRecoveryCode returns the matching index", () => {
    process.env.ADMIN_MFA_RECOVERY_PEPPER = "test-pepper";
    const codes = ["aaaa-bbbb-cccc", "1111-2222-3333"];
    const hashes = codes.map(hashRecoveryCode);
    expect(verifyRecoveryCode("1111-2222-3333", hashes)).toBe(1);
    expect(verifyRecoveryCode("aaaa-bbbb-cccc", hashes)).toBe(0);
  });

  it("returns -1 for a miss", () => {
    process.env.ADMIN_MFA_RECOVERY_PEPPER = "test-pepper";
    const hashes = [hashRecoveryCode("real-code-xxxx")];
    expect(verifyRecoveryCode("fake-code-xxxx", hashes)).toBe(-1);
  });
});
