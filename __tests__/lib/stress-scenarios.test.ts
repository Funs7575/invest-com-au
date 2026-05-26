import { describe, it, expect } from "vitest";
import { runStressTest, STRESS_SCENARIOS, ASSET_CLASS_LABELS, type PortfolioAllocation } from "@/lib/stress-scenarios";

const ALL_EQUITY: PortfolioAllocation = {
  au_equities: 50,
  intl_equities: 50,
  au_property: 0,
  bonds: 0,
  cash: 0,
};

const BALANCED: PortfolioAllocation = {
  au_equities: 30,
  intl_equities: 30,
  au_property: 10,
  bonds: 20,
  cash: 10,
};

const ALL_CASH: PortfolioAllocation = {
  au_equities: 0,
  intl_equities: 0,
  au_property: 0,
  bonds: 0,
  cash: 100,
};

describe("STRESS_SCENARIOS", () => {
  it("defines the expected 5 scenarios", () => {
    expect(STRESS_SCENARIOS).toHaveLength(5);
    const ids = STRESS_SCENARIOS.map((s) => s.id);
    expect(ids).toContain("gfc_2008");
    expect(ids).toContain("covid_2020");
    expect(ids).toContain("dotcom_2000");
    expect(ids).toContain("rate_hikes_2022");
    expect(ids).toContain("black_monday_1987");
  });

  it("each scenario has required fields", () => {
    for (const s of STRESS_SCENARIOS) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.period).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.drawdowns).toBeDefined();
    }
  });

  it("GFC has negative AU equity drawdown", () => {
    const gfc = STRESS_SCENARIOS.find((s) => s.id === "gfc_2008")!;
    expect(gfc.drawdowns.au_equities).toBeLessThan(-40);
  });

  it("rate_hikes_2022 has negative bond drawdown", () => {
    const rh = STRESS_SCENARIOS.find((s) => s.id === "rate_hikes_2022")!;
    expect(rh.drawdowns.bonds).toBeLessThan(0);
  });
});

describe("runStressTest", () => {
  it("returns a result for each scenario", () => {
    const results = runStressTest(BALANCED);
    expect(results).toHaveLength(STRESS_SCENARIOS.length);
  });

  it("all-equity portfolio has severe GFC drawdown", () => {
    const results = runStressTest(ALL_EQUITY);
    const gfc = results.find((r) => r.scenarioId === "gfc_2008")!;
    // 50% AU equity (-54%) + 50% intl (-48%) → ~-51%
    expect(gfc.portfolioDrawdownPct).toBeLessThan(-45);
  });

  it("all-cash portfolio has near-zero drawdown in equity crashes", () => {
    const results = runStressTest(ALL_CASH);
    const gfc = results.find((r) => r.scenarioId === "gfc_2008")!;
    // Cash was positive during GFC (central bank easing)
    expect(gfc.portfolioDrawdownPct).toBeGreaterThan(-5);
  });

  it("balanced portfolio has smaller drawdown than all-equity", () => {
    const equityResults = runStressTest(ALL_EQUITY);
    const balancedResults = runStressTest(BALANCED);
    const equityGfc = equityResults.find((r) => r.scenarioId === "gfc_2008")!;
    const balancedGfc = balancedResults.find((r) => r.scenarioId === "gfc_2008")!;
    expect(balancedGfc.portfolioDrawdownPct).toBeGreaterThan(equityGfc.portfolioDrawdownPct);
  });

  it("contributions array has one entry per asset class", () => {
    const results = runStressTest(BALANCED);
    const first = results[0]!;
    expect(first.contributions).toHaveLength(5);
  });

  it("contribution.contributionPct is allocationPct/100 × scenarioDrawdownPct", () => {
    const results = runStressTest(BALANCED);
    const gfc = results.find((r) => r.scenarioId === "gfc_2008")!;
    const auEquityContrib = gfc.contributions.find((c) => c.assetClass === "au_equities")!;
    const expected = (auEquityContrib.allocationPct / 100) * auEquityContrib.scenarioDrawdownPct;
    expect(auEquityContrib.contributionPct).toBeCloseTo(expected, 5);
  });

  it("portfolioDrawdownPct rounds to 1 decimal", () => {
    const results = runStressTest(BALANCED);
    for (const r of results) {
      const str = r.portfolioDrawdownPct.toString();
      const decimals = str.includes(".") ? str.split(".")[1]!.length : 0;
      expect(decimals).toBeLessThanOrEqual(1);
    }
  });

  it("handles zero allocation gracefully", () => {
    const results = runStressTest({
      au_equities: 0,
      intl_equities: 0,
      au_property: 0,
      bonds: 0,
      cash: 0,
    });
    for (const r of results) {
      expect(r.portfolioDrawdownPct).toBe(0);
    }
  });

  it("result scenario names match STRESS_SCENARIOS", () => {
    const results = runStressTest(BALANCED);
    for (const r of results) {
      const scenario = STRESS_SCENARIOS.find((s) => s.id === r.scenarioId);
      expect(scenario).toBeDefined();
      expect(r.scenarioName).toBe(scenario!.name);
    }
  });
});

describe("ASSET_CLASS_LABELS", () => {
  it("has a label for every asset class", () => {
    const classes = ["au_equities", "intl_equities", "au_property", "bonds", "cash"];
    for (const cls of classes) {
      expect(ASSET_CLASS_LABELS[cls as keyof typeof ASSET_CLASS_LABELS]).toBeTruthy();
    }
  });
});
