/**
 * AES-256-GCM envelope for OAuth tokens stored in
 * `investor_oauth_connections.access_token_enc` / `refresh_token_enc`.
 *
 * Mirrors the pattern in lib/mfa-totp.ts but keyed off a separate env var
 * (`SHARESIGHT_TOKEN_KEY`) so rotating one doesn't invalidate the other.
 * Falls back to `OAUTH_TOKEN_KEY` if Sharesight-specific key is missing —
 * other future investor OAuth providers (CDR, broker APIs) can share the
 * fallback key without needing per-provider env entries.
 *
 * Envelope format: <iv(12 bytes b64)>:<ciphertext b64>:<tag(16 bytes b64)>
 *
 * Throws if neither env var is set — refuses to write a "token" that's
 * actually plaintext, which would defeat the whole point of the `_enc`
 * column suffix.
 */
import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

export function encryptToken(plaintext: string, key?: Buffer): string {
  const keyBytes = key || loadKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, keyBytes, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    ciphertext.toString("base64"),
    tag.toString("base64"),
  ].join(":");
}

export function decryptToken(envelope: string, key?: Buffer): string {
  const keyBytes = key || loadKey();
  const parts = envelope.split(":");
  if (parts.length !== 3) {
    throw new Error("malformed OAuth token envelope");
  }
  const [ivB64, ctB64, tagB64] = parts;
  if (!ivB64 || !ctB64 || !tagB64) {
    throw new Error("malformed OAuth token envelope");
  }
  const iv = Buffer.from(ivB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, keyBytes, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plaintext.toString("utf8");
}

function loadKey(): Buffer {
  const raw =
    process.env.SHARESIGHT_TOKEN_KEY || process.env.OAUTH_TOKEN_KEY || "";
  if (!raw) {
    throw new Error(
      "SHARESIGHT_TOKEN_KEY (or OAUTH_TOKEN_KEY fallback) env var is required for OAuth token encryption",
    );
  }
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 32) {
    throw new Error(
      "SHARESIGHT_TOKEN_KEY must decode to exactly 32 bytes (64-char hex or 44-char base64)",
    );
  }
  return decoded;
}
