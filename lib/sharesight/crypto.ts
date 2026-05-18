/**
 * AES-256-GCM envelope for Sharesight (and future provider) OAuth tokens.
 *
 * Mirrors the pattern in `lib/mfa-totp.ts` but with a separate key
 * (`INVESTOR_OAUTH_KEY`) so a compromise of the MFA key doesn't bleed
 * into investor tokens and vice versa. Format identical so future ops
 * tooling can share envelope inspection code if useful.
 *
 *   <iv(12 bytes base64)>:<ciphertext base64>:<tag(16 bytes base64)>
 *
 * If the key isn't set, throws — refuse to write a "secret" that's
 * actually plaintext, refuse to "decrypt" something that was never
 * encrypted.
 */
import crypto from "node:crypto";

export function encryptToken(plaintext: string, key?: Buffer): string {
  const keyBytes = key ?? loadKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBytes, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), ct.toString("base64"), tag.toString("base64")].join(":");
}

export function decryptToken(envelope: string, key?: Buffer): string {
  const keyBytes = key ?? loadKey();
  const [ivB64, ctB64, tagB64] = envelope.split(":");
  if (!ivB64 || !ctB64 || !tagB64) {
    throw new Error("malformed OAuth token envelope");
  }
  const iv = Buffer.from(ivB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBytes, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

function loadKey(): Buffer {
  const raw = process.env.INVESTOR_OAUTH_KEY;
  if (!raw) {
    throw new Error("INVESTOR_OAUTH_KEY env var is required for OAuth token encryption");
  }
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 32) {
    throw new Error("INVESTOR_OAUTH_KEY must decode to exactly 32 bytes (hex or base64)");
  }
  return decoded;
}
