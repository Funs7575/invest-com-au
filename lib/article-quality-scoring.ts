/**
 * Article quality scoring — pluggable LLM adapter.
 *
 * Used by the advisor article pipeline to add a second, quality-
 * oriented scoring pass on top of the existing deterministic
 * text-moderation classifier. The deterministic classifier catches
 * spam / policy violations; this one looks at rubric dimensions
 * like clarity, accuracy, compliance, SEO health — things that
 * require a language model to judge.
 *
 * Providers:
 *
 *   - claude   via ANTHROPIC_API_KEY
 *   - openai   via OPENAI_API_KEY
 *   - stub     no-op when neither is set — returns a permissive
 *              verdict ("escalate") so nothing is auto-rejected
 *              purely because the scoring budget isn't configured
 *
 * Verdicts:
 *
 *   - auto_approve   score ≥ approve_threshold + no hard fails
 *   - auto_reject    score < reject_threshold OR hard fails present
 *   - escalate       anything in between (queued for admin review)
 *
 * Every score is persisted to `article_quality_scores` regardless
 * of verdict so we have a history per article that admins can
 * inspect from the drill-down page.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { getThreshold } from "@/lib/admin/classifier-config";

const log = logger("article-quality-scoring");

export type QualityProvider = "claude" | "openai" | "stub";
export type QualityVerdict = "auto_approve" | "escalate" | "auto_reject";

export interface QualityRubric {
  clarity: number; // 0-100
  accuracy: number;
  completeness: number;
  compliance: number;
  seo: number;
}

export interface ArticleQualityScore {
  provider: QualityProvider;
  model: string | null;
  score: number; // 0-100 aggregate
  rubric: QualityRubric;
  verdict: QualityVerdict;
  feedback: string;
}

export interface ScoreArticleInput {
  articleId: number | null;
  articleSlug: string | null;
  title: string;
  content: string; // markdown or plain text
}

/**
 * Score an article and persist the result. Thresholds:
 *
 *   - approve_threshold: aggregate ≥ this → auto_approve (default 80)
 *   - reject_threshold:  aggregate < this → auto_reject  (default 40)
 *   - compliance_floor:  compliance < this → force escalate (default 60)
 *
 * All three are live-editable from classifier_config under
 * classifier='article_quality'.
 *
 * Never throws — a provider failure is logged and returns
 * verdict='escalate' so humans can still review the article.
 */
export async function scoreArticle(
  input: ScoreArticleInput,
): Promise<ArticleQualityScore> {
  const provider = selectProvider();
  const [approveThreshold, rejectThreshold, complianceFloor] = await Promise.all([
    getThreshold("article_quality", "approve_threshold", 80),
    getThreshold("article_quality", "reject_threshold", 40),
    getThreshold("article_quality", "compliance_floor", 60),
  ]);

  let result: ArticleQualityScore;
  let useThresholds = true;
  try {
    if (provider === "claude") {
      result = await runClaude(input);
    } else if (provider === "openai") {
      result = await runOpenAi(input);
    } else {
      // Stub: never run through the threshold policy — there's no
      // real signal, forcing 'escalate' is the only safe outcome.
      result = buildStubResult();
      useThresholds = false;
    }
  } catch (err) {
    log.warn("article quality provider threw — escalating", {
      provider,
      err: err instanceof Error ? err.message : String(err),
    });
    result = {
      provider,
      model: null,
      score: 0,
      rubric: { clarity: 0, accuracy: 0, completeness: 0, compliance: 0, seo: 0 },
      verdict: "escalate",
      feedback: `provider_error: ${err instanceof Error ? err.message : String(err)}`,
    };
    // Provider errors must never auto-reject — the score is 0
    // because the call failed, not because the article is bad.
    useThresholds = false;
  }

  // Apply thresholds for real provider runs. Stub + provider-error
  // paths keep 'escalate' so a broken upstream never silently turns
  // into mass auto-rejections.
  if (useThresholds) {
    result.verdict = resolveVerdict(
      result.score,
      result.rubric.compliance,
      approveThreshold,
      rejectThreshold,
      complianceFloor,
    );
  }

  // Fire-and-forget audit log — don't block the caller.
  persistScore(input, result).catch((err) =>
    log.warn("article_quality_scores insert failed", {
      err: err instanceof Error ? err.message : String(err),
    }),
  );

  return result;
}

/**
 * Pure verdict resolver — exported so tests can cover the policy
 * decisions without having to stub a provider.
 */
export function resolveVerdict(
  score: number,
  compliance: number,
  approveThreshold: number,
  rejectThreshold: number,
  complianceFloor: number,
): QualityVerdict {
  if (score < rejectThreshold) return "auto_reject";
  if (compliance < complianceFloor) return "escalate";
  if (score >= approveThreshold) return "auto_approve";
  return "escalate";
}

function selectProvider(): QualityProvider {
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "stub";
}

function buildStubResult(): ArticleQualityScore {
  return {
    provider: "stub",
    model: null,
    score: 0,
    rubric: { clarity: 0, accuracy: 0, completeness: 0, compliance: 0, seo: 0 },
    verdict: "escalate",
    feedback: "No LLM provider configured — article escalated for human review.",
  };
}

// ─── Shared prompt ────────────────────────────────────────────────

const RUBRIC_INSTRUCTIONS = `You are scoring a financial article for an Australian investment
comparison website. Score each dimension 0-100 and return STRICT JSON:

{
  "rubric": {
    "clarity":       0-100,  // is the writing clear and well-structured?
    "accuracy":      0-100,  // are facts and figures plausible?
    "completeness":  0-100,  // does it cover the topic fully?
    "compliance":    0-100,  // does it avoid personal advice, unsubstantiated
                             // performance claims, and stay within general
                             // information? (Australian FSG / corporations act)
    "seo":           0-100   // headings, length, keyword use
  },
  "score": 0-100,            // weighted aggregate
  "feedback": "1-3 sentences on what to fix"
}

Return ONLY the JSON. Do not wrap it in markdown. Do not add commentary.
If the content is too short to judge, return rubric all zeros.`;

// ─── Claude adapter ───────────────────────────────────────────────

async function runClaude(input: ScoreArticleInput): Promise<ArticleQualityScore> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `${RUBRIC_INSTRUCTIONS}\n\n── ARTICLE ──\nTitle: ${input.title}\n\n${input.content.slice(0, 20000)}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`claude HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = body.content?.find((c) => c.type === "text")?.text || "";
  const parsed = parseRubricJson(text);

  return {
    provider: "claude",
    model,
    score: parsed.score,
    rubric: parsed.rubric,
    verdict: "escalate", // overridden by resolveVerdict
    feedback: parsed.feedback,
  };
}

// ─── OpenAI adapter ───────────────────────────────────────────────

async function runOpenAi(input: ScoreArticleInput): Promise<ArticleQualityScore> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: RUBRIC_INSTRUCTIONS },
        {
          role: "user",
          content: `Title: ${input.title}\n\n${input.content.slice(0, 20000)}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`openai HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = body.choices?.[0]?.message?.content || "";
  const parsed = parseRubricJson(text);

  return {
    provider: "openai",
    model,
    score: parsed.score,
    rubric: parsed.rubric,
    verdict: "escalate",
    feedback: parsed.feedback,
  };
}

/**
 * Parse the rubric JSON out of a model response. Handles both strict
 * JSON replies and responses that accidentally include a markdown
 * code fence. Never throws — returns a zero rubric on parse failure
 * and lets the threshold logic take over.
 */
export function parseRubricJson(raw: string): {
  rubric: QualityRubric;
  score: number;
  feedback: string;
} {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    const obj = JSON.parse(cleaned) as {
      rubric?: Partial<QualityRubric>;
      score?: number;
      feedback?: string;
    };
    const rubric: QualityRubric = {
      clarity: clamp(obj.rubric?.clarity),
      accuracy: clamp(obj.rubric?.accuracy),
      completeness: clamp(obj.rubric?.completeness),
      compliance: clamp(obj.rubric?.compliance),
      seo: clamp(obj.rubric?.seo),
    };
    const score = typeof obj.score === "number" ? clamp(obj.score) : avgRubric(rubric);
    return {
      rubric,
      score,
      feedback: (obj.feedback || "").slice(0, 500),
    };
  } catch {
    return {
      rubric: { clarity: 0, accuracy: 0, completeness: 0, compliance: 0, seo: 0 },
      score: 0,
      feedback: "parse_error",
    };
  }
}

function clamp(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function avgRubric(r: QualityRubric): number {
  return Math.round((r.clarity + r.accuracy + r.completeness + r.compliance + r.seo) / 5);
}

// ─── Persistence ──────────────────────────────────────────────────

async function persistScore(
  input: ScoreArticleInput,
  result: ArticleQualityScore,
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("article_quality_scores").insert({
    article_id: input.articleId,
    article_slug: input.articleSlug,
    provider: result.provider,
    model: result.model,
    score: result.score,
    rubric: result.rubric,
    verdict: result.verdict,
    feedback: result.feedback,
  });
}
