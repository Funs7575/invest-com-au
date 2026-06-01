import { describe, it, expect } from "vitest";
import { pricingFor, estimateUsd, CostLedger, MODEL_PRICING } from "../../bots/ai/cost";

describe("pricingFor", () => {
  it("maps model families by substring", () => {
    expect(pricingFor("claude-opus-4-8")).toBe(MODEL_PRICING.opus);
    expect(pricingFor("claude-sonnet-4-6")).toBe(MODEL_PRICING.sonnet);
    expect(pricingFor("claude-haiku-4-5-20251001")).toBe(MODEL_PRICING.haiku);
  });
  it("falls back to sonnet (conservative middle) for unknown models", () => {
    expect(pricingFor("some-future-model")).toBe(MODEL_PRICING.sonnet);
  });
});

describe("estimateUsd", () => {
  it("computes opus 1M in / 1M out as $90", () => {
    expect(estimateUsd("claude-opus-4-8", { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBeCloseTo(90);
  });
  it("scales linearly", () => {
    expect(estimateUsd("claude-haiku-4-5", { inputTokens: 500_000, outputTokens: 0 })).toBeCloseTo(0.4);
  });
});

describe("CostLedger", () => {
  it("accumulates tokens, cost and call count", () => {
    const ledger = new CostLedger(0);
    ledger.record("claude-sonnet-4-6", { inputTokens: 1_000_000, outputTokens: 0 }); // $3
    const { totalUsd } = ledger.record("claude-sonnet-4-6", { inputTokens: 0, outputTokens: 1_000_000 }); // +$15
    expect(totalUsd).toBeCloseTo(18);
    expect(ledger.totals.calls).toBe(2);
    expect(ledger.totals.inputTokens).toBe(1_000_000);
    expect(ledger.totals.outputTokens).toBe(1_000_000);
  });

  it("never reports exceeded with a 0 (disabled) budget", () => {
    const ledger = new CostLedger(0);
    ledger.record("claude-opus-4-8", { inputTokens: 10_000_000, outputTokens: 10_000_000 });
    expect(ledger.exceededBudget()).toBe(false);
    expect(ledger.remainingUsd()).toBe(Number.POSITIVE_INFINITY);
  });

  it("trips the budget guard once spend reaches the cap", () => {
    const ledger = new CostLedger(10); // $10 cap
    ledger.record("claude-sonnet-4-6", { inputTokens: 1_000_000, outputTokens: 0 }); // $3
    expect(ledger.exceededBudget()).toBe(false);
    expect(ledger.remainingUsd()).toBeCloseTo(7);
    ledger.record("claude-sonnet-4-6", { inputTokens: 0, outputTokens: 1_000_000 }); // +$15 -> $18
    expect(ledger.exceededBudget()).toBe(true);
    expect(ledger.remainingUsd()).toBe(0);
  });
});
