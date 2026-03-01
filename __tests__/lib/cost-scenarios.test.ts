import { describe, it, expect } from "vitest";
import { getCostScenarioBySlug, getAllCostScenarios } from "@/lib/cost-scenarios";

describe("cost-scenarios", () => {
  describe("getAllCostScenarios", () => {
    it("returns all scenarios as an array", () => {
      const all = getAllCostScenarios();
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBeGreaterThanOrEqual(5);
    });

    it("includes expected scenario slugs", () => {
      const slugs = getAllCostScenarios().map((s) => s.slug);
      expect(slugs).toContain("10-trades-month");
      expect(slugs).toContain("us-shares-5000");
      expect(slugs).toContain("beginner-500");
      expect(slugs).toContain("monthly-dca-1000");
      expect(slugs).toContain("us-shares-monthly");
    });

    it("every scenario has slug, name, filter, calculateAnnualCost, and sort", () => {
      for (const scenario of getAllCostScenarios()) {
        expect(typeof scenario.slug).toBe("string");
        expect(typeof scenario.name).toBe("string");
        expect(typeof scenario.filter).toBe("function");
        expect(typeof scenario.calculateAnnualCost).toBe("function");
        expect(typeof scenario.sort).toBe("function");
      }
    });
  });

  describe("getCostScenarioBySlug", () => {
    it("finds the 10-trades-month scenario", () => {
      const scenario = getCostScenarioBySlug("10-trades-month");
      expect(scenario).toBeDefined();
      expect(scenario!.slug).toBe("10-trades-month");
    });

    it("returns undefined for unknown slug", () => {
      const scenario = getCostScenarioBySlug("nonexistent-slug");
      expect(scenario).toBeUndefined();
    });
  });

  describe("10-trades-month scenario", () => {
    const scenario = getCostScenarioBySlug("10-trades-month")!;

    describe("filter", () => {
      it("rejects crypto brokers", () => {
        const cryptoBroker = { is_crypto: true, asx_fee_value: 5 } as any;
        expect(scenario.filter(cryptoBroker)).toBe(false);
      });

      it("rejects brokers with null asx_fee_value", () => {
        const noFeeBroker = { is_crypto: false, asx_fee_value: null } as any;
        expect(scenario.filter(noFeeBroker)).toBe(false);
      });

      it("accepts valid ASX brokers", () => {
        const validBroker = { is_crypto: false, asx_fee_value: 5 } as any;
        expect(scenario.filter(validBroker)).toBe(true);
      });

      it("accepts brokers with zero fee", () => {
        const freeBroker = { is_crypto: false, asx_fee_value: 0 } as any;
        expect(scenario.filter(freeBroker)).toBe(true);
      });
    });

    describe("calculateAnnualCost", () => {
      it("calculates cost for broker with no inactivity fee", () => {
        const broker = { asx_fee_value: 5, inactivity_fee: "None" } as any;
        // 5 * 10 trades * 12 months = 600
        expect(scenario.calculateAnnualCost(broker)).toBe(600);
      });

      it("includes monthly inactivity fee in annual cost", () => {
        const broker = {
          asx_fee_value: 10,
          inactivity_fee: "$10/month",
        } as any;
        // (10 * 10 * 12) + (10 * 12) = 1200 + 120 = 1320
        expect(scenario.calculateAnnualCost(broker)).toBe(1320);
      });

      it("calculates zero cost for $0 brokerage with no inactivity fee", () => {
        const broker = { asx_fee_value: 0, inactivity_fee: "No" } as any;
        expect(scenario.calculateAnnualCost(broker)).toBe(0);
      });

      it("returns a non-negative number", () => {
        const broker = { asx_fee_value: 3, inactivity_fee: "None" } as any;
        expect(scenario.calculateAnnualCost(broker)).toBeGreaterThanOrEqual(0);
      });
    });

    describe("sort", () => {
      it("sorts cheaper broker first", () => {
        const cheapBroker = {
          asx_fee_value: 0,
          inactivity_fee: "None",
        } as any;
        const expensiveBroker = {
          asx_fee_value: 10,
          inactivity_fee: "None",
        } as any;
        expect(scenario.sort(cheapBroker, expensiveBroker)).toBeLessThan(0);
      });

      it("sorts expensive broker second", () => {
        const cheapBroker = {
          asx_fee_value: 0,
          inactivity_fee: "None",
        } as any;
        const expensiveBroker = {
          asx_fee_value: 10,
          inactivity_fee: "None",
        } as any;
        expect(scenario.sort(expensiveBroker, cheapBroker)).toBeGreaterThan(0);
      });

      it("returns 0 for equal-cost brokers", () => {
        const brokerA = { asx_fee_value: 5, inactivity_fee: "None" } as any;
        const brokerB = { asx_fee_value: 5, inactivity_fee: "None" } as any;
        expect(scenario.sort(brokerA, brokerB)).toBe(0);
      });

      it("is consistent with calculateAnnualCost ordering", () => {
        const cheap = { asx_fee_value: 0, inactivity_fee: "None" } as any;
        const mid = { asx_fee_value: 5, inactivity_fee: "None" } as any;
        const expensive = { asx_fee_value: 20, inactivity_fee: "None" } as any;

        const costCheap = scenario.calculateAnnualCost(cheap);
        const costMid = scenario.calculateAnnualCost(mid);
        const costExpensive = scenario.calculateAnnualCost(expensive);

        expect(costCheap).toBeLessThan(costMid);
        expect(costMid).toBeLessThan(costExpensive);
        expect(scenario.sort(cheap, mid)).toBeLessThan(0);
        expect(scenario.sort(mid, expensive)).toBeLessThan(0);
      });
    });
  });

  describe("beginner-500 scenario", () => {
    const scenario = getCostScenarioBySlug("beginner-500");

    it("exists and has a name", () => {
      expect(scenario).toBeDefined();
      expect(typeof scenario!.name).toBe("string");
    });

    it("filters out crypto brokers", () => {
      const cryptoBroker = { is_crypto: true, asx_fee_value: 5 } as any;
      expect(scenario!.filter(cryptoBroker)).toBe(false);
    });
  });

  describe("us-shares-5000 scenario", () => {
    const scenario = getCostScenarioBySlug("us-shares-5000");

    it("exists and has a name", () => {
      expect(scenario).toBeDefined();
      expect(typeof scenario!.name).toBe("string");
    });
  });
});
