/**
 * AI provider profile summary generation.
 *
 * Cost shape: 1 Claude call per generation (~$0.001-0.003 with Haiku 4.5).
 * Hard-gated behind feature flag `ai_provider_summaries` (default OFF) so
 * zero Anthropic spend lands in prod traffic. Per-pro rate limit prevents
 * runaway generation if the flag is toggled on.
 *
 * Failure mode: any error returns null. The caller surfaces a friendly
 * "couldn't generate right now" message and the pro stays on whatever
 * summary they had before.
 */
import { isFlagEnabled } from "@/lib/feature-flags";
// eslint-disable-next-line no-restricted-imports -- service-role legitimate: writes to professionals on the pro's behalf with cross-row reads (brief_outcomes) the anon JWT can't see.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("ai:provider-summary");

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

export interface GenerateProviderSummaryResult {
  summary: string | null;
  confidence: number;
  generated: boolean;
  reason?: "flag_off" | "no_api_key" | "missing_pro" | "claude_error" | "malformed_response";
}

export async function generateProviderSummary(
  professionalId: number,
): Promise<GenerateProviderSummaryResult> {
  const enabled = await isFlagEnabled("ai_provider_summaries", {
    userKey: String(professionalId),
  });
  if (!enabled) {
    return { summary: null, confidence: 0, generated: false, reason: "flag_off" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { summary: null, confidence: 0, generated: false, reason: "no_api_key" };
  }

  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select(
      "id, name, specialty_tags, years_experience, certifications, location_state, bio",
    )
    .eq("id", professionalId)
    .maybeSingle();
  if (!pro) {
    return { summary: null, confidence: 0, generated: false, reason: "missing_pro" };
  }

  const { data: outcomeAgg } = await admin
    .from("brief_outcomes")
    .select("outcome, rating")
    .eq("professional_id", professionalId)
    .eq("outcome", "completed");
  const completedCount = (outcomeAgg ?? []).length;
  const ratings = (outcomeAgg ?? [])
    .map((o) => o.rating)
    .filter((r): r is number => typeof r === "number");
  const avgRating =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  const systemPrompt = `You write warm, factual one-paragraph summaries (~70 words) for verified Australian financial professionals. Use only the supplied facts. No personal-advice claims. No superlatives. Plain English. Respond with strict JSON: {"summary": string, "confidence": number 0..1}.`;
  const userPrompt = JSON.stringify({
    name: pro.name,
    specialties: pro.specialty_tags ?? [],
    years_experience: pro.years_experience ?? null,
    certifications: pro.certifications ?? [],
    location_state: pro.location_state ?? null,
    existing_bio: (pro.bio as string | null)?.slice(0, 500) ?? null,
    verified_outcomes: { completed_count: completedCount, average_rating: avgRating },
  });

  let parsed: { summary: string; confidence: number } | null = null;
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
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      log.warn("anthropic call failed", { status: res.status });
      return { summary: null, confidence: 0, generated: false, reason: "claude_error" };
    }
    const body = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text =
      body.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
    const stripped = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    parsed = JSON.parse(stripped) as { summary: string; confidence: number };
  } catch (err) {
    log.warn("provider summary generation threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { summary: null, confidence: 0, generated: false, reason: "claude_error" };
  }

  if (!parsed || typeof parsed.summary !== "string" || parsed.summary.length < 20) {
    return { summary: null, confidence: 0, generated: false, reason: "malformed_response" };
  }
  const confidence = clamp01(parsed.confidence ?? 0.5);

  await admin
    .from("professionals")
    .update({
      ai_generated_summary: parsed.summary,
      ai_summary_generated_at: new Date().toISOString(),
      ai_summary_published: false,
    })
    .eq("id", professionalId);

  log.info("provider summary generated", { professional_id: professionalId, confidence });
  return { summary: parsed.summary, confidence, generated: true };
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
