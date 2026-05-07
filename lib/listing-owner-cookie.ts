/**
 * Signed `listing_owner_verified` cookie issuance + verification.
 *
 * Once a listing owner proves possession of their listing's contact
 * email by completing the OTP challenge at
 * /api/listings/my-listings/verify, this module issues an HMAC-signed
 * cookie that /api/listings/my-listings checks on every subsequent
 * request. The cookie is HttpOnly + SameSite=Strict + Secure (in
 * prod) and lasts 1 hour.
 *
 * Format: `<base64url(payload)>.<base64url(hmac)>`
 *   payload: { email: string, iat: number, exp: number }
 *   hmac:    HMAC-SHA-256(payload, LISTING_OWNER_COOKIE_SECRET)
 *
 * The cookie is opaque to clients — the value is the only thing that
 * matters; we never trust client-supplied claims because everything
 * is re-validated against the HMAC.
 *
 * Why a separate cookie from admin-mfa-cookie:
 *   - Different secret rotation cadence + scope (anonymous listing
 *     owners ≠ authenticated admins).
 *   - Different TTL (1h vs 12h) — listing-owner sessions are short
 *     because the email is the only auth factor; admin-mfa is layered
 *     on top of an existing Supabase Auth session.
 *   - Different blast radius if leaked: this cookie only unlocks one
 *     listing owner's enquiries, admin cookie unlocks /admin/**.
 *
 * SECURITY: LISTING_OWNER_COOKIE_SECRET must be ≥32 random bytes.
 * Rotate by setting a new secret + invalidating all sessions; owners
 * will have to re-verify (1h is the worst case anyway). On secret
 * absence, this module REFUSES to sign or verify rather than falling
 * back to a default — silent fallback would hide misconfiguration in
 * prod and silently undermine the B-09 gate.
 *
 * Audit ref: docs/audits/REMEDIATION_QUEUE.md B-09a (route + OTP gate
 * for /api/listings/my-listings).
 */

import { createHmac, timingSafeEqual } from "crypto";

export const LISTING_OWNER_COOKIE_NAME = "listing_owner_verified";
export const LISTING_OWNER_COOKIE_MAX_AGE_S = 60 * 60; // 1 hour

interface ListingOwnerCookiePayload {
  email: string;
  iat: number;
  exp: number;
}

export type ListingOwnerVerifyResult =
  | { ok: true; email: string }
  | {
      ok: false;
      reason:
        | "missing"
        | "malformed"
        | "bad_signature"
        | "expired"
        | "no_secret"
        | "email_mismatch";
    };

function getSecret(): string {
  const secret = process.env.LISTING_OWNER_COOKIE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "LISTING_OWNER_COOKIE_SECRET must be set to ≥32 characters. " +
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
 * Build a signed cookie value for the given listing-owner email.
 * Caller is responsible for setting the cookie on the response with
 * HttpOnly + SameSite=Strict + Secure (prod) +
 * Max-Age=LISTING_OWNER_COOKIE_MAX_AGE_S.
 */
export function signListingOwnerCookie(
  email: string,
  nowMs: number = Date.now(),
): string {
  const secret = getSecret();
  const iat = Math.floor(nowMs / 1000);
  const exp = iat + LISTING_OWNER_COOKIE_MAX_AGE_S;
  const payload: ListingOwnerCookiePayload = {
    email: email.toLowerCase().trim(),
    iat,
    exp,
  };
  const payloadB64 = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const hmac = createHmac("sha256", secret).update(payloadB64).digest();
  const hmacB64 = b64urlEncode(hmac);
  return `${payloadB64}.${hmacB64}`;
}

/**
 * Verify a cookie value. Returns the verified email on success or a
 * structured rejection reason. Uses constant-time HMAC compare so
 * timing leaks don't tell an attacker which byte mismatched.
 *
 * If `expectedEmail` is provided, the verified payload email must
 * match (after normalisation). This guards against a caller swapping
 * the `email` query param while reusing a cookie issued for a
 * different address.
 */
export function verifyListingOwnerCookie(
  value: string | undefined | null,
  options: { expectedEmail?: string; nowMs?: number } = {},
): ListingOwnerVerifyResult {
  const nowMs = options.nowMs ?? Date.now();
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
  if (!payloadB64 || !hmacB64) {
    return { ok: false, reason: "malformed" };
  }

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
  let payload: ListingOwnerCookiePayload;
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

  if (
    options.expectedEmail !== undefined &&
    payload.email !== options.expectedEmail.toLowerCase().trim()
  ) {
    return { ok: false, reason: "email_mismatch" };
  }

  return { ok: true, email: payload.email };
}
