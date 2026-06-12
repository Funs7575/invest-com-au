import { describe, expect, it } from "vitest";
import { DEFAULT_COST_INPUTS, describeCostInputs } from "@/lib/compare-engine";

describe("describeCostInputs (Northstar D9 chip)", () => {
  it("describes the default inputs in plain English", () => {
    expect(describeCostInputs(DEFAULT_COST_INPUTS)).toBe(
      "2 ASX trades/mo at $1k · $25k balance",
    );
  });

  it("includes US trading only when present", () => {
    expect(
      describeCostInputs({
        tradesPerMonth: 1,
        averageTradeSize: 500,
        usTradesPerMonth: 2,
        averageUsTradeSize: 1500,
        portfolioBalance: 10000,
      }),
    ).toBe("1 ASX trade/mo at $500 · 2 US trades/mo at $1,500 · $10k balance");
  });

  it("prefers the scenario label when one is active", () => {
    expect(describeCostInputs(DEFAULT_COST_INPUTS, "Casual investor")).toBe("Casual investor");
  });

  it("pluralises correctly at one trade", () => {
    expect(
      describeCostInputs({
        tradesPerMonth: 1,
        averageTradeSize: 1000,
        usTradesPerMonth: 1,
        averageUsTradeSize: 1000,
        portfolioBalance: 5000,
      }),
    ).toBe("1 ASX trade/mo at $1k · 1 US trade/mo at $1k · $5k balance");
  });
});
