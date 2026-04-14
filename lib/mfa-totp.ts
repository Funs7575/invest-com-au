/**
 * TOTP (RFC 6238) implementation using node:crypto.
 *
 * Why not `speakeasy` or `otplib`: zero runtime deps, smaller
 * surface, and the core algorithm is ~60 lines. The interop is
 * standard RFC 6238 + RFC 4226 so any TOTP authenticator app
 * (Google Authenticator, Authy, 1Password, Bitwarden) works
 * against the same secret.
 *
 * Also includes:
 *   - Base32 encode/decode for the shared secret
 *   - otpauth:// URL builder so the enrollment page can display
 *     a QR code generated client-side
 *   - AES-256-GCM encrypt/decrypt helpers so the stored secret
 *     is unreadable even with full DB access
 *   - Recovery code generation + verification
 *
 * Everything is pure + unit tested. The DB write path lives in
 * lib/admin-mfa.ts which depends on this + Supabase.
 */

import crypto from "node:crypto";

// ─── Base32 (RFC 4648) ────────────────────────────────────────────

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encode an arbitrary byte buffer as an uppercase base32 string
 * without padding. The resulting string is what gets written into
 * the otpauth:// URL and scanned by authenticator apps.
 */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return out;
}

/**
 * Decode a base32 string (with or without padding) back to bytes.
 * Tolerant of lowercase + spaces — mobile keyboards love to rewrite
 * a secret the user is typing.
 */
export function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.toUpperCase().replace(/[\s=]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx < 0) throw new Error(`invalid base32 character: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

// ─── TOTP core ────────────────────────────────────────────────────

/**
 * Generate a fresh TOTP secret. Default 20 random bytes (160 bits)
 * encoded as base32 — matches RFC 6238 recommendation.
 */
export function generateTotpSecret(bytes = 20): string {
  const buf = crypto.randomBytes(bytes);
  return base32Encode(buf);
}

/**
 * Compute the TOTP code for a given secret + Unix time. Uses
 * HMAC-SHA1 per RFC 4226 (the default for Google Authenticator).
 * step defaults to 30s. digits defaults to 6.
 *
 * Returns a zero-padded numeric string.
 */
export function generateTotpCode(
  secret: string,
  atUnixSec: number = Math.floor(Date.now() / 1000),
  step = 30,
  digits = 6,
): string {
  const counter = Math.floor(atUnixSec / step);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));

  const key = Buffer.from(base32Decode(secret));
  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();

  // Dynamic truncation — RFC 4226 §5.3
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = binary % 10 ** digits;
  return code.toString().padStart(digits, "0");
}

/**
 * Verify a user-supplied TOTP code against a secret. Accepts the
 * current step + one step back + one step ahead to tolerate a
 * ±30s clock drift. Returns true if any window matches.
 *
 * Uses crypto.timingSafeEqual so a timing oracle can't distinguish
 * "wrong code" from "correct digits but wrong position".
 */
export function verifyTotpCode(
  secret: string,
  supplied: string,
  atUnixSec: number = Math.floor(Date.now() / 1000),
  step = 30,
  windowSize = 1,
): boolean {
  const clean = (supplied || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  for (let delta = -windowSize; delta <= windowSize; delta++) {
    const candidate = generateTotpCode(secret, atUnixSec + delta * step, step);
    if (candidate.length === clean.length) {
      try {
        if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(clean))) {
          return true;
        }
      } catch {
        // Length mismatch — skip
      }
    }
  }
  return false;
}

/**
 * Build an otpauth:// URI per the Google Authenticator key URI
 * format. Used by the enrollment page to render a QR code.
 *
 *   otpauth://totp/{issuer}:{account}?secret={b32}&issuer={issuer}&algorithm=SHA1&digits=6&period=30
 */
export function buildOtpAuthUrl(
  issuer: string,
  account: string,
  secret: string,
): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ─── AES-256-GCM envelope for the stored secret ───────────────────

/**
 * Encrypt a TOTP secret with the admin MFA encryption key pulled
 * from ADMIN_MFA_KEY. Format: <iv(12 bytes)>:<ciphertext>:<tag(16 bytes)>
 * all base64, joined with ":".
 *
 * If ADMIN_MFA_KEY is not set, throws — refuse to write a
 * "secret" that's actually plaintext.
 */
export function encryptSecret(plaintextSecret: string, key?: Buffer): string {
  const keyBytes = key || loadKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBytes, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintextSecret, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    ciphertext.toString("base64"),
    tag.toString("base64"),
  ].join(":");
}

/**
 * Decrypt the stored secret envelope. Throws on any tamper
 * (GCM integrity check failure) so a malformed row can never
 * yield a "looks valid but isn't" string.
 */
export function decryptSecret(envelope: string, key?: Buffer): string {
  const keyBytes = key || loadKey();
  const [ivB64, ctB64, tagB64] = envelope.split(":");
  if (!ivB64 || !ctB64 || !tagB64) {
    throw new Error("malformed MFA secret envelope");
  }
  const iv = Buffer.from(ivB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBytes, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plaintext.toString("utf8");
}

function loadKey(): Buffer {
  const raw = process.env.ADMIN_MFA_KEY;
  if (!raw) {
    throw new Error(
      "ADMIN_MFA_KEY env var is required for MFA encryption",
    );
  }
  // Accept either 64-char hex (32 bytes) or base64
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 32) {
    throw new Error("ADMIN_MFA_KEY must decode to exactly 32 bytes");
  }
  return decoded;
}

// ─── Recovery codes ───────────────────────────────────────────────

/**
 * Generate N fresh recovery codes. Each code is a human-friendly
 * grouping like `xxxx-xxxx-xxxx` (12 chars + 2 hyphens).
 */
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const rand = crypto.randomBytes(6).toString("hex"); // 12 hex chars
    codes.push(`${rand.slice(0, 4)}-${rand.slice(4, 8)}-${rand.slice(8, 12)}`);
  }
  return codes;
}

/**
 * Hash a recovery code for storage. SHA-256 with a fixed server
 * pepper so a rainbow-table attacker needs both the DB leak and
 * the pepper.
 */
export function hashRecoveryCode(code: string): string {
  const pepper = process.env.ADMIN_MFA_RECOVERY_PEPPER || "invest-com-au-v1";
  return crypto
    .createHash("sha256")
    .update(`${pepper}:${code.trim().toLowerCase()}`)
    .digest("hex");
}

/**
 * Verify a submitted recovery code against the stored hash array.
 * Returns the index of the match or -1. Callers should then
 * remove that index from the row so it can't be used twice.
 */
export function verifyRecoveryCode(
  supplied: string,
  storedHashes: readonly string[],
): number {
  const hash = hashRecoveryCode(supplied);
  for (let i = 0; i < storedHashes.length; i++) {
    try {
      if (
        storedHashes[i].length === hash.length &&
        crypto.timingSafeEqual(Buffer.from(storedHashes[i]), Buffer.from(hash))
      ) {
        return i;
      }
    } catch {
      // skip mismatched length
    }
  }
  return -1;
}
