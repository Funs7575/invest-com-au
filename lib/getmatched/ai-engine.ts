/**
 * AI-driven question picker for Get Matched 3.0.
 *
 * Companion to the deterministic rule-based walker in
 * `./questions.ts` — when the `ai_get_matched_v3` feature flag is
 * enabled (via `nextQuestionWithAI`), this module calls Claude to
 * pick the most useful next question slug for the user given the
 * answers they have already given. If Claude is confident it has
 * enough context, it can short-circuit and signal "resolve the
 * plan" instead of asking another question.
 *
 *  ── Cost implications (READ BEFORE ENABLING) ───────────────────
 *
 *  Every call to `pickNextQuestionAI` is a paid request to the
 *  Anthropic API. With the default model (`claude-haiku-4-5`):
 *
 *    • Input tokens per call:  ~500-800 (system prompt + answers)
 *    • Output tokens per call: ~80-160 (JSON envelope)
 *    • Estimated cost:         ~$0.0003 per next-question call
 *    • At 1k Get Matched starts/day × ~6 questions each:
 *                              ~$1.80/day ≈ $54/month
 *    • At 100k starts/day:     ~$180/day ≈ $5,400/month
 *
 *  The feature flag is the budget brake. It seeds as
 *  `enabled=false, rollout_pct=0`, so production traffic incurs
 *  zero token cost until an admin flips it on
 *  /admin/feature-flags. Ramping via `rollout_pct` is the
 *  intended cost-control mechanism (10% → 25% → 100%).
 *
 *  The caller (`nextQuestionWithAI`) MUST gate every invocation on
 *  `isFlagEnabled('ai_get_matched_v3', { userKey })`. Never call
 *  `pickNextQuestionAI` directly from a route handler without that
 *  gate — that's the contract that guarantees zero token cost when
 *  the flag is off.
 *
 *  ── Failure mode ───────────────────────────────────────────────
 *
 *  Fail-safe by design: if the API errors, times out, returns
 *  malformed JSON, or picks an unknown slug, this function returns
 *  `{shouldResolve: false, confidence: 0}` and the caller falls
 *  through to the deterministic rule-based walker. The user always
 *  sees a working flow.
 */

// eslint-disable-next-line no-restricted-imports -- public-flow helper; falls through to rule-based path on failure.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

import type { ActionPlanAnswers, QuestionMode } from "./types";

const log = logger("ai:getmatched");

/** Tight envelope returned to the caller. All fields optional except
 *  `confidence` so callers can treat a low-confidence response as
 *  "fall through to rule-based". */
export interface AiNextQuestionResult {
  /** Slug of the next question to ask, picked from the supplied list.
   *  Undefined if the model wants to resolve immediately or failed. */
  slug?: string;
  /** Optional context-tailored rewording of the question prompt.
   *  Caller may surface it as the displayed prompt or ignore it. */
  generatedPrompt?: string;
  /** If true, the model believes we have enough info to skip the
   *  remaining questions and call `/api/get-matched/resolve` now. */
  shouldResolve?: boolean;
  /** 0..1 self-reported confidence. Caller can use as a threshold. */
  confidence: number;
}

const SAFE_FAILURE: AiNextQuestionResult = {
  shouldResolve: false,
  confidence: 0,
};

const API_TIMEOUT_MS = 20_000;
const MAX_OUTPUT_TOKENS = 300;
const ANTHROPIC_VERSION = "2023-06-01";

/** Subset of the question metadata the model needs. Keeping the
 *  payload narrow keeps input tokens (and cost) low. */
export interface AiQuestionContext {
  slug: string;
  prompt: string;
  step: number;
  mapsTo: string;
}

/** Anthropic v1/messages response shape — only the bits we read. */
interface AnthropicMessagesResponse {
  content?: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/** Shape the model is instructed to emit. Anything else → fail-safe. */
interface ModelEnvelope {
  next_question_slug?: string | null;
  generated_prompt?: string | null;
  should_resolve_plan?: boolean | null;
  confidence?: number | null;
  reasoning?: string | null;
}

function buildSystemPrompt(slugs: AiQuestionContext[]): string {
  const slugList = slugs
    .map((q) => `  - ${q.slug} (step ${q.step}, maps_to: ${q.mapsTo}): ${q.prompt}`)
    .join("\n");
  return [
    "You are a warm Australian financial concierge guiding a user",
    "through 5-7 short questions to build an investment action plan.",
    "Tone: friendly, professional, no jargon. You are NOT giving",
    "personal financial advice — you are routing the user to the",
    "right page or shortlist.",
    "",
    "Your job: pick the most useful NEXT question to ask, or signal",
    "that you have enough information to resolve the plan now.",
    "",
    "Available question slugs you can pick from:",
    slugList,
    "",
    "Rules:",
    "  1. Pick a slug from the list above, OR set",
    "     should_resolve_plan=true if 4+ key facts are already known",
    "     (intent + budget + location + timeline is enough).",
    "  2. Do not invent new slugs.",
    "  3. Do not repeat a question the user has already answered.",
    "  4. confidence is 0..1, your self-estimate of pick quality.",
    "  5. generated_prompt is optional — only fill it when you can",
    "     tailor the wording to the user's stated context",
    "     (e.g. mention 'SMSF property' if they said that earlier).",
    "",
    "Respond with ONLY a JSON object matching exactly this schema:",
    "  {",
    '    "next_question_slug": string | null,',
    '    "generated_prompt": string | null,',
    '    "should_resolve_plan": boolean,',
    '    "confidence": number,',
    '    "reasoning": string',
    "  }",
    "No prose, no markdown fences, just the JSON object.",
  ].join("\n");
}

function buildUserMessage(answers: ActionPlanAnswers, mode: QuestionMode): string {
  const answerLines = Object.entries(answers)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `  - ${k}: ${JSON.stringify(v)}`)
    .join("\n");
  return [
    `Mode: ${mode}`,
    "User's answers so far:",
    answerLines || "  (none yet)",
    "",
    "Pick the next question slug, or set should_resolve_plan=true.",
  ].join("\n");
}

/** Strip markdown fences that some models still emit despite
 *  "no markdown" instructions. */
function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function parseEnvelope(raw: string): ModelEnvelope | null {
  try {
    const parsed = JSON.parse(stripFences(raw)) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as ModelEnvelope;
  } catch {
    return null;
  }
}

/** Fire-and-forget cost log row. Failures are swallowed so a
 *  Supabase blip never bubbles into the user-facing path. */
function recordCostMetric(detail: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  userKey: string | null;
  outcome: "ok" | "malformed" | "unknown_slug" | "timeout" | "http_error";
}): void {
  log.info("ai:getmatched call", detail);
  try {
    const admin = createAdminClient();
    void admin
      .from("get_matched_events")
      .insert({
        session_id: detail.userKey ?? "ai-noop",
        event_type: "plan_shown",
        payload: {
          ai: true,
          model: detail.model,
          input_tokens: detail.inputTokens,
          output_tokens: detail.outputTokens,
          outcome: detail.outcome,
        },
      })
      .then(({ error }) => {
        if (error) {
          log.warn("ai cost log insert failed (ignored)", {
            err: error.message,
          });
        }
      });
  } catch (err) {
    log.warn("ai cost log threw (ignored)", {
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Ask Claude to pick the next Get Matched question (or short-circuit
 * to resolve). MUST be called only when `ai_get_matched_v3` is
 * enabled — the caller (`nextQuestionWithAI` in `./questions.ts`)
 * enforces this. Direct calls from route handlers are not allowed.
 *
 * Returns a fail-safe `{shouldResolve: false, confidence: 0}` on any
 * error so the caller can fall through to the rule-based walker.
 */
export async function pickNextQuestionAI(
  answers: ActionPlanAnswers,
  mode: QuestionMode,
  availableQuestions: AiQuestionContext[],
  options?: { userKey?: string | null },
): Promise<AiNextQuestionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log.warn("ANTHROPIC_API_KEY missing — returning fail-safe");
    return SAFE_FAILURE;
  }
  if (availableQuestions.length === 0) {
    log.warn("no available questions supplied — returning fail-safe");
    return SAFE_FAILURE;
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  const systemPrompt = buildSystemPrompt(availableQuestions);
  const userMessage = buildUserMessage(answers, mode);
  const userKey = options?.userKey ?? null;

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch (err) {
    log.warn("anthropic fetch threw", {
      err: err instanceof Error ? err.message : String(err),
      model,
    });
    recordCostMetric({
      model,
      inputTokens: 0,
      outputTokens: 0,
      userKey,
      outcome: "timeout",
    });
    return SAFE_FAILURE;
  }

  if (!res.ok) {
    log.warn("anthropic non-2xx", { status: res.status, model });
    recordCostMetric({
      model,
      inputTokens: 0,
      outputTokens: 0,
      userKey,
      outcome: "http_error",
    });
    return SAFE_FAILURE;
  }

  let body: AnthropicMessagesResponse;
  try {
    body = (await res.json()) as AnthropicMessagesResponse;
  } catch (err) {
    log.warn("anthropic JSON parse failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    recordCostMetric({
      model,
      inputTokens: 0,
      outputTokens: 0,
      userKey,
      outcome: "malformed",
    });
    return SAFE_FAILURE;
  }

  const inputTokens = body.usage?.input_tokens ?? 0;
  const outputTokens = body.usage?.output_tokens ?? 0;
  const rawText = body.content?.find((c) => c.type === "text")?.text ?? "";
  const envelope = parseEnvelope(rawText);

  if (!envelope) {
    log.warn("model returned non-JSON envelope", {
      preview: rawText.slice(0, 120),
    });
    recordCostMetric({
      model,
      inputTokens,
      outputTokens,
      userKey,
      outcome: "malformed",
    });
    return SAFE_FAILURE;
  }

  const confidence =
    typeof envelope.confidence === "number" &&
    envelope.confidence >= 0 &&
    envelope.confidence <= 1
      ? envelope.confidence
      : 0;

  const shouldResolve = envelope.should_resolve_plan === true;

  if (shouldResolve) {
    recordCostMetric({
      model,
      inputTokens,
      outputTokens,
      userKey,
      outcome: "ok",
    });
    return {
      shouldResolve: true,
      confidence,
      generatedPrompt:
        typeof envelope.generated_prompt === "string"
          ? envelope.generated_prompt
          : undefined,
    };
  }

  const slug =
    typeof envelope.next_question_slug === "string" &&
    envelope.next_question_slug.length > 0
      ? envelope.next_question_slug
      : undefined;

  // Validate the slug is one the caller asked us to choose from.
  if (slug && !availableQuestions.some((q) => q.slug === slug)) {
    log.warn("model picked unknown slug", { slug });
    recordCostMetric({
      model,
      inputTokens,
      outputTokens,
      userKey,
      outcome: "unknown_slug",
    });
    return SAFE_FAILURE;
  }

  recordCostMetric({
    model,
    inputTokens,
    outputTokens,
    userKey,
    outcome: "ok",
  });

  return {
    slug,
    shouldResolve: false,
    confidence,
    generatedPrompt:
      typeof envelope.generated_prompt === "string" &&
      envelope.generated_prompt.length > 0
        ? envelope.generated_prompt
        : undefined,
  };
}
