import { describe, it, expect } from "vitest";
import { getCostScenarioBySlug, getAllCostScenarios, getAllCostScenarioSlugs } from "@/lib/cost-scenarios";
import type { Broker } from "@/lib/types";

function makeBroker(overrides: Partial<Broker> = {}): Broker {
  return {
    id: 1, name: "TestBroker", slug: "testbroker",
    affiliate_url: null, asx_fee: "$5", asx_fee_value: 5,
    us_fee: "$2", us_fee_value: 2, fx_rate: 0.5,
    inactivity_fee: null, rating: 4.0, deal: false,
    deal_text: null, deal_terms: null, deal_expiry: null,
    cta_text: null, benefit_cta: null, is_crypto: false,
    chess_sponsored: true, regulated_by: "ASIC",
    year_founded: 2010, created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
    ...overrides,
  } as Broker;
}

describe("getAllCostScenarios", () => {
  it("returns at least 5 scenarios", () => {
    expect(getAllCostScenarios().length).toBeGreaterThanOrEqual(5);
  });

  it("each scenario has required fields", () => {
    for (const s of getAllCostScenarios()) {
      expect(s.slug).toBeTruthy();
      expect(s.title).toBeTruthy();
      expect(typeof s.filter).toBe("function");
      expect(typeof s.calculateAnnualCost).toBe("function");
      expect(typeof s.sort).toBe("function");
    }
  });
});

describe("getAllCostScenarioSlugs", () => {
  it("returns unique slugs", () => {
    const slugs = getAllCostScenarioSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("includes known scenarios", () => {
    const slugs = getAllCostScenarioSlugs();
    expect(slugs).toContain("10-trades-month");
    expect(slugs).toContain("us-shares-5000");
    expect(slugs).toContain("beginner-500");
  });
});

describe("getCostScenarioBySlug", () => {
  it("returns scenario for valid slug", () => {
    const scenario = getCostScenarioBySlug("10-trades-month");
    expect(scenario).toBeDefined();
    expect(scenario!.slug).toBe("10-trades-month");
  });

  it("returns undefined for invalid slug", () => {
    expect(getCostScenarioBySlug("nonexistent")).toBeUndefined();
  });
});

describe("10-trades-month cost calculation", () => {
  const scenario = getCostScenarioBySlug("10-trades-month")!;

  it("calculates $5/trade × 10 × 12 = $600", () => {
    const broker = makeBroker({ asx_fee_value: 5, inactivity_fee: null });
    expect(scenario.calculateAnnualCost(broker)).toBe(600);
  });

  it("adds $10/month inactivity = $120", () => {
    const broker = makeBroker({ asx_fee_value: 0, inactivity_fee: "$10/month" });
    expect(scenario.calculateAnnualCost(broker)).toBe(120);
  });

  it("adds $50/qtr inactivity = $200", () => {
    const broker = makeBroker({ asx_fee_value: 0, inactivity_fee: "$50/qtr" });
    expect(scenario.calculateAnnualCost(broker)).toBe(200);
  });

  it("handles None inactivity fee", () => {
    const broker = makeBroker({ asx_fee_value: 5, inactivity_fee: "None" });
    expect(scenario.calculateAnnualCost(broker)).toBe(600);
  });

  it("handles $0 inactivity fee", () => {
    const broker = makeBroker({ asx_fee_value: 5, inactivity_fee: "$0" });
    expect(scenario.calculateAnnualCost(broker)).toBe(600);
  });

  it("$0 brokerage + no inactivity = $0", () => {
    const broker = makeBroker({ asx_fee_value: 0, inactivity_fee: null });
    expect(scenario.calculateAnnualCost(broker)).toBe(0);
  });

  it("filters out crypto brokers", () => {
    expect(scenario.filter(makeBroker({ is_crypto: true }))).toBe(false);
  });

  it("filters out null asx_fee_value", () => {
    expect(scenario.filter(makeBroker({ asx_fee_value: null as unknown as number }))).toBe(false);
  });

  it("sorts cheapest first", () => {
    const cheap = makeBroker({ asx_fee_value: 0 });
    const expensive = makeBroker({ asx_fee_value: 10 });
    expect(scenario.sort(cheap, expensive)).toBeLessThan(0);
  });
});

describe("us-shares-5000 cost calculation", () => {
  const scenario = getCostScenarioBySlug("us-shares-5000")!;

  it("calculates $2 brokerage + 0.5% FX of $5000 = $27", () => {
    const broker = makeBroker({ us_fee_value: 2, fx_rate: 0.5 });
    expect(scenario.calculateAnnualCost(broker)).toBe(27);
  });

  it("$0 brokerage + 0.7% FX = $35", () => {
    const broker = makeBroker({ us_fee_value: 0, fx_rate: 0.7 });
    expect(scenario.calculateAnnualCost(broker)).toBe(35);
  });

  it("filters out brokers without US fees", () => {
    expect(scenario.filter(makeBroker({ us_fee_value: null as unknown as number }))).toBe(false);
  });

  it("filters out brokers without FX rate", () => {
    expect(scenario.filter(makeBroker({ us_fee_value: 2, fx_rate: null as unknown as number }))).toBe(false);
  });
});
