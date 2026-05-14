/**
 * POST /api/briefs/ai-copilot — extract a structured Brief payload from
 * a freeform natural-language description (feature #10 in the MM-14 AI
 * wave).
 *
 * GATING (NON-NEGOTIABLE):
 *
 *   This route is gated behind the `ai_match_request_copilot` feature
 *   flag. When the flag evaluates false, the route returns 404 (NOT 200
 *   with empty data) — anyone scanning the API surface gets no signal
 *   that the feature exists, and zero Anthropic tokens are spent.
 *
 *   The flag check runs BEFORE any Anthropic call, so the cost of a
 *   disabled-flag request is bounded to one Supabase round-trip + one
 *   IP-rate-limit DB hit. No LLM tokens.
 *
 * RATE LIMIT:
 *
 *   5 requests / hour / IP. Tuned tight because each allowed request
 *   costs Anthropic tokens (see `lib/briefs/ai-copilot.ts` header for
 *   the per-call cost calculation). 5/hour is enough for a curious
 *   visitor to draft, re-draft, and refine without abuse becoming a
 *   meaningful spend vector.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isFlagEnabled } from "@/lib/feature-flags";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { extractBriefPayload } from "@/lib/briefs/ai-copilot";

const log = logger("ai:copilot:route");

export const runtime = "nodejs";
export const maxDuration = 30;

const FEATURE_FLAG_KEY = "ai_match_request_copilot";

/** 5 requests / hour / IP — see file header. */
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_REFILL_PER_SEC = 5 / 3600;

const RequestBody = z.object({
  description: z
    .string()
    .min(10, "Please describe what you need in at least 10 characters.")
    .max(3000, "Description is too long. Trim to 3000 characters or fewer."),
  hints: z
    .object({
      intent: z.string().max(120).optional(),
      budget: z.string().max(60).optional(),
      location: z.string().max(60).optional(),
    })
    .optional(),
});

export const POST = withValidatedBody(RequestBody, async (req, body) => {
  // ── 1. Feature flag gate ─────────────────────────────────────────────
  //
  // The flag check uses the IP as the userKey so a partial rollout
  // (rollout_pct=N) is stable per visitor. When the flag is fully off
  // (the default seeded by 20260514_mm14_ai_feature_flags.sql), every
  // request returns 404 here and the Anthropic API is never called.
  //
  // 404 — not 403, not 200-with-empty — to avoid leaking the route's
  // existence to anyone scanning the API surface.
  const visitorIp = ipKey(req);
  const enabled = await isFlagEnabled(FEATURE_FLAG_KEY, {
    userKey: visitorIp,
  });
  if (!enabled) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // ── 2. IP rate limit ─────────────────────────────────────────────────
  const allowed = await isAllowed("ai-copilot", visitorIp, {
    max: RATE_LIMIT_MAX,
    refillPerSec: RATE_LIMIT_REFILL_PER_SEC,
  });
  if (!allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: `Limit ${RATE_LIMIT_MAX} AI co-pilot drafts per hour.`,
      },
      { status: 429 },
    );
  }

  // ── 3. Extract ───────────────────────────────────────────────────────
  const result = await extractBriefPayload(body.description, body.hints ?? {});

  if (result.confidence === 0 && result.missing_fields.includes("all")) {
    log.info("co-pilot extraction returned failsafe", {
      desc_len: body.description.length,
    });
  }

  return NextResponse.json({
    ok: true,
    payload: result.payload,
    confidence: result.confidence,
    missing_fields: result.missing_fields,
  });
});
