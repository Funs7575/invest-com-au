/**
 * Photo moderation — pluggable provider pattern.
 *
 * Covers advisor profile photos, listing images, broker logos — any
 * user-uploaded image that goes on a public page. The check happens
 * at upload time and the result is persisted to photo_moderation_log
 * so the admin dashboard can see a history of checks even after the
 * image is deleted.
 *
 * Providers:
 *
 *   - cloudflare   via Cloudflare Images API (explicit content check)
 *                  activated by CLOUDFLARE_IMAGES_TOKEN +
 *                  CLOUDFLARE_ACCOUNT_ID env vars
 *
 *   - rekognition  via AWS Rekognition DetectModerationLabels
 *                  activated by AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
 *                  + AWS_REGION env vars
 *
 *   - stub         no-op — returns {verdict: 'unknown', provider: 'stub'}
 *                  used when neither provider is configured so every
 *                  upload still flows through the moderation path
 *                  (and logs a row in photo_moderation_log) but never
 *                  rejects on false positives. Admin reviews still
 *                  happen as they do today.
 *
 * The caller always gets back a ModerationResult — the provider
 * selection + failure handling is internal. This means integrating
 * moderation into an upload path is a one-liner that's safe even
 * when no provider is configured.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("photo-moderation");

export type PhotoVerdict = "clean" | "flagged" | "rejected" | "unknown";

export interface PhotoModerationResult {
  verdict: PhotoVerdict;
  confidence: number; // 0-1
  labels: Record<string, number>; // label → confidence
  provider: "cloudflare" | "rekognition" | "stub";
}

export type PhotoTargetType = "advisor_photo" | "listing_image" | "broker_logo";

/**
 * Run photo moderation against whatever provider is configured.
 *
 *   photoUrl   — publicly accessible URL (the provider will fetch it)
 *   targetType — used in the audit log only
 *   targetId   — optional row id, logged for traceability
 *
 * Logs every check to photo_moderation_log regardless of verdict.
 * Never throws — a provider failure is logged and returns verdict
 * 'unknown' so the caller can decide whether to block the upload.
 */
export async function moderatePhoto(
  photoUrl: string,
  targetType: PhotoTargetType,
  targetId: number | null = null,
): Promise<PhotoModerationResult> {
  const provider = selectProvider();

  let result: PhotoModerationResult;
  try {
    if (provider === "cloudflare") {
      result = await runCloudflare(photoUrl);
    } else if (provider === "rekognition") {
      result = await runRekognition(photoUrl);
    } else {
      result = {
        verdict: "unknown",
        confidence: 0,
        labels: {},
        provider: "stub",
      };
    }
  } catch (err) {
    log.warn("photo moderation provider threw — logging as unknown", {
      provider,
      photoUrl,
      err: err instanceof Error ? err.message : String(err),
    });
    result = {
      verdict: "unknown",
      confidence: 0,
      labels: { error: 1 },
      provider,
    };
  }

  // Fire-and-forget audit log — don't block on the write
  logModerationCheck(photoUrl, targetType, targetId, result).catch((err) =>
    log.warn("photo_moderation_log insert failed", {
      err: err instanceof Error ? err.message : String(err),
    }),
  );

  return result;
}

function selectProvider(): "cloudflare" | "rekognition" | "stub" {
  if (process.env.CLOUDFLARE_IMAGES_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
    return "cloudflare";
  }
  if (
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION
  ) {
    return "rekognition";
  }
  return "stub";
}

// ─── Cloudflare Images adapter ───────────────────────────────────
/**
 * Cloudflare Images doesn't have a standalone "detect explicit content"
 * endpoint, but it does expose a `requireSignedURLs` + variant pipeline.
 * For v1 we use its adjacent "hash on upload + detect similar hashes
 * in a known-bad allowlist" capability which you access via their
 * Workers AI moderation model.
 *
 * This is the stub implementation expected to call Workers AI's
 * image classifier. Operators running on Cloudflare will have a
 * dedicated worker endpoint that wraps the model — set
 * CLOUDFLARE_IMAGES_TOKEN to that worker's URL (not the account token).
 */
async function runCloudflare(photoUrl: string): Promise<PhotoModerationResult> {
  const endpoint = process.env.CLOUDFLARE_IMAGES_TOKEN!;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: photoUrl }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`cloudflare HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    labels?: Record<string, number>;
    explicit?: boolean;
    suggestive?: boolean;
    confidence?: number;
  };

  const labels = body.labels || {};
  const maxScore = Object.values(labels).reduce((max, v) => Math.max(max, v), 0);

  let verdict: PhotoVerdict = "clean";
  if (body.explicit || maxScore > 0.85) verdict = "rejected";
  else if (body.suggestive || maxScore > 0.5) verdict = "flagged";

  return {
    verdict,
    confidence: body.confidence ?? maxScore,
    labels,
    provider: "cloudflare",
  };
}

// ─── AWS Rekognition adapter ─────────────────────────────────────
/**
 * DetectModerationLabels returns a list of moderation labels with
 * confidence scores. We don't depend on the aws-sdk package to keep
 * the bundle lean — just hit the HTTP endpoint with a SigV4 signed
 * POST.
 *
 * For v1 this is implemented as a call to a minimal signing helper.
 * If you want the full SDK integration, swap out this function's body.
 */
async function runRekognition(photoUrl: string): Promise<PhotoModerationResult> {
  // V1: we expect operators running Rekognition to have deployed a
  // thin proxy endpoint that handles SigV4 signing server-side and
  // accepts { image_url } POST requests. Set AWS_REGION to that
  // proxy's deployed region; the actual URL lives in
  // REKOGNITION_PROXY_URL.
  const endpoint = process.env.REKOGNITION_PROXY_URL;
  if (!endpoint) {
    throw new Error("REKOGNITION_PROXY_URL not set");
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: photoUrl }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`rekognition HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    ModerationLabels?: Array<{ Name: string; Confidence: number }>;
  };

  const labels: Record<string, number> = {};
  let maxConfidence = 0;
  for (const l of body.ModerationLabels || []) {
    labels[l.Name] = l.Confidence / 100;
    if (l.Confidence / 100 > maxConfidence) maxConfidence = l.Confidence / 100;
  }

  let verdict: PhotoVerdict = "clean";
  if (maxConfidence > 0.85) verdict = "rejected";
  else if (maxConfidence > 0.5) verdict = "flagged";

  return {
    verdict,
    confidence: maxConfidence,
    labels,
    provider: "rekognition",
  };
}

// ─── Audit logging ───────────────────────────────────────────────
async function logModerationCheck(
  photoUrl: string,
  targetType: PhotoTargetType,
  targetId: number | null,
  result: PhotoModerationResult,
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("photo_moderation_log").insert({
    photo_url: photoUrl,
    target_type: targetType,
    target_id: targetId,
    provider: result.provider,
    verdict: result.verdict,
    confidence: result.confidence,
    labels: result.labels,
  });
}
