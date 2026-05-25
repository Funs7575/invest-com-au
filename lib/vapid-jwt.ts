/**
 * vapid-jwt — RFC 8292 ES256 VAPID JWT builder.
 *
 * Builds a signed JSON Web Token for use in the VAPID Authorization header
 * when sending Web Push notifications. No npm dependency — uses the
 * Web Crypto API (globalThis.crypto.subtle) available in Node 20+ and the
 * Edge runtime.
 *
 * Usage:
 *   const jwt = await buildVapidJwt({
 *     endpoint:    "https://fcm.googleapis.com/fcm/send/…",
 *     privateKey:  process.env.VAPID_PRIVATE_KEY,   // base64url raw P-256 key
 *     subject:     process.env.VAPID_SUBJECT ?? "mailto:admin@invest.com.au",
 *   });
 *   // jwt is a base64url-encoded signed JWT string
 *
 *   // Then set the Authorization header:
 *   Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`
 *
 * Key format:
 *   VAPID_PRIVATE_KEY — the 32-byte P-256 private key scalar, base64url-encoded
 *   (the format produced by tools like `vapid-keygen` or `web-push generate-vapid-keys`).
 *
 * References:
 *   https://datatracker.ietf.org/doc/html/rfc8292
 *   https://datatracker.ietf.org/doc/html/rfc7519 (JWT)
 */

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Encode a Uint8Array as a base64url string (no padding, URL-safe alphabet).
 */
export function toBase64Url(bytes: Uint8Array): string {
  // In Node 20+ Buffer.from + toString is available; in Edge btoa is available.
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Decode a base64url string (with or without padding) to a Uint8Array.
 */
export function fromBase64Url(input: string): Uint8Array {
  // Restore standard base64 padding
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const b64 = padded + "=".repeat(padLen);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert a base64url-encoded JSON object to a base64url-encoded string.
 */
function encodeJwtPart(obj: Record<string, unknown>): string {
  const json = JSON.stringify(obj);
  const encoder = new TextEncoder();
  return toBase64Url(encoder.encode(json));
}

// ── VAPID JWT builder ──────────────────────────────────────────────────────────

export interface VapidJwtOptions {
  /** The full push endpoint URL (used to extract aud = scheme + host). */
  endpoint: string;
  /**
   * The raw 32-byte P-256 private key as a base64url string.
   * Produced by `web-push generate-vapid-keys` or equivalent.
   */
  privateKey: string;
  /**
   * JWT `sub` claim — must be a mailto: or https: URL identifying the
   * application server operator. Defaults to the VAPID_SUBJECT env var
   * or "mailto:admin@invest.com.au" if neither is supplied.
   */
  subject?: string;
  /**
   * JWT expiry in seconds from now. RFC 8292 requires ≤ 24 h.
   * Defaults to 12 hours.
   */
  expiresInSeconds?: number;
  /** Inject a custom time source for deterministic tests. */
  nowMs?: number;
}

/**
 * Build a signed RFC 8292 VAPID JWT string (the `t=` part of the header).
 *
 * @throws if the private key bytes are not a valid P-256 scalar (i.e. wrong
 *         key material was stored in VAPID_PRIVATE_KEY).
 */
export async function buildVapidJwt(opts: VapidJwtOptions): Promise<string> {
  const { endpoint, privateKey, expiresInSeconds = 12 * 3600, nowMs = Date.now() } = opts;

  const subject =
    opts.subject ||
    process.env.VAPID_SUBJECT ||
    "mailto:admin@invest.com.au";

  // aud = scheme + host of the push endpoint (RFC 8292 §3.1)
  const url = new URL(endpoint);
  const aud = `${url.protocol}//${url.host}`;

  // JWT header
  const header = encodeJwtPart({ typ: "JWT", alg: "ES256" });

  // JWT claims
  const nowSec = Math.floor(nowMs / 1000);
  const claims = encodeJwtPart({
    aud,
    exp: nowSec + expiresInSeconds,
    sub: subject,
  });

  // Signing input: ASCII(base64url(header) + "." + base64url(payload))
  const signingInput = `${header}.${claims}`;
  const encoder = new TextEncoder();
  const signingInputBytes = encoder.encode(signingInput);

  // Import the raw P-256 private key.
  // VAPID private keys are 32-byte raw scalars stored as base64url.
  // Web Crypto requires them wrapped in a JWK (or PKCS8), so we use JWK.
  const keyBytes = fromBase64Url(privateKey);
  if (keyBytes.length !== 32) {
    throw new Error(
      `VAPID private key must be 32 bytes (got ${keyBytes.length}). ` +
        "Store the raw P-256 scalar as base64url in VAPID_PRIVATE_KEY.",
    );
  }

  // Reconstruct the PKCS8 DER from the raw 32-byte scalar.
  // Structure: RFC 5915 ECPrivateKey wrapped in PKCS8 PrivateKeyInfo for P-256.
  // Node 20+ SubtleCrypto accepts PKCS8 without the optional [1] public key context.
  const pkcs8 = buildEcP256Pkcs8(keyBytes);

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  // Sign with ECDSA P-256 + SHA-256 (ES256)
  // Web Crypto returns the signature in IEEE P1363 format (64 bytes: r || s).
  const sigDer = await globalThis.crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    cryptoKey,
    signingInputBytes,
  );

  const signature = toBase64Url(new Uint8Array(sigDer));
  return `${signingInput}.${signature}`;
}

// ── ASN.1 / PKCS8 DER encoding for P-256 private keys ────────────────────────
//
// SubtleCrypto.importKey("pkcs8", …) requires a DER-encoded PKCS#8
// PrivateKeyInfo (RFC 5958). For P-256 the minimal structure is 67 bytes:
//
//   30 41                                       SEQUENCE (65 bytes)
//     02 01 00                                  INTEGER version = 0
//     30 13                                     SEQUENCE algorithmId (19 bytes)
//       06 07 2a 86 48 ce 3d 02 01              OID id-ecPublicKey
//       06 08 2a 86 48 ce 3d 03 01 07           OID secp256r1 (P-256)
//     04 27                                     OCTET STRING (39 bytes)
//       30 25                                   SEQUENCE ECPrivateKey (37 bytes)
//         02 01 01                              INTEGER version = 1
//         04 20 <32 bytes>                      OCTET STRING privateKey
//
// Node 20+ SubtleCrypto accepts this minimal form (the [1] public-key context
// in the ECPrivateKey is optional). All lengths are computed by tlv() so the
// function is correct for any 32-byte scalar without hard-coded sizes.

/** Generic DER TLV encoder (handles lengths up to 65535). */
function tlv(tag: number, value: Uint8Array): Uint8Array {
  const len = value.length;
  if (len < 0x80) {
    return concat([Uint8Array.from([tag, len]), value]);
  } else if (len < 0x100) {
    return concat([Uint8Array.from([tag, 0x81, len]), value]);
  }
  return concat([
    Uint8Array.from([tag, 0x82, (len >> 8) & 0xff, len & 0xff]),
    value,
  ]);
}

function buildEcP256Pkcs8(rawKey: Uint8Array): ArrayBuffer {
  // OID id-ecPublicKey: 1.2.840.10045.2.1
  const oidEcPublicKey = Uint8Array.from([
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
  ]);
  // OID secp256r1 (P-256): 1.2.840.10045.3.1.7
  const oidP256 = Uint8Array.from([
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
  ]);

  const algorithmId = tlv(0x30, concat([oidEcPublicKey, oidP256]));

  // RFC 5915 ECPrivateKey (minimal — no public key context):
  // SEQUENCE { version=1, OCTET STRING(scalar) }
  const ecPrivateKey = tlv(
    0x30,
    concat([
      tlv(0x02, Uint8Array.from([0x01])), // version = 1
      tlv(0x04, rawKey), // privateKey scalar
    ]),
  );

  // PKCS8 PrivateKeyInfo
  const pkcs8Body = concat([
    tlv(0x02, Uint8Array.from([0x00])), // version = 0
    algorithmId,
    tlv(0x04, ecPrivateKey), // privateKey OCTET STRING
  ]);

  return tlv(0x30, pkcs8Body).buffer;
}

function concat(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

/**
 * Build the full VAPID Authorization header value for a given push endpoint.
 *
 * Returns: `vapid t=<jwt>, k=<base64url-public-key>`
 *
 * @param endpoint        The push endpoint URL.
 * @param vapidPrivate    VAPID_PRIVATE_KEY (32-byte P-256 scalar, base64url).
 * @param vapidPublic     VAPID_PUBLIC_KEY  (65-byte uncompressed P-256 point, base64url).
 * @param subject         The `sub` claim (mailto: or https: URL).
 */
export async function buildVapidAuthHeader(
  endpoint: string,
  vapidPrivate: string,
  vapidPublic: string,
  subject?: string,
): Promise<string> {
  const jwt = await buildVapidJwt({ endpoint, privateKey: vapidPrivate, subject });
  return `vapid t=${jwt}, k=${vapidPublic}`;
}
