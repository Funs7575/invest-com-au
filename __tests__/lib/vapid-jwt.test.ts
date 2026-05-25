/**
 * Tests for lib/vapid-jwt.ts
 *
 * Covers:
 *   - JWT structure: header + claims + signature (3 dot-separated parts)
 *   - Header claims: typ=JWT, alg=ES256
 *   - Payload claims: aud = scheme+host of endpoint, sub = subject, exp = now+12h
 *   - Signature verifies against the VAPID public key via Web Crypto
 *   - Custom expiresInSeconds / nowMs are respected
 *   - VAPID_SUBJECT env var is used when subject option is omitted
 *   - Default subject fallback ("mailto:admin@invest.com.au") when neither is set
 *   - buildVapidAuthHeader returns `vapid t=<jwt>, k=<publicKey>`
 *   - fromBase64Url / toBase64Url round-trips
 *   - Wrong key length throws a descriptive error
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildVapidJwt,
  buildVapidAuthHeader,
  toBase64Url,
  fromBase64Url,
} from "@/lib/vapid-jwt";

// ── Generate a real P-256 key pair for tests ──────────────────────────────────
//
// vitest runs in Node 20+ which exposes globalThis.crypto.subtle.
// We generate a fresh key pair once per module load — fast (~1ms) and
// deterministic across test runs in the same process.

async function generateTestKeyPair(): Promise<{
  privateKeyBase64url: string;
  publicKeyBase64url: string;
  publicKeyCryptoKey: CryptoKey;
}> {
  const { privateKey, publicKey } = await globalThis.crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );

  // Export private key as JWK to get the raw 32-byte scalar (`d` field).
  // Using JWK export is simpler and more reliable than parsing PKCS8 bytes.
  const jwk = await globalThis.crypto.subtle.exportKey("jwk", privateKey);
  // jwk.d is base64url (no padding) — exactly the format VAPID_PRIVATE_KEY uses.
  const privateKeyBase64url = jwk.d ?? "";

  // Export public key as raw (65-byte uncompressed point)
  const rawPublic = new Uint8Array(
    await globalThis.crypto.subtle.exportKey("raw", publicKey),
  );
  const publicKeyBase64url = toBase64Url(rawPublic);

  return { privateKeyBase64url, publicKeyBase64url, publicKeyCryptoKey: publicKey };
}

// ── Helper: decode JWT part ───────────────────────────────────────────────────

function decodeJwtPart(part: string): Record<string, unknown> {
  const bytes = fromBase64Url(part);
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json) as Record<string, unknown>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("toBase64Url / fromBase64Url", () => {
  it("round-trips arbitrary bytes", () => {
    const original = Uint8Array.from([0, 1, 127, 128, 255, 62, 63]);
    const encoded = toBase64Url(original);
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");
    const decoded = fromBase64Url(encoded);
    expect(decoded).toEqual(original);
  });

  it("handles empty bytes", () => {
    const encoded = toBase64Url(new Uint8Array(0));
    expect(encoded).toBe("");
    expect(fromBase64Url(encoded)).toEqual(new Uint8Array(0));
  });

  it("tolerates base64url input without padding", () => {
    // "abc" → 3 bytes → 4 base64 chars without padding
    const bytes = Uint8Array.from([105, 183, 29]);
    const withPadding = btoa(String.fromCharCode(...bytes));
    const withoutPadding = withPadding.replace(/=/g, "");
    const decoded = fromBase64Url(withoutPadding);
    expect(decoded).toEqual(bytes);
  });
});

describe("buildVapidJwt", () => {
  const endpoint = "https://fcm.googleapis.com/fcm/send/test-token";
  const subject = "mailto:push@invest.com.au";
  const nowMs = 1_700_000_000_000; // deterministic fixed time

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a three-part dot-separated JWT string", async () => {
    const { privateKeyBase64url } = await generateTestKeyPair();
    const jwt = await buildVapidJwt({ endpoint, privateKey: privateKeyBase64url, subject, nowMs });
    const parts = jwt.split(".");
    expect(parts).toHaveLength(3);
  });

  it("header contains typ=JWT and alg=ES256", async () => {
    const { privateKeyBase64url } = await generateTestKeyPair();
    const jwt = await buildVapidJwt({ endpoint, privateKey: privateKeyBase64url, subject, nowMs });
    const [headerB64] = jwt.split(".");
    const header = decodeJwtPart(headerB64 ?? "");
    expect(header.typ).toBe("JWT");
    expect(header.alg).toBe("ES256");
  });

  it("claims contain correct aud (scheme + host only)", async () => {
    const { privateKeyBase64url } = await generateTestKeyPair();
    const jwt = await buildVapidJwt({ endpoint, privateKey: privateKeyBase64url, subject, nowMs });
    const [, claimsB64] = jwt.split(".");
    const claims = decodeJwtPart(claimsB64 ?? "");
    expect(claims.aud).toBe("https://fcm.googleapis.com");
  });

  it("claims contain correct sub", async () => {
    const { privateKeyBase64url } = await generateTestKeyPair();
    const jwt = await buildVapidJwt({ endpoint, privateKey: privateKeyBase64url, subject, nowMs });
    const [, claimsB64] = jwt.split(".");
    const claims = decodeJwtPart(claimsB64 ?? "");
    expect(claims.sub).toBe(subject);
  });

  it("exp = now + 12h by default", async () => {
    const { privateKeyBase64url } = await generateTestKeyPair();
    const jwt = await buildVapidJwt({ endpoint, privateKey: privateKeyBase64url, subject, nowMs });
    const [, claimsB64] = jwt.split(".");
    const claims = decodeJwtPart(claimsB64 ?? "");
    const expectedExp = Math.floor(nowMs / 1000) + 12 * 3600;
    expect(claims.exp).toBe(expectedExp);
  });

  it("respects custom expiresInSeconds", async () => {
    const { privateKeyBase64url } = await generateTestKeyPair();
    const jwt = await buildVapidJwt({
      endpoint,
      privateKey: privateKeyBase64url,
      subject,
      nowMs,
      expiresInSeconds: 3600,
    });
    const [, claimsB64] = jwt.split(".");
    const claims = decodeJwtPart(claimsB64 ?? "");
    const expectedExp = Math.floor(nowMs / 1000) + 3600;
    expect(claims.exp).toBe(expectedExp);
  });

  it("uses VAPID_SUBJECT env var when subject option is omitted", async () => {
    vi.stubEnv("VAPID_SUBJECT", "mailto:env-sub@invest.com.au");
    const { privateKeyBase64url } = await generateTestKeyPair();
    const jwt = await buildVapidJwt({ endpoint, privateKey: privateKeyBase64url, nowMs });
    const [, claimsB64] = jwt.split(".");
    const claims = decodeJwtPart(claimsB64 ?? "");
    expect(claims.sub).toBe("mailto:env-sub@invest.com.au");
  });

  it("falls back to mailto:admin@invest.com.au when VAPID_SUBJECT is unset", async () => {
    vi.stubEnv("VAPID_SUBJECT", "");
    const { privateKeyBase64url } = await generateTestKeyPair();
    const jwt = await buildVapidJwt({ endpoint, privateKey: privateKeyBase64url, nowMs });
    const [, claimsB64] = jwt.split(".");
    const claims = decodeJwtPart(claimsB64 ?? "");
    expect(claims.sub).toBe("mailto:admin@invest.com.au");
  });

  it("signature verifies against the matching public key via Web Crypto", async () => {
    const { privateKeyBase64url, publicKeyCryptoKey } = await generateTestKeyPair();
    const jwt = await buildVapidJwt({ endpoint, privateKey: privateKeyBase64url, subject, nowMs });

    const [headerB64, claimsB64, sigB64] = jwt.split(".");
    const signingInput = `${headerB64}.${claimsB64}`;
    const encoder = new TextEncoder();
    const signingInputBytes = encoder.encode(signingInput);

    // Web Crypto verify — signature is IEEE P1363 (r || s) — same as what
    // SubtleCrypto.sign returns, so we decode directly.
    const sigBytes = fromBase64Url(sigB64 ?? "");

    const valid = await globalThis.crypto.subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      publicKeyCryptoKey,
      sigBytes,
      signingInputBytes,
    );
    expect(valid).toBe(true);
  });

  it("signature does NOT verify against a different public key", async () => {
    const { privateKeyBase64url } = await generateTestKeyPair();
    const { publicKeyCryptoKey: otherPublicKey } = await generateTestKeyPair();

    const jwt = await buildVapidJwt({ endpoint, privateKey: privateKeyBase64url, subject, nowMs });
    const [headerB64, claimsB64, sigB64] = jwt.split(".");
    const sigBytes = fromBase64Url(sigB64 ?? "");
    const signingInputBytes = new TextEncoder().encode(`${headerB64}.${claimsB64}`);

    const valid = await globalThis.crypto.subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      otherPublicKey,
      sigBytes,
      signingInputBytes,
    );
    expect(valid).toBe(false);
  });

  it("throws a descriptive error when key is not 32 bytes", async () => {
    await expect(
      buildVapidJwt({
        endpoint,
        privateKey: toBase64Url(Uint8Array.from([1, 2, 3])), // only 3 bytes
        subject,
        nowMs,
      }),
    ).rejects.toThrow(/32 bytes/);
  });

  it("aud uses the endpoint host for different push services", async () => {
    const { privateKeyBase64url } = await generateTestKeyPair();
    const apnsEndpoint = "https://web.push.apple.com/QA/abc123";
    const jwt = await buildVapidJwt({
      endpoint: apnsEndpoint,
      privateKey: privateKeyBase64url,
      subject,
      nowMs,
    });
    const [, claimsB64] = jwt.split(".");
    const claims = decodeJwtPart(claimsB64 ?? "");
    expect(claims.aud).toBe("https://web.push.apple.com");
  });
});

describe("buildVapidAuthHeader", () => {
  const endpoint = "https://fcm.googleapis.com/fcm/send/tok";
  const subject = "mailto:push@invest.com.au";

  it("returns `vapid t=<jwt>, k=<publicKey>` format", async () => {
    const { privateKeyBase64url, publicKeyBase64url } = await generateTestKeyPair();
    const header = await buildVapidAuthHeader(
      endpoint,
      privateKeyBase64url,
      publicKeyBase64url,
      subject,
    );
    expect(header).toMatch(/^vapid t=.+\..+\..+, k=.+$/);
    const kMatch = header.match(/k=([^,\s]+)/);
    expect(kMatch?.[1]).toBe(publicKeyBase64url);
  });

  it("the jwt part alone is a valid 3-part JWT", async () => {
    const { privateKeyBase64url, publicKeyBase64url } = await generateTestKeyPair();
    const header = await buildVapidAuthHeader(
      endpoint,
      privateKeyBase64url,
      publicKeyBase64url,
      subject,
    );
    const tMatch = header.match(/t=([^,\s]+)/);
    const jwt = tMatch?.[1] ?? "";
    expect(jwt.split(".")).toHaveLength(3);
  });
});
