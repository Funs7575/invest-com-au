/**
 * Review sentiment faceting.
 *
 * Runs a Claude / OpenAI pass over each new broker or advisor
 * review and extracts structured per-facet sentiment scores:
 *
 *   customer_service   0-100  | null if not mentioned
 *   fees_value         0-100
 *   platform_ux        0-100
 *   speed_reliability  0-100
 *   trust_accuracy     0-100
 *   overall_tone       'positive'|'neutral'|'negative'|'mixed'
 *   summary            1-2 sentence distilled takeaway
 *
 * Same pluggable adapter pattern as article-quality-scoring.ts
 * and photo-moderation.ts — Claude first, OpenAI second, stub
 * fallback returns null facets so the downstream pipeline still
 * runs without a paid key.
 *
 * Every scored row is persisted to `review_sentiment_facets` with
 * one row per (review_type, review_id) pair. A nightly cron picks
 * up new reviews that don't have a matching facet row yet.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("review-sentiment");

export type SentimentProvider = "claude" | "openai" | "stub";
export type ReviewType = "user_review" | "professional_review";
export type OverallTone = "positive" | "neutral" | "negative" | "mixed";

export interface SentimentFacets {
  customer_service: number | null;
  fees_value: number | null;
  platform_ux: number | null;
  speed_reliability: number | null;
  trust_accuracy: number | null;
}

export interface SentimentResult {
  provider: SentimentProvider;
  model: string | null;
  facets: SentimentFacets;
  overall_tone: OverallTone;
  summary: string;
}

export interface ReviewForSentiment {
  review_type: ReviewType;
  review_id: number;
  title?: string | null;
  body: string;
  rating?: number | null;
}

export async function scoreReview(review: ReviewForSentiment): Promise<SentimentResult> {
  const provider = selectProvider();
  try {
    if (provider === "claude") return await runClaude(review);
    if (provider === "openai") return await runOpenAi(review);
    return stubResult();
  } catch (err) {
    log.warn("review sentiment provider threw", {
      provider,
      err: err instanceof Error ? err.message : String(err),
    });
    return stubResult();
  }
}

function selectProvider(): SentimentProvider {
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "stub";
}

function stubResult(): SentimentResult {
  return {
    provider: "stub",
    model: null,
    facets: {
      customer_service: null,
      fees_value: null,
      platform_ux: null,
      speed_reliability: null,
      trust_accuracy: null,
    },
    overall_tone: "neutral",
    summary: "No sentiment provider configured.",
  };
}

const PROMPT_INSTRUCTIONS = `You are a sentiment analyst scoring a user review of a financial
services platform (share broker or financial advisor) in Australia.

Return STRICT JSON:

{
  "facets": {
    "customer_service": 0-100 or null,
    "fees_value":       0-100 or null,
    "platform_ux":      0-100 or null,
    "speed_reliability": 0-100 or null,
    "trust_accuracy":   0-100 or null
  },
  "overall_tone": "positive" | "neutral" | "negative" | "mixed",
  "summary": "1-2 sentences"
}

Rules:
- Use null for a facet the review does not mention. Do NOT guess.
- 0 means "explicitly bad"; 100 means "explicitly great". 50 is
  "mentioned but mixed".
- "customer_service" covers friendliness, responsiveness, helpfulness.
- "fees_value" covers brokerage, hidden fees, value for money.
- "platform_ux" covers the app/website experience.
- "speed_reliability" covers execution speed, downtime, lag.
- "trust_accuracy" covers data accuracy, regulation, honesty.
- Return ONLY the JSON object. No markdown. No commentary.`;

async function runClaude(review: ReviewForSentiment): Promise<SentimentResult> {
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
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `${PROMPT_INSTRUCTIONS}\n\n── REVIEW ──\nRating: ${review.rating ?? "n/a"}/5\nTitle: ${review.title ?? ""}\n\n${review.body.slice(0, 4000)}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`claude HTTP ${res.status}`);
  const body = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = body.content?.find((c) => c.type === "text")?.text || "";
  const parsed = parseSentimentJson(text);
  return { ...parsed, provider: "claude", model };
}

async function runOpenAi(review: ReviewForSentiment): Promise<SentimentResult> {
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
        { role: "system", content: PROMPT_INSTRUCTIONS },
        {
          role: "user",
          content: `Rating: ${review.rating ?? "n/a"}/5\nTitle: ${review.title ?? ""}\n\n${review.body.slice(0, 4000)}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`openai HTTP ${res.status}`);
  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = body.choices?.[0]?.message?.content || "";
  const parsed = parseSentimentJson(text);
  return { ...parsed, provider: "openai", model };
}

/**
 * Exported so the test suite can cover parsing edge cases
 * independent of a live LLM call.
 */
export function parseSentimentJson(raw: string): {
  facets: SentimentFacets;
  overall_tone: OverallTone;
  summary: string;
} {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "");
  try {
    const parsed = JSON.parse(cleaned) as {
      facets?: Partial<SentimentFacets>;
      overall_tone?: string;
      summary?: string;
    };

    const clamp = (v: unknown): number | null => {
      if (v == null) return null;
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return Math.max(0, Math.min(100, Math.round(n)));
    };

    const tone = (parsed.overall_tone || "").toLowerCase();
    const safeTone: OverallTone = ["positive", "neutral", "negative", "mixed"].includes(tone)
      ? (tone as OverallTone)
      : "neutral";

    return {
      facets: {
        customer_service: clamp(parsed.facets?.customer_service),
        fees_value: clamp(parsed.facets?.fees_value),
        platform_ux: clamp(parsed.facets?.platform_ux),
        speed_reliability: clamp(parsed.facets?.speed_reliability),
        trust_accuracy: clamp(parsed.facets?.trust_accuracy),
      },
      overall_tone: safeTone,
      summary: (parsed.summary || "").slice(0, 500),
    };
  } catch {
    return {
      facets: {
        customer_service: null,
        fees_value: null,
        platform_ux: null,
        speed_reliability: null,
        trust_accuracy: null,
      },
      overall_tone: "neutral",
      summary: "",
    };
  }
}

/**
 * Persist a scored review to `review_sentiment_facets`. Upserts on
 * (review_type, review_id) so a re-score replaces the old row.
 */
export async function persistSentiment(
  review: ReviewForSentiment,
  result: SentimentResult,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("review_sentiment_facets")
    .upsert(
      {
        review_type: review.review_type,
        review_id: review.review_id,
        customer_service: result.facets.customer_service,
        fees_value: result.facets.fees_value,
        platform_ux: result.facets.platform_ux,
        speed_reliability: result.facets.speed_reliability,
        trust_accuracy: result.facets.trust_accuracy,
        overall_tone: result.overall_tone,
        summary: result.summary,
        provider: result.provider,
        model: result.model,
        scored_at: new Date().toISOString(),
      },
      { onConflict: "review_type,review_id" },
    );
  if (error) {
    log.warn("review_sentiment_facets upsert failed", { error: error.message });
  }
}
