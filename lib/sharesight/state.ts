/**
 * Signed-state helpers for the Sharesight OAuth round-trip (W2.11 / X5g).
 *
 * The OAuth state parameter is the canonical CSRF guard for authorization-
 * code flows: the IdP echoes whatever we send back to our callback, and we
 * verify the value came from us before exchanging the code for tokens.
 *
 * We sign the state as `<payloadB64>.<hmacB64>` using HMAC-SHA256, the same
 * shape `lib/admin-mfa-cookie.ts` uses for the admin MFA cookie. The
 * payload includes:
 *
 *   - `uid`  : the auth.users.id of the user initiating the connect
 *   - `iat`  : issued-at (unix seconds) so we can reject stale states
 *   - `nonce`: 16 random bytes b64url-encoded — prevents replay even within
 *              the TTL window
 *
 * `verifyState` returns a structured rejection rather than throwing so the
 * callback route can render a clean error page rather than a 500.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const STATE_TTL_S = 60 * 15; // 15 minutes — Sharesight consent screens are quick

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? 0 : 4 - (padded.length % 4);
  return Buffer.from(padded + "=".repeat(padding), "base64");
}

export interface StatePayload {
  uid: string;
  iat: number;
  nonce: string;
}

export function signState(uid: string, secret: string, nowMs = Date.now()): string {
  const payload: StatePayload = {
    uid,
    iat: Math.floor(nowMs / 1000),
    nonce: b64urlEncode(randomBytes(16)),
  };
  const payloadB64 = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const hmac = createHmac("sha256", secret).update(payloadB64).digest();
  return `${payloadB64}.${b64urlEncode(hmac)}`;
}

export type VerifyStateResult =
  | { ok: true; payload: StatePayload }
  | { ok: false; reason: "missing" | "malformed" | "bad_signature" | "expired" };

export function verifyState(
  state: string | null | undefined,
  secret: string,
  nowMs = Date.now(),
): VerifyStateResult {
  if (!state) return { ok: false, reason: "missing" };
  const parts = state.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [payloadB64, hmacB64] = parts;
  if (!payloadB64 || !hmacB64) return { ok: false, reason: "malformed" };

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

  let payload: StatePayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (
    typeof payload?.uid !== "string" ||
    typeof payload?.iat !== "number" ||
    typeof payload?.nonce !== "string"
  ) {
    return { ok: false, reason: "malformed" };
  }

  const nowS = Math.floor(nowMs / 1000);
  if (nowS - payload.iat > STATE_TTL_S) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, payload };
}
