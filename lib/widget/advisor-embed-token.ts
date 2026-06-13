/**
 * Signed tokens for the Per-Adviser Embed Kit (/api/widget/advisor-embed).
 *
 * Why a token at all: the embed endpoints serve only public-profile data,
 * but a snippet should render ONLY for advisers who generated it in the
 * portal. The token proves "this embed was minted by the logged-in owner
 * of this profile" so scrapers can't mass-generate live embeds for every
 * adviser, and so an embed can be tied back to the adviser who placed it.
 *
 * Format (same HMAC scheme as lib/listing-owner-cookie.ts — base64url
 * payload + HMAC-SHA-256 over the encoded payload, constant-time verify):
 *
 *   aet1.<base64url(payload)>.<base64url(hmac)>
 *   payload: { p: professionalId, s: slug, iat: seconds }
 *
 * The token is stateless by design (no new tables — EE-stream constraint):
 * verification = signature check + the serving route re-checking that the
 * professional is still `status='active'` and that id+slug both match.
 *
 * Lifecycle / revocation (documented behaviour):
 *   - Tokens do NOT expire — embeds are paste-once snippets on third-party
 *     sites and must not silently die after N days.
 *   - "Regenerate" in the portal mints a fresh token (new iat). The adviser
 *     replaces the snippet on their own site; the old snippet keeps working
 *     until one of the hard kill-switches below fires.
 *   - Hard kill, per adviser: deactivate the profile (`status` ≠ 'active');
 *     the serving route then renders nothing for ANY token.
 *   - Hard kill, platform-wide: rotate ADVISOR_EMBED_TOKEN_SECRET (or the
 *     underlying service-role key when no dedicated secret is set). All
 *     embed tokens invalidate at once; advisers re-copy snippets.
 *
 * Secret resolution: ADVISOR_EMBED_TOKEN_SECRET (≥32 chars) when set.
 * Otherwise a purpose-bound key is DERIVED from SUPABASE_SERVICE_ROLE_KEY
 * via HMAC-SHA-256 with a fixed context string — domain separation means
 * the parent secret is never used directly and cannot be recovered from
 * tokens. Setting the dedicated env var later rotates every token (the
 * documented platform-wide revocation lever). With neither secret present
 * this module refuses to sign or verify (no silent fallback — mirrors the
 * lib/listing-owner-cookie.ts posture).
 */

import { createHmac, timingSafeEqual } from "crypto";

/** Token prefix — bump (aet2…) if the payload shape ever changes. */
export const ADVISOR_EMBED_TOKEN_PREFIX = "aet1";

/** Context string for deriving the signing key from the service-role key. */
const KEY_DERIVATION_CONTEXT = "invest.com.au/advisor-embed-token/v1";

interface AdvisorEmbedTokenPayload {
  /** professionals.id */
  p: number;
  /** professionals.slug at mint time */
  s: string;
  /** issued-at, unix seconds */
  iat: number;
}

export type AdvisorEmbedTokenResult =
  | { ok: true; professionalId: number; slug: string; iat: number }
  | {
      ok: false;
      reason:
        | "missing"
        | "malformed"
        | "bad_signature"
        | "no_secret"
        | "slug_mismatch";
    };

/**
 * Resolve the HMAC signing key, or null when no usable secret exists.
 * Exported for the portal route so it can answer "is the embed kit
 * configured?" without trying to sign.
 */
export function advisorEmbedSigningAvailable(): boolean {
  return resolveSigningKey() !== null;
}

function resolveSigningKey(): Buffer | null {
  const dedicated = process.env.ADVISOR_EMBED_TOKEN_SECRET;
  if (dedicated && dedicated.length >= 32) {
    return Buffer.from(dedicated, "utf8");
  }
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRole && serviceRole.length >= 32) {
    // Purpose-bound derived key — domain-separated from every other use
    // of the service-role key; one-way, so tokens never expose it.
    return createHmac("sha256", serviceRole)
      .update(KEY_DERIVATION_CONTEXT)
      .digest();
  }
  return null;
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
 * Mint a signed embed token for an adviser. Throws when no signing secret
 * is available — callers should check advisorEmbedSigningAvailable() and
 * degrade gracefully (the portal shows a "not configured" notice).
 */
export function signAdvisorEmbedToken(
  input: { professionalId: number; slug: string },
  nowMs: number = Date.now(),
): string {
  const key = resolveSigningKey();
  if (!key) {
    throw new Error(
      "Advisor embed signing unavailable: set ADVISOR_EMBED_TOKEN_SECRET (≥32 chars) " +
        "or SUPABASE_SERVICE_ROLE_KEY. Generate with: openssl rand -hex 32",
    );
  }
  const payload: AdvisorEmbedTokenPayload = {
    p: input.professionalId,
    s: input.slug.toLowerCase().trim(),
    iat: Math.floor(nowMs / 1000),
  };
  const payloadB64 = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const hmac = createHmac("sha256", key).update(payloadB64).digest();
  return `${ADVISOR_EMBED_TOKEN_PREFIX}.${payloadB64}.${b64urlEncode(hmac)}`;
}

/**
 * Verify an embed token. Constant-time HMAC compare; structured failure
 * reasons (callers render the same silent output for every failure — the
 * reasons exist for logging only, never for the public response).
 *
 * `expectedSlug` (when provided) must match the slug baked into the
 * payload, so a token minted for adviser A cannot be replayed against
 * adviser B's slug even before the DB id check runs.
 */
export function verifyAdvisorEmbedToken(
  token: string | null | undefined,
  options: { expectedSlug?: string } = {},
): AdvisorEmbedTokenResult {
  if (!token) return { ok: false, reason: "missing" };

  const key = resolveSigningKey();
  if (!key) return { ok: false, reason: "no_secret" };

  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const [prefix, payloadB64, hmacB64] = parts;
  if (prefix !== ADVISOR_EMBED_TOKEN_PREFIX || !payloadB64 || !hmacB64) {
    return { ok: false, reason: "malformed" };
  }

  const expected = createHmac("sha256", key).update(payloadB64).digest();
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

  let payload: AdvisorEmbedTokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (
    typeof payload?.p !== "number" ||
    !Number.isInteger(payload.p) ||
    payload.p <= 0 ||
    typeof payload?.s !== "string" ||
    payload.s.length === 0 ||
    typeof payload?.iat !== "number"
  ) {
    return { ok: false, reason: "malformed" };
  }

  if (
    options.expectedSlug !== undefined &&
    payload.s !== options.expectedSlug.toLowerCase().trim()
  ) {
    return { ok: false, reason: "slug_mismatch" };
  }

  return { ok: true, professionalId: payload.p, slug: payload.s, iat: payload.iat };
}
