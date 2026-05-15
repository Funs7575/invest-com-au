/**
 * AI Match Request co-pilot — extract a structured Brief payload from a
 * user's freeform "tell me what you're trying to do" description.
 *
 * The co-pilot is *opt-in*. It is gated by the `ai_match_request_copilot`
 * feature flag in `feature_flags` (seeded by
 * `supabase/migrations/20260514_mm14_ai_feature_flags.sql`). The flag
 * defaults to false in every environment — the wrapper route MUST refuse
 * to call this function unless the flag evaluates true.
 *
 * ─── Cost implications (READ BEFORE TUNING THE PROMPT) ───────────────
 *
 *   Each call to `extractBriefPayload` is one HTTP request to the
 *   Anthropic Messages API. With `claude-haiku-4-5-20251001` as the
 *   default model and a ~600-token prompt + ~400-token output cap, a
 *   single extraction costs roughly:
 *
 *     input  ≈ 600 tokens   × $0.80 / 1M ≈ $0.00048
 *     output ≈ 400 tokens   × $4.00 / 1M ≈ $0.0016
 *     ────────────────────────────────────────────
 *     total  ≈ $0.002 / call (Haiku 4.5 pricing, mid-2026)
 *
 *   At the route's IP rate limit of **5 calls / hour / IP**, a single
 *   IP can spend at most ~$0.24/day. The feature-flag-off default plus
 *   the IP throttle means production token spend stays under $5/day
 *   even with a steady stream of curious visitors flipping the toggle.
 *
 *   If we ever bump the model to Sonnet/Opus, multiply the above by 5x
 *   and 25x respectively — re-tune the rate limit before doing that.
 *
 *   The fail-safe (timeout / network error / malformed JSON) returns
 *   confidence=0 instead of throwing, so a flaky Anthropic API never
 *   wedges the brief form — the UI falls back to the manual form.
 *
 * ─── Behavioural contract ────────────────────────────────────────────
 *
 *   - Returns `{ payload, confidence, missing_fields }` where confidence
 *     is 0..1. The UI uses confidence ≥ 0.6 as the threshold for "trust
 *     the draft and prefill the form" vs "ask the user to fill the form
 *     manually with a heads-up toast".
 *
 *   - `missing_fields` lists Brief fields Claude couldn't infer from
 *     the description. The UI surfaces them as a "We need a bit more
 *     info" prompt before letting the user submit.
 *
 *   - Output is strictly JSON. The system prompt instructs Claude to
 *     respond with ONLY a JSON object — no preamble, no markdown
 *     fences. If parsing fails we treat it as a model failure and
 *     return the fail-safe shape.
 */

import { logger } from "@/lib/logger";
import {
  BRIEF_TEMPLATES,
  QUOTE_BUDGET_BANDS,
  QUOTE_AU_STATES,
  QUOTE_ADVISOR_TYPES,
} from "@/lib/api-schemas";
import type { BriefTemplate } from "@/lib/briefs/types";

const log = logger("ai:copilot");

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_TIMEOUT_MS = 25_000;
/** Cap on output tokens — extraction never needs more than this. */
const MAX_OUTPUT_TOKENS = 600;

/**
 * Canonical Brief payload the co-pilot returns. This mirrors the shape
 * of `CreateBriefRequest` in `lib/api-schemas.ts` so the client can pass
 * the result straight to the existing /api/briefs POST. Every field is
 * optional because Claude may legitimately fail to infer any one of
 * them from a thin description — the UI inspects `missing_fields` to
 * decide whether to short-circuit to the manual form.
 */
export interface BriefPayload {
  brief_template?: BriefTemplate;
  job_title?: string;
  job_description?: string;
  budget_band?: string;
  location_state?: string;
  advisor_types?: string[];
  brief_payload?: Record<string, unknown>;
}

export interface ExtractionResult {
  payload: BriefPayload;
  /** 0..1 — see file header for how the UI uses this. */
  confidence: number;
  /** Names of Brief fields Claude could not infer. */
  missing_fields: string[];
}

export interface ExtractionHints {
  /** A suggested intent slug from prior signal (e.g. quiz answer). */
  intent?: string;
  /** Suggested budget band ("under_500" .. "10k_plus"). */
  budget?: string;
  /** Suggested AU state code ("NSW" .. "NT"). */
  location?: string;
}

/**
 * Fail-safe value returned on timeout, network error, missing API key,
 * or malformed JSON output. The UI treats confidence=0 as "fall back
 * to manual form".
 */
const FAILSAFE: ExtractionResult = {
  payload: {},
  confidence: 0,
  missing_fields: ["all"],
};

/**
 * Build the system prompt. Kept as a function so tests can inspect the
 * exact string the model sees, and so we can include the live list of
 * allowed slugs without drift if the registries grow.
 */
export function buildSystemPrompt(): string {
  const slugs = BRIEF_TEMPLATES.join(", ");
  const budgets = QUOTE_BUDGET_BANDS.join(", ");
  const states = QUOTE_AU_STATES.join(", ");
  const services = QUOTE_ADVISOR_TYPES.join(", ");
  return [
    "You are a warm Australian financial brief composer.",
    "Read the user's plain-English description and extract a structured",
    "Investor Brief in JSON.",
    "",
    "Required fields (best-effort — list any you cannot infer in missing_fields):",
    `  - title:           Short clear brief title (8-120 chars)`,
    `  - summary:         A 30-500 char description of the situation`,
    `  - intent_slug:     One of: ${slugs}`,
    `  - budget_band:     One of: ${budgets}`,
    `  - timeline:        One of: asap, 1_3_months, 3_6_months, 6_12_months, 12_months_plus, not_sure`,
    `  - location_state:  One of: ${states}`,
    `  - services_needed: Array of: ${services}`,
    "",
    "Respond with ONLY a single JSON object — no preamble, no markdown",
    "fences, no commentary. Exact shape:",
    "  {",
    '    "payload": {',
    '      "brief_template": <intent_slug>,',
    '      "job_title": <title>,',
    '      "job_description": <summary>,',
    '      "budget_band": <budget_band>,',
    '      "location_state": <location_state>,',
    '      "advisor_types": <services_needed>,',
    '      "brief_payload": { "timeline": <timeline>, "notes": <optional extras> }',
    "    },",
    '    "confidence": <0..1 number>,',
    '    "missing_fields": [<names of fields you could not infer>]',
    "  }",
    "",
    "If you cannot infer a value confidently, omit the key from `payload`",
    "and list the field name in `missing_fields`. Do NOT invent details.",
    "Confidence reflects how complete and accurate the extraction is —",
    "0.9+ for a rich description, 0.5-0.7 for partial, <0.4 for sparse.",
    "",
    "Compliance: you are NOT giving advice. You are restating the user's",
    "own goals so verified providers can quote them. Do not editorialise.",
  ].join("\n");
}

function buildUserPrompt(description: string, hints: ExtractionHints): string {
  const lines: string[] = [];
  lines.push("User description:");
  lines.push(description.trim());
  const hintBits: string[] = [];
  if (hints.intent) hintBits.push(`intent=${hints.intent}`);
  if (hints.budget) hintBits.push(`budget=${hints.budget}`);
  if (hints.location) hintBits.push(`location=${hints.location}`);
  if (hintBits.length > 0) {
    lines.push("");
    lines.push("Prior signal (lower weight than the description itself):");
    lines.push(hintBits.join(", "));
  }
  return lines.join("\n");
}

/**
 * Strict JSON parse — Claude is instructed to return ONLY JSON, but we
 * defend against stray markdown fences or a leading "Here is the JSON"
 * by stripping fences if present and falling back to a substring search
 * for the first `{` … last `}`.
 */
function tryParseJson(raw: string): unknown {
  const trimmed = raw.trim();
  // Strip ```json fences if present.
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenceMatch?.[1] ?? trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    // Best-effort recovery: grab the substring between the first `{`
    // and the last `}` and try again.
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Coerce an unknown value into the ExtractionResult shape, dropping any
 * fields that don't match. We never trust the model's output blindly —
 * any unexpected shape collapses to the fail-safe.
 */
function coerceResult(value: unknown): ExtractionResult {
  if (!value || typeof value !== "object") return FAILSAFE;
  const obj = value as Record<string, unknown>;
  const payloadRaw = obj.payload;
  const payload: BriefPayload =
    payloadRaw && typeof payloadRaw === "object"
      ? (payloadRaw as BriefPayload)
      : {};
  const rawConfidence = obj.confidence;
  const confidence =
    typeof rawConfidence === "number" && rawConfidence >= 0 && rawConfidence <= 1
      ? rawConfidence
      : 0;
  const rawMissing = obj.missing_fields;
  const missing_fields = Array.isArray(rawMissing)
    ? rawMissing.filter((x): x is string => typeof x === "string")
    : [];
  return { payload, confidence, missing_fields };
}

/**
 * Main entry point — the route handler calls this AFTER confirming the
 * feature flag is enabled. Returns the fail-safe shape on any error;
 * never throws.
 */
export async function extractBriefPayload(
  description: string,
  hints: ExtractionHints = {},
): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log.warn("ANTHROPIC_API_KEY missing — extraction unavailable");
    return FAILSAFE;
  }

  const trimmed = description.trim();
  if (trimmed.length < 10) {
    // Too short to extract anything meaningful — short-circuit and
    // save the round-trip. UI shows "tell us a bit more".
    return FAILSAFE;
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(trimmed, hints);

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
    });
    if (!res.ok) {
      log.warn("anthropic call failed", { status: res.status });
      return FAILSAFE;
    }
    const body = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text =
      body.content?.find((c) => c.type === "text")?.text?.trim() || "";
    if (!text) {
      log.warn("anthropic returned empty content");
      return FAILSAFE;
    }
    const parsed = tryParseJson(text);
    if (parsed === null) {
      log.warn("anthropic returned non-JSON content");
      return FAILSAFE;
    }
    return coerceResult(parsed);
  } catch (err) {
    log.warn("anthropic threw — falling back", {
      err: err instanceof Error ? err.message : String(err),
    });
    return FAILSAFE;
  }
}
