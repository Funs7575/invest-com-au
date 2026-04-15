/**
 * Resend webhook verification.
 *
 * Resend signs outbound webhooks using Svix, which uses an HMAC-SHA256
 * scheme over a deterministic string `${svix-id}.${svix-timestamp}.${body}`.
 * The header value has a `v1,<base64>` format and may contain multiple
 * space-separated versions.
 *
 * Docs: https://docs.svix.com/receiving/verifying-payloads/how-manual
 *
 * We return a simple boolean so callers can reject with 401 and log
 * the attempt. Never throws — a malformed signature just returns false.
 */

import crypto from "node:crypto";
import { logger } from "@/lib/logger";

const log = logger("resend-webhook-verify");

const MAX_TIMESTAMP_SKEW_SEC = 5 * 60; // 5 minutes either side

export interface ResendWebhookHeaders {
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
}

export function extractSvixHeaders(headers: Headers): ResendWebhookHeaders {
  return {
    svixId: headers.get("svix-id"),
    svixTimestamp: headers.get("svix-timestamp"),
    svixSignature: headers.get("svix-signature"),
  };
}

/**
 * Verify a Resend/Svix webhook signature.
 *
 *   - secret: the webhook signing secret (starts with `whsec_`). Only the
 *     part after `whsec_` is base64 and used as the HMAC key.
 *   - body:   raw request body text (NOT the parsed JSON — Svix signs
 *             the exact byte sequence)
 *   - headers: the svix-id / svix-timestamp / svix-signature headers
 *
 * Returns true if:
 *   1. Timestamp is within ±5 minutes of now
 *   2. At least one v1 signature in the header matches the expected HMAC
 *
 * Uses crypto.timingSafeEqual for comparison so we're not leaking info
 * about where the mismatch is.
 */
export function verifyResendSignature(
  secret: string,
  body: string,
  headers: ResendWebhookHeaders,
): boolean {
  const { svixId, svixTimestamp, svixSignature } = headers;
  if (!svixId || !svixTimestamp || !svixSignature) {
    log.warn("Resend webhook missing svix headers");
    return false;
  }

  // Reject stale signatures (replay protection)
  const tsSec = Number(svixTimestamp);
  if (!Number.isFinite(tsSec)) {
    log.warn("Resend webhook invalid svix-timestamp", { svixTimestamp });
    return false;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsSec) > MAX_TIMESTAMP_SKEW_SEC) {
    log.warn("Resend webhook timestamp outside allowed skew", {
      svixTimestamp,
      skewSec: Math.abs(nowSec - tsSec),
    });
    return false;
  }

  // Secret is `whsec_<base64>`. Extract base64 portion.
  const keyB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes: Buffer;
  try {
    keyBytes = Buffer.from(keyB64, "base64");
  } catch {
    log.error("Resend webhook secret could not be decoded");
    return false;
  }

  // Signed content: `${id}.${timestamp}.${body}`
  const signedContent = `${svixId}.${svixTimestamp}.${body}`;
  const expected = crypto
    .createHmac("sha256", keyBytes)
    .update(signedContent)
    .digest("base64");

  // Header may contain multiple signatures (e.g. during key rotation).
  // Each is `v1,<base64>` separated by spaces.
  const parts = svixSignature.split(" ");
  for (const part of parts) {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) continue;
    if (constantTimeEqualB64(sig, expected)) return true;
  }
  return false;
}

/**
 * Compare two base64 strings in constant time. Returns false if
 * either is empty or they are different lengths (to avoid leaking
 * length via the timing-safe comparison which would throw).
 */
function constantTimeEqualB64(a: string, b: string): boolean {
  if (!a || !b) return false;
  // Normalise padding — the expected signature is always correctly
  // padded; incoming may or may not be.
  const aBuf = Buffer.from(a, "base64");
  const bBuf = Buffer.from(b, "base64");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
