/**
 * Signed `admin_mfa_verified` cookie issuance + verification.
 *
 * Once an admin proves possession of their TOTP / recovery code at
 * /api/admin/mfa/verify, this module issues an HMAC-signed cookie
 * that proxy.ts checks on every subsequent /admin/** request. The
 * cookie is HttpOnly + SameSite=Strict + Secure (in prod) and lasts
 * 12 hours.
 *
 * Format: `<base64url(payload)>.<base64url(hmac)>`
 *   payload: { email: string, iat: number, exp: number }
 *   hmac:    HMAC-SHA-256(payload, ADMIN_MFA_COOKIE_SECRET)
 *
 * The cookie is opaque to clients — the value is the only thing that
 * matters; we never trust client-supplied claims because everything
 * is re-validated against the HMAC.
 *
 * SECURITY: ADMIN_MFA_COOKIE_SECRET must be ≥32 random bytes. Rotate
 * by setting a new secret + invalidating all sessions; admins will
 * have to re-verify (12h is the worst case anyway). On secret
 * absence, this module REFUSES to sign or verify rather than falling
 * back to a default — silent fallback would hide misconfiguration in
 * prod.
 */

import { createHmac, timingSafeEqual } from "crypto";

export const MFA_COOKIE_NAME = "admin_mfa_verified";
export const MFA_COOKIE_MAX_AGE_S = 12 * 60 * 60; // 12 hours

interface MfaCookiePayload {
  email: string;
  iat: number;
  exp: number;
}

export type VerifyResult =
  | { ok: true; email: string }
  | { ok: false; reason: "missing" | "malformed" | "bad_signature" | "expired" | "no_secret" };

function getSecret(): string {
  const secret = process.env.ADMIN_MFA_COOKIE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_MFA_COOKIE_SECRET must be set to ≥32 characters. " +
        "Generate with: openssl rand -hex 32",
    );
  }
  return secret;
}

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? 0 : 4 - (padded.length % 4);
  return Buffer.from(padded + "=".repeat(padding), "base64");
}

/**
 * Build a signed cookie value for the given admin email. Caller is
 * responsible for setting the cookie on the response with HttpOnly +
 * SameSite=Strict + Secure (prod) + Max-Age=MFA_COOKIE_MAX_AGE_S.
 */
export function signMfaCookie(email: string, nowMs: number = Date.now()): string {
  const secret = getSecret();
  const iat = Math.floor(nowMs / 1000);
  const exp = iat + MFA_COOKIE_MAX_AGE_S;
  const payload: MfaCookiePayload = { email: email.toLowerCase(), iat, exp };
  const payloadB64 = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const hmac = createHmac("sha256", secret).update(payloadB64).digest();
  const hmacB64 = b64urlEncode(hmac);
  return `${payloadB64}.${hmacB64}`;
}

/**
 * Verify a cookie value. Returns the verified email on success or a
 * structured rejection reason. Uses constant-time HMAC compare so
 * timing leaks don't tell an attacker which byte mismatched.
 */
export function verifyMfaCookie(
  value: string | undefined | null,
  nowMs: number = Date.now(),
): VerifyResult {
  if (!value) return { ok: false, reason: "missing" };

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return { ok: false, reason: "no_secret" };
  }

  const parts = value.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [payloadB64, hmacB64] = parts;

  // Recompute HMAC and constant-time compare.
  const expected = createHmac("sha256", secret).update(payloadB64).digest();
  let supplied: Buffer;
  try {
    supplied = b64urlDecode(hmacB64);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (supplied.length !== expected.length) {
    return { ok: false, reason: "bad_signature" };
  }
  if (!timingSafeEqual(expected, supplied)) {
    return { ok: false, reason: "bad_signature" };
  }

  // Parse payload.
  let payload: MfaCookiePayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (
    typeof payload?.email !== "string" ||
    typeof payload?.iat !== "number" ||
    typeof payload?.exp !== "number"
  ) {
    return { ok: false, reason: "malformed" };
  }

  const nowS = Math.floor(nowMs / 1000);
  if (nowS >= payload.exp) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, email: payload.email };
}
