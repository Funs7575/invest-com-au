/**
 * AI portfolio analysis engine — PR-X5j (Phase 4 of the investor-account roadmap).
 *
 * COMPLIANCE POSTURE (read before changing this file):
 *
 *   Invest.com.au operates under the s766B(6)/(7) factual-information
 *   carve-outs of the Corporations Act 2001 — we do NOT hold an AFSL
 *   (expected grant ~2026-11). Personalized AI commentary on a specific
 *   user's portfolio sits very close to the personal-advice line. This
 *   engine is built defensively:
 *
 *     1. The route that invokes it is gated by `investor_ai_analysis_enabled`
 *        which is seeded `false` and MUST stay false until AFSL grants.
 *     2. The system prompt explicitly frames every observation as factual
 *        comparison, not a recommendation. It bans advice-shaped language.
 *     3. The model's text reply is filtered through `filterFactualOutput()`
 *        before it is returned to the caller. Any rejected span fails the
 *        whole analysis — the engine reports `compliance_filter_failed`
 *        rather than partial output.
 *     4. Output is capped at 800 tokens and input at the top 100 holdings
 *        so a malicious / accidental loop can't burn through tokens.
 *
 * This module is pure-ish: the `runHoldingsAnalysis` function takes an
 * injected Anthropic client so tests can mock the call. There is NO
 * module-level Anthropic client — the caller is responsible for
 * instantiation (so we never accidentally fire requests during import).
 */

import type Anthropic from "@anthropic-ai/sdk";
import {
  filterFactualOutput,
  GAW_AI_PREFIX,
  RISK_WARNING_CTA,
} from "@/lib/compliance";
import type { InvestorProfile } from "@/lib/investor-profiles";

/**
 * Default Claude model used by the analysis engine. Latest Opus model
 * keyed to the AI cost-cap pricing table in `lib/ai-cost-caps.ts`.
 * Override at the call site for tests / experimentation.
 */
export const DEFAULT_ANALYSIS_MODEL = "claude-opus-4-7";

/** Hard cap on the number of holdings we include in the prompt body. */
export const HOLDINGS_PROMPT_CAP = 100;

/** Hard cap on the model's response in output tokens. */
export const MAX_OUTPUT_TOKENS = 800;

/**
 * Subset of the `investor_holdings` row shape needed for the prompt.
 * Kept local so the engine doesn't take a hard dependency on the
 * column list (which is allowed to evolve in unrelated PRs).
 */
export interface HoldingForAnalysis {
  ticker: string;
  exchange: string;
  shares: number;
  cost_basis_per_share_cents: number;
  acquired_at: string;
  broker_slug?: string | null;
}

/**
 * Subset of `InvestorProfile` the prompt actually uses. We deliberately
 * pass the small flag set rather than the whole row so we don't leak
 * unrelated profile fields (display name, intent country, etc.) into
 * the model's context.
 */
export interface ProfileForAnalysis {
  isFhb: boolean;
  isPreRetiree: boolean;
  isBusinessOwner: boolean;
  isCrossBorder: boolean;
  isHnw: boolean;
}

/**
 * Result returned by `runHoldingsAnalysis`. Either:
 *   - `ok: true`  → model produced text that passed `filterFactualOutput`;
 *     `observations` is the bullet list, `rawText` is the full filtered body.
 *   - `ok: false` → either the model call failed, the response was empty,
 *     or the compliance filter rejected the output. `reason` is a stable
 *     machine-readable string suitable for logs + the API response.
 */
export type AnalysisResult =
  | {
      ok: true;
      observations: string[];
      rawText: string;
    }
  | {
      ok: false;
      reason:
        | "compliance_filter_failed"
        | "model_call_failed"
        | "empty_response"
        | "no_holdings";
      detail?: string;
    };

/**
 * Build the user-message body for the model. Pure function — easy to
 * unit-test, no I/O. Numbers are rendered with explicit units so the
 * model can't accidentally drop a `$` and mis-quote a cost basis.
 *
 * Holdings are capped at `HOLDINGS_PROMPT_CAP` to keep input tokens
 * bounded; callers that pass more get the first N. Top-of-list bias
 * is acceptable here — the cap is purely a token-budget control.
 */
export function formatHoldingsForPrompt(
  holdings: readonly HoldingForAnalysis[],
  profile: ProfileForAnalysis,
): string {
  const capped = holdings.slice(0, HOLDINGS_PROMPT_CAP);

  const lifeEvents: string[] = [];
  if (profile.isFhb) lifeEvents.push("first-home buyer");
  if (profile.isPreRetiree) lifeEvents.push("pre-retiree");
  if (profile.isBusinessOwner) lifeEvents.push("business owner");
  if (profile.isCrossBorder) lifeEvents.push("cross-border investor");
  if (profile.isHnw) lifeEvents.push("high-net-worth");
  const lifeEventLine =
    lifeEvents.length > 0
      ? `Profile flags: ${lifeEvents.join(", ")}.`
      : "Profile flags: none recorded.";

  const rows = capped
    .map((h, i) => {
      const idx = String(i + 1).padStart(2, " ");
      const costAud = (h.cost_basis_per_share_cents / 100).toFixed(2);
      const broker = h.broker_slug ? ` via ${h.broker_slug}` : "";
      return (
        `${idx}. ${h.ticker} (${h.exchange}) — ` +
        `${h.shares} shares @ A$${costAud} cost basis, ` +
        `acquired ${h.acquired_at}${broker}`
      );
    })
    .join("\n");

  const truncated =
    holdings.length > HOLDINGS_PROMPT_CAP
      ? `\n\n(${holdings.length - HOLDINGS_PROMPT_CAP} additional holdings omitted to stay within the analysis token budget.)`
      : "";

  return (
    `${lifeEventLine}\n\n` +
    `Holdings (${capped.length} of ${holdings.length} total):\n${rows}${truncated}`
  );
}

/**
 * System prompt for the analysis engine. Frames the model strictly as
 * a factual-comparison surface, lists banned advice phrases verbatim,
 * and asks for exactly three observations so the response shape is
 * predictable for downstream UI.
 *
 * If you change this prompt, update the test in
 * `__tests__/lib/holdings/ai-analysis.test.ts` that asserts the banned
 * phrases are still mentioned — the model needs them in-context, not
 * just in the post-filter.
 */
export const ANALYSIS_SYSTEM_PROMPT =
  `You are a factual-observation engine for Invest.com.au. Your job is to ` +
  `produce comparison and factual observations about a user's portfolio. ` +
  `You are NOT a financial adviser. Invest.com.au operates under the ` +
  `factual-information carve-outs of the Australian Corporations Act 2001 ` +
  `and does not hold an AFSL.\n\n` +
  `STRICT RULES — failure to comply causes a compliance rejection:\n` +
  `  1. Begin your response with the exact prefix: "${GAW_AI_PREFIX}"\n` +
  `  2. Produce EXACTLY 3 observations, in order: (a) diversification, ` +
  `(b) sector / position concentration, (c) fee efficiency vs market.\n` +
  `  3. Each observation must be 1-3 sentences, comparison-style only.\n` +
  `  4. Do NOT use any of these phrases or their conjugations: ` +
  `"you should", "we recommend", "I recommend", "buy now", "sell now", ` +
  `"best for you", "advise you to", "personal advice", "personally recommend", ` +
  `"you ought to", "you must invest", "the best choice for you".\n` +
  `  5. Do NOT recommend buying, selling, switching, or rebalancing. ` +
  `Frame everything as "observation" or "your portfolio shows X".\n` +
  `  6. If you cite a numeric statistic (e.g. "10%" or "$500"), follow ` +
  `it immediately with a citation: (source: ...) or [^1].\n` +
  `  7. Do not invent prices, returns, or fees. Observe only what the ` +
  `user told you in the holdings list.\n` +
  `  8. Format output as plain markdown bullets, one per observation, ` +
  `prefixed by the GAW line above.\n\n` +
  `Acceptable framing: "Your portfolio shows X% in technology, which is ` +
  `higher than the ASX200 weighting of Y%." (factual comparison)\n` +
  `Unacceptable framing: "You should diversify into bonds." (personal advice)`;

/**
 * Run the AI analysis. The Anthropic client is INJECTED so callers
 * (and tests) decide how it's created — there is no module-level
 * client to avoid accidental import-time API calls.
 *
 * Returns a discriminated result; never throws on a normal failure
 * path (model error, empty body, filter rejection). Truly unexpected
 * exceptions (e.g. the injected client is missing methods) bubble
 * up so Sentry catches them.
 */
export async function runHoldingsAnalysis(
  holdings: readonly HoldingForAnalysis[],
  profile: ProfileForAnalysis | InvestorProfile,
  opts: {
    anthropicClient: Anthropic;
    modelId?: string;
  },
): Promise<AnalysisResult> {
  if (holdings.length === 0) {
    return { ok: false, reason: "no_holdings" };
  }

  const promptBody = formatHoldingsForPrompt(holdings, {
    isFhb: profile.isFhb === true,
    isPreRetiree: profile.isPreRetiree === true,
    isBusinessOwner: profile.isBusinessOwner === true,
    isCrossBorder: profile.isCrossBorder === true,
    isHnw: profile.isHnw === true,
  });

  let rawText: string;
  try {
    const response = await opts.anthropicClient.messages.create({
      model: opts.modelId ?? DEFAULT_ANALYSIS_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: promptBody,
        },
      ],
    });
    // The SDK returns a content-block array. We only consume `text` blocks
    // and concatenate them in order. Other block types (e.g. tool_use) are
    // not expected here — we don't pass tools — but ignoring them is safer
    // than throwing if the model returns an unexpected shape.
    const textParts: string[] = [];
    for (const block of response.content) {
      if (block.type === "text") {
        textParts.push(block.text);
      }
    }
    rawText = textParts.join("\n").trim();
  } catch (err) {
    return {
      ok: false,
      reason: "model_call_failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  if (!rawText) {
    return { ok: false, reason: "empty_response" };
  }

  // The compliance gate. If this filter rejects, we do NOT return any of
  // the model output — even partially — because that would defeat the
  // point of having the filter. The caller falls back to a static template.
  const filtered = filterFactualOutput(rawText);
  if (!filtered.ok) {
    return {
      ok: false,
      reason: "compliance_filter_failed",
      detail: filtered.reason,
    };
  }

  // Extract bullets so the API response can render structured observations.
  // We accept either Markdown bullets (`-`, `*`) or numbered lines; anything
  // that's not a bullet is dropped (the GAW prefix line, blank lines, etc.).
  const observations = filtered.cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.startsWith("- ") ||
        line.startsWith("* ") ||
        /^\d+\.\s/.test(line),
    )
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, ""))
    .filter((line) => line.length > 0);

  return {
    ok: true,
    observations,
    rawText: filtered.cleaned,
  };
}

/**
 * Convenience: every route response that surfaces analysis output also
 * surfaces the standard short risk-warning CTA. Re-exported here so
 * callers don't import compliance.ts directly just for this constant.
 */
export const ANALYSIS_DISCLAIMER = RISK_WARNING_CTA;
