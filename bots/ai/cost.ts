/**
 * AI cost accounting + budget enforcement for the bot fleet.
 *
 * Pure module. The AI-driven driver (a later phase) feeds token usage from
 * every Anthropic response into a CostLedger. The ledger:
 *   - converts tokens → USD using a model price table,
 *   - accumulates per-run spend,
 *   - enforces a hard dollar budget so a runaway loop can't burn money,
 *   - exposes totals for the run report so each run is cost-attributable.
 *
 * This is the engineering half of "charge the bots separately": spend is
 * bounded, measured, and reported per run. The *billing* half (which Anthropic
 * account/key the spend lands on) is set by the BOTS_ANTHROPIC_API_KEY env the
 * driver reads — point it at a dedicated key/project and the cost shows up on
 * that line, isolated from this dev session's subscription usage.
 */

export interface ModelPricing {
  /** USD per 1,000,000 input tokens. */
  inputPerMTok: number;
  /** USD per 1,000,000 output tokens. */
  outputPerMTok: number;
}

/**
 * Approximate list prices (USD / MTok). Adjust if Anthropic pricing changes —
 * these drive the budget guard and the reported cost, so erring slightly high
 * is the safe direction (we'd stop spending sooner, not later).
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  opus: { inputPerMTok: 15, outputPerMTok: 75 },
  sonnet: { inputPerMTok: 3, outputPerMTok: 15 },
  haiku: { inputPerMTok: 0.8, outputPerMTok: 4 },
};

/** Conservative default for unknown model ids — mid-tier (sonnet) pricing. */
const DEFAULT_PRICING: ModelPricing = MODEL_PRICING.sonnet ?? {
  inputPerMTok: 3,
  outputPerMTok: 15,
};

export function pricingFor(model: string): ModelPricing {
  const m = model.toLowerCase();
  if (m.includes("opus")) return MODEL_PRICING.opus ?? DEFAULT_PRICING;
  if (m.includes("sonnet")) return MODEL_PRICING.sonnet ?? DEFAULT_PRICING;
  if (m.includes("haiku")) return MODEL_PRICING.haiku ?? DEFAULT_PRICING;
  return DEFAULT_PRICING;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface CostTotals {
  inputTokens: number;
  outputTokens: number;
  usd: number;
  calls: number;
}

export function estimateUsd(model: string, usage: TokenUsage): number {
  const p = pricingFor(model);
  return (
    (usage.inputTokens / 1_000_000) * p.inputPerMTok +
    (usage.outputTokens / 1_000_000) * p.outputPerMTok
  );
}

export class CostLedger {
  private inputTokens = 0;
  private outputTokens = 0;
  private usd = 0;
  private calls = 0;

  /** @param budgetUsd hard cap; 0 means "no dollar cap" (token cap may still apply). */
  constructor(private readonly budgetUsd: number) {}

  /** Record one API call's usage. Returns marginal + cumulative USD. */
  record(model: string, usage: TokenUsage): { marginalUsd: number; totalUsd: number } {
    const marginalUsd = estimateUsd(model, usage);
    this.inputTokens += usage.inputTokens;
    this.outputTokens += usage.outputTokens;
    this.usd += marginalUsd;
    this.calls += 1;
    return { marginalUsd, totalUsd: this.usd };
  }

  get totals(): CostTotals {
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      usd: this.usd,
      calls: this.calls,
    };
  }

  exceededBudget(): boolean {
    return this.budgetUsd > 0 && this.usd >= this.budgetUsd;
  }

  remainingUsd(): number {
    if (this.budgetUsd <= 0) return Number.POSITIVE_INFINITY;
    return Math.max(0, this.budgetUsd - this.usd);
  }
}
