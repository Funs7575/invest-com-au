/**
 * Brief reply-by-email addresses (Reply-by-Email Bridge).
 *
 * Every brief gets a stable, unguessable inbound address of the form
 *
 *     brief+<briefId>.<sig>@<BRIEF_REPLY_DOMAIN>
 *
 * where `<sig>` is a truncated HMAC-SHA256 of the brief id under
 * BRIEF_REPLY_SECRET. The address is set as the Reply-To header on the
 * brief notification emails; replies are delivered by Resend inbound to
 * /api/inbound/brief-reply, which verifies the HMAC before doing any
 * database work. Because the id is inside the MAC, a token minted for
 * one brief can never be replayed against another, and an attacker who
 * knows the address *format* still cannot forge a valid address without
 * the secret.
 *
 * Env:
 *   - BRIEF_REPLY_SECRET  (required for the feature; generator returns
 *     null and the verifier fails closed when unset — outbound emails
 *     simply ship without a Reply-To header, so the bridge is inert
 *     until the secret is provisioned)
 *   - BRIEF_REPLY_DOMAIN  (inbound domain configured in Resend;
 *     defaults to "reply.invest.com.au")
 *
 * Pure module — no I/O, no Supabase. Unit tests live at
 * __tests__/lib/briefs/reply-address.test.ts.
 */

import crypto from "node:crypto";

export const DEFAULT_REPLY_DOMAIN = "reply.invest.com.au";

/** Hex chars kept from the HMAC — 96 bits, plenty for an email token
 *  while keeping the local part well under the RFC 5321 64-char cap. */
const SIG_LENGTH = 24;

/** Versioned MAC context — prevents cross-protocol reuse of the secret. */
const MAC_CONTEXT = "brief-reply.v1";

/** `brief+<id>.<sig>` local part. Id is canonical (no leading zeros) and
 *  capped at 12 digits so parseInt stays inside Number.MAX_SAFE_INTEGER. */
const LOCAL_PART_RE = /^brief\+([1-9]\d{0,11})\.([a-f0-9]{24})$/;

export type ReplyAddressFailure =
  | "no_secret"
  | "malformed"
  | "wrong_domain"
  | "bad_signature";

export type ReplyAddressVerification =
  | { ok: true; briefId: number }
  | { ok: false; reason: ReplyAddressFailure };

function getSecret(): string | null {
  const secret = process.env.BRIEF_REPLY_SECRET;
  return secret && secret.length > 0 ? secret : null;
}

export function getReplyDomain(): string {
  const domain = process.env.BRIEF_REPLY_DOMAIN;
  return domain && domain.length > 0 ? domain.toLowerCase() : DEFAULT_REPLY_DOMAIN;
}

function signBriefId(briefId: number, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${MAC_CONTEXT}:${briefId}`)
    .digest("hex")
    .slice(0, SIG_LENGTH);
}

/**
 * Build the reply address for a brief, or null when the feature is not
 * configured (no BRIEF_REPLY_SECRET) or the id is not a positive integer.
 * Callers treat null as "omit the Reply-To header".
 */
export function buildBriefReplyAddress(briefId: number): string | null {
  const secret = getSecret();
  if (!secret) return null;
  if (!Number.isInteger(briefId) || briefId <= 0 || briefId > 999_999_999_999) {
    return null;
  }
  return `brief+${briefId}.${signBriefId(briefId, secret)}@${getReplyDomain()}`;
}

/**
 * Verify a single inbound recipient address. Constant-time comparison on
 * the signature (crypto.timingSafeEqual) — the regex pins both sides to
 * the same length first, so the comparison never throws and never leaks
 * a prefix-match timing signal.
 */
export function verifyBriefReplyAddress(
  address: string,
): ReplyAddressVerification {
  const secret = getSecret();
  if (!secret) return { ok: false, reason: "no_secret" };

  // Normalise: trim, strip a surrounding angle-bracket pair, lowercase.
  // Our generated addresses are all-lowercase; some clients title-case
  // the recipient on reply.
  let candidate = address.trim();
  if (candidate.startsWith("<") && candidate.endsWith(">")) {
    candidate = candidate.slice(1, -1).trim();
  }
  candidate = candidate.toLowerCase();

  const at = candidate.lastIndexOf("@");
  if (at <= 0 || at === candidate.length - 1) {
    return { ok: false, reason: "malformed" };
  }
  const localPart = candidate.slice(0, at);
  const domain = candidate.slice(at + 1);

  const match = LOCAL_PART_RE.exec(localPart);
  if (!match) return { ok: false, reason: "malformed" };

  // Domain pinning is defence-in-depth (a staging-domain reply POSTed at
  // prod must not be processed) — the HMAC below is the real gate.
  if (domain !== getReplyDomain()) {
    return { ok: false, reason: "wrong_domain" };
  }

  const idRaw = match[1];
  const providedSig = match[2];
  if (!idRaw || !providedSig) return { ok: false, reason: "malformed" };

  const briefId = Number.parseInt(idRaw, 10);
  const expectedSig = signBriefId(briefId, secret);

  const providedBuf = Buffer.from(providedSig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return { ok: false, reason: "bad_signature" };
  }

  return { ok: true, briefId };
}

export type ReplyRecipientsFailure = "no_secret" | "no_reply_address" | "bad_signature";

export type ReplyRecipientsVerification =
  | { ok: true; briefId: number }
  | { ok: false; reason: ReplyRecipientsFailure };

/**
 * Scan a reply's recipient list (to + cc) for our reply address and
 * verify it. Returns the first valid hit. When nothing in the list even
 * looks like a brief reply address the reason is "no_reply_address";
 * when something looked like ours but failed the HMAC or domain check
 * the reason is "bad_signature" (worth a louder log line).
 */
export function verifyBriefReplyRecipients(
  recipients: readonly string[],
): ReplyRecipientsVerification {
  let sawTampered = false;
  for (const recipient of recipients) {
    const result = verifyBriefReplyAddress(recipient);
    if (result.ok) return result;
    if (result.reason === "no_secret") return { ok: false, reason: "no_secret" };
    if (result.reason === "bad_signature" || result.reason === "wrong_domain") {
      sawTampered = true;
    }
  }
  return { ok: false, reason: sawTampered ? "bad_signature" : "no_reply_address" };
}
