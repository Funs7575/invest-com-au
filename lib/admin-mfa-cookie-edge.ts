/**
 * Edge-runtime compatible variant of admin-mfa-cookie.ts.
 *
 * proxy.ts runs in Next.js Edge Runtime which has the Web Crypto API
 * (crypto.subtle) but NOT the Node.js crypto module (createHmac,
 * timingSafeEqual). This module re-implements the verification using
 * crypto.subtle so the proxy gate can check the cookie on every admin
 * request without pulling in Node.js APIs.
 *
 * The signing half (signMfaCookie) stays in admin-mfa-cookie.ts — only
 * the verify route (Node.js runtime) issues cookies, so no signing here.
 */

export const MFA_COOKIE_NAME = "admin_mfa_verified";
export const MFA_COOKIE_MAX_AGE_S = 12 * 60 * 60; // 12 hours

function b64urlToBytes(s: string) {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? 0 : 4 - (padded.length % 4);
  const b64 = padded + "=".repeat(padding);
  const bin = atob(b64);
  // `Uint8Array.from` returns `Uint8Array<ArrayBuffer>`, which satisfies
  // `BufferSource` for `crypto.subtle.verify`. Annotating as plain
  // `Uint8Array` would widen to `Uint8Array<ArrayBufferLike>` and TS 5.7+
  // rejects that.
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/**
 * Verify admin_mfa_verified cookie using Web Crypto (Edge-compatible).
 * Returns true if the signature is valid and the cookie is not expired.
 * Never throws — returns false on any error so the gate always fails closed.
 */
export async function verifyMfaCookieEdge(
  value: string | undefined | null,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (!value) return false;

  const secret = process.env.ADMIN_MFA_COOKIE_SECRET;
  if (!secret || secret.length < 32) {
    // Missing/short secret — fail closed. In dev this means every admin
    // request redirects to /admin/mfa/verify until the secret is set.
    return false;
  }

  const parts = value.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, hmacB64] = parts as [string, string];

  let hmacBytes: ReturnType<typeof b64urlToBytes>;
  try {
    hmacBytes = b64urlToBytes(hmacB64);
  } catch {
    return false;
  }

  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
  } catch {
    return false;
  }

  let valid: boolean;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      key,
      hmacBytes,
      new TextEncoder().encode(payloadB64),
    );
  } catch {
    return false;
  }
  if (!valid) return false;

  // Decode payload and check expiry.
  let payload: { email?: unknown; iat?: unknown; exp?: unknown };
  try {
    const decoded = new TextDecoder().decode(b64urlToBytes(payloadB64));
    payload = JSON.parse(decoded) as { email?: unknown; iat?: unknown; exp?: unknown };
  } catch {
    return false;
  }
  if (
    typeof payload.email !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    return false;
  }

  const nowS = Math.floor(nowMs / 1000);
  return nowS < payload.exp;
}
