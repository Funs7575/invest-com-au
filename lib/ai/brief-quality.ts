/**
 * AI quality scoring for inbound briefs.
 *
 * Behaviour:
 *   - Flag `ai_brief_quality_scoring` OFF → returns null, no API call.
 *   - Flag ON → Claude scores brief 1..5 on coherence + intent quality.
 *   - Score < 3 → caller flips brief's risk_review_status to 'review'.
 *
 * Cost: 1 Claude call per inbound brief (~$0.0005-0.001 with Haiku 4.5).
 * Fire-and-forget from the brief-create route — failures never block
 * the user's brief submission.
 */
import { isFlagEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";

const log = logger("ai:brief-quality");

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

export interface BriefQualityScore {
  score: number; // 1..5
  reason: string;
}

export async function scoreBriefQuality(input: {
  title: string;
  description: string;
  intent_slug?: string;
  budget_band?: string;
  sessionId?: string;
}): Promise<BriefQualityScore | null> {
  const enabled = await isFlagEnabled("ai_brief_quality_scoring", {
    userKey: input.sessionId,
  });
  if (!enabled) return null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log.warn("ANTHROPIC_API_KEY missing — skipping quality score");
    return null;
  }

  const systemPrompt = `You score the quality of inbound consumer requests for an Australian financial-services marketplace on a 1..5 scale:
- 5: clear, specific, genuine intent
- 4: clear intent, some details missing
- 3: acceptable but vague
- 2: ambiguous, possibly low-effort
- 1: incoherent / spam / off-topic

Respond ONLY with strict JSON: {"score": int 1..5, "reason": string ~ 12 words}.`;

  const userPrompt = JSON.stringify({
    title: input.title,
    description: input.description.slice(0, 2000),
    intent_slug: input.intent_slug ?? null,
    budget_band: input.budget_band ?? null,
  });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 120,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      log.warn("anthropic call failed", { status: res.status });
      return null;
    }
    const body = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = body.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
    const stripped = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(stripped) as { score: number; reason: string };
    if (typeof parsed.score !== "number" || parsed.score < 1 || parsed.score > 5) {
      log.warn("malformed quality score", { raw: text.slice(0, 100) });
      return null;
    }
    return {
      score: Math.round(parsed.score),
      reason: String(parsed.reason ?? "").slice(0, 240),
    };
  } catch (err) {
    log.warn("brief quality scoring threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
