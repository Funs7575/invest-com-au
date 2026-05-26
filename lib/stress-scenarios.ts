/**
 * Portfolio stress-test scenarios (PR 8.2).
 *
 * Each scenario represents a documented historical market crisis with
 * peak-to-trough drawdown estimates by broad asset class.
 * Sources: ASX, RBA, Bloomberg published historical data.
 *
 * General information only — not personal financial advice.
 * Estimates use broad asset-class drawdowns, not individual securities.
 * No DB calls. Fully unit-testable.
 */

export type AssetClass = "au_equities" | "intl_equities" | "au_property" | "bonds" | "cash";

export interface StressScenario {
  id: string;
  name: string;
  period: string;
  description: string;
  /** Peak-to-trough change per asset class, in percentage points (negative = loss). */
  drawdowns: Record<AssetClass, number>;
}

export interface PortfolioAllocation {
  /** Percentage (0–100) allocated to each asset class. Must sum to ≤ 100. */
  au_equities: number;
  intl_equities: number;
  au_property: number;
  bonds: number;
  cash: number;
}

export interface StressResult {
  scenarioId: string;
  scenarioName: string;
  /** Estimated portfolio drawdown in percentage points (negative = loss). */
  portfolioDrawdownPct: number;
  /** Breakdown: each asset class's contribution to the drawdown. */
  contributions: Array<{
    assetClass: AssetClass;
    allocationPct: number;
    scenarioDrawdownPct: number;
    contributionPct: number;
  }>;
}

// Historical crisis drawdowns by asset class.
// Peak-to-trough, in percentage points.
// Sources: ASX, RBA, Bloomberg, S&P Global published research.
export const STRESS_SCENARIOS: StressScenario[] = [
  {
    id: "gfc_2008",
    name: "Global Financial Crisis (2008–09)",
    period: "Nov 2007 – Mar 2009",
    description: "The worst downturn since the Great Depression, triggered by the US subprime mortgage collapse.",
    drawdowns: {
      au_equities:   -54,
      intl_equities: -48,
      au_property:    -8,
      bonds:          +7,
      cash:           +4,
    },
  },
  {
    id: "covid_2020",
    name: "COVID-19 Crash (2020)",
    period: "Feb – Mar 2020",
    description: "The fastest bear market in history, driven by pandemic-related economic shutdowns.",
    drawdowns: {
      au_equities:   -38,
      intl_equities: -34,
      au_property:    -5,
      bonds:          +5,
      cash:           +1,
    },
  },
  {
    id: "dotcom_2000",
    name: "Dot-com Bust (2000–02)",
    period: "Mar 2000 – Oct 2002",
    description: "The collapse of inflated technology company valuations after the internet bubble burst.",
    drawdowns: {
      au_equities:   -30,
      intl_equities: -48,
      au_property:    +5,
      bonds:         +10,
      cash:           +5,
    },
  },
  {
    id: "rate_hikes_2022",
    name: "Rate-Hike Cycle (2022)",
    period: "Jan – Oct 2022",
    description: "Coordinated central bank rate increases to fight post-pandemic inflation hurt both equities and bonds.",
    drawdowns: {
      au_equities:    -8,
      intl_equities: -20,
      au_property:   -12,
      bonds:         -15,
      cash:           +2,
    },
  },
  {
    id: "black_monday_1987",
    name: "Black Monday (1987)",
    period: "Aug – Dec 1987",
    description: "A single-day crash of 20%+ on global equity markets, the largest one-day drop in modern history.",
    drawdowns: {
      au_equities:   -50,
      intl_equities: -32,
      au_property:    +2,
      bonds:          +6,
      cash:           +5,
    },
  },
];

/**
 * Compute estimated portfolio drawdown for a given allocation across all scenarios.
 *
 * Each scenario result = sum of (allocationPct / 100) × scenarioDrawdownPct for each class.
 */
export function runStressTest(allocation: PortfolioAllocation): StressResult[] {
  return STRESS_SCENARIOS.map((scenario) => {
    let portfolioDrawdownPct = 0;
    const contributions: StressResult["contributions"] = [];

    const classes: AssetClass[] = ["au_equities", "intl_equities", "au_property", "bonds", "cash"];
    for (const assetClass of classes) {
      const allocationPct = allocation[assetClass];
      const scenarioDrawdownPct = scenario.drawdowns[assetClass];
      const contributionPct = (allocationPct / 100) * scenarioDrawdownPct;
      portfolioDrawdownPct += contributionPct;
      contributions.push({ assetClass, allocationPct, scenarioDrawdownPct, contributionPct });
    }

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      portfolioDrawdownPct: Math.round(portfolioDrawdownPct * 10) / 10,
      contributions,
    };
  });
}

/** Asset-class display labels. */
export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  au_equities:   "Australian Equities",
  intl_equities: "International Equities",
  au_property:   "Australian Property",
  bonds:         "Bonds / Fixed Income",
  cash:          "Cash / Term Deposits",
};
