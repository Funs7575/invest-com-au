/**
 * __tests__/lib/quiz-broker-match-reasons.test.ts
 *
 * Unit tests for the attribute-driven broker match reasons function.
 * The critical invariant: no reason is asserted unless the broker has
 * the attribute that supports it.
 */
import { describe, it, expect } from "vitest";
import { getBrokerMatchReasons } from "@/lib/quiz-broker-match-reasons";
import type { Broker } from "@/lib/types";

/** Minimal broker factory — only set the fields under test */
function mkBroker(overrides: Partial<Broker>): Broker {
  return {
    id: 1,
    name: "Test Broker",
    slug: "test-broker",
    color: "#f59e0b",
    chess_sponsored: false,
    smsf_support: false,
    is_crypto: false,
    platform_type: "share_broker",
    deal: false,
    editors_pick: false,
    status: "active",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    ...overrides,
  } as Broker;
}

describe("getBrokerMatchReasons", () => {
  describe("beginner-friendly claim — attribute-gated", () => {
    it("does NOT assert beginner-friendly for a generic share broker with no beginner signals in pros", () => {
      const broker = mkBroker({ pros: ["Low fees", "Wide market access"] });
      const reasons = getBrokerMatchReasons({ answers: ["beginner"] }, broker);
      expect(reasons.some(r => r.toLowerCase().includes("beginner"))).toBe(false);
    });

    it("asserts beginner-friendly when broker.pros contains 'simple'", () => {
      const broker = mkBroker({ pros: ["Simple app", "Easy signup"] });
      const reasons = getBrokerMatchReasons({ answers: ["beginner"], experience: "beginner" }, broker);
      expect(reasons.some(r => r.toLowerCase().includes("beginner"))).toBe(true);
    });

    it("asserts beginner-friendly for robo_advisor (categorically hands-off)", () => {
      const broker = mkBroker({ platform_type: "robo_advisor" });
      const reasons = getBrokerMatchReasons({ answers: ["automate"], goal: "automate" }, broker);
      expect(reasons.some(r => r.toLowerCase().includes("hands-off") || r.toLowerCase().includes("automat"))).toBe(true);
    });
  });

  describe("fee-sensitivity claim — attribute-gated", () => {
    it("does NOT assert low-fee for a broker with no asx_fee_value", () => {
      const broker = mkBroker({ asx_fee: "variable", asx_fee_value: undefined });
      const reasons = getBrokerMatchReasons({ answers: ["fees"], priority: "fees" }, broker);
      expect(reasons.some(r => r.toLowerCase().includes("low brokerage"))).toBe(false);
    });

    it("does NOT assert low-fee for a broker with asx_fee_value >= $10", () => {
      const broker = mkBroker({ asx_fee_value: 1995 }); // $19.95
      const reasons = getBrokerMatchReasons({ answers: ["fees"], priority: "fees" }, broker);
      expect(reasons.some(r => r.toLowerCase().includes("low brokerage"))).toBe(false);
    });

    it("asserts low-fee for a broker with asx_fee_value < $10 and user prioritises fees", () => {
      const broker = mkBroker({ asx_fee: "$2.00", asx_fee_value: 200, platform_type: "share_broker" });
      const reasons = getBrokerMatchReasons({ answers: ["fees"], priority: "fees" }, broker);
      expect(reasons.some(r => r.toLowerCase().includes("low brokerage") || r.includes("$2.00"))).toBe(true);
    });
  });

  describe("CHESS sponsored claim", () => {
    it("asserts CHESS only when broker.chess_sponsored = true and priority=safety", () => {
      const chessBroker = mkBroker({ chess_sponsored: true });
      const nonChessBroker = mkBroker({ chess_sponsored: false });
      expect(
        getBrokerMatchReasons({ answers: ["safety"], priority: "safety" }, chessBroker)
          .some(r => r.toLowerCase().includes("chess")),
      ).toBe(true);
      expect(
        getBrokerMatchReasons({ answers: ["safety"], priority: "safety" }, nonChessBroker)
          .some(r => r.toLowerCase().includes("chess")),
      ).toBe(false);
    });
  });

  describe("rating claim", () => {
    it("shows 'Highly rated' for rating >= 4.5", () => {
      const broker = mkBroker({ rating: 4.7 });
      const reasons = getBrokerMatchReasons({ answers: [] }, broker);
      expect(reasons.some(r => r.includes("4.7") && r.toLowerCase().includes("rated"))).toBe(true);
    });

    it("does NOT show 'Highly rated' for rating < 4.5", () => {
      const broker = mkBroker({ rating: 4.3 });
      const reasons = getBrokerMatchReasons({ answers: [] }, broker);
      expect(reasons.some(r => r.toLowerCase().includes("highly rated"))).toBe(false);
    });
  });

  describe("platform-type anchor reasons", () => {
    it("crypto exchange gets regulated-exchange anchor", () => {
      const broker = mkBroker({ platform_type: "crypto_exchange", is_crypto: true });
      const reasons = getBrokerMatchReasons({ answers: ["crypto"], goal: "crypto" }, broker);
      expect(reasons.some(r => r.toLowerCase().includes("crypto"))).toBe(true);
    });

    it("robo_advisor gets automated-portfolio anchor", () => {
      const broker = mkBroker({ platform_type: "robo_advisor" });
      const reasons = getBrokerMatchReasons({ answers: [] }, broker);
      expect(reasons[0]).toContain("Automated portfolio management");
    });

    it("research_tool gets analysis-tools anchor", () => {
      const broker = mkBroker({ platform_type: "research_tool" });
      const reasons = getBrokerMatchReasons({ answers: [] }, broker);
      expect(reasons[0]).toContain("analysis tools");
    });
  });

  describe("SMSF support", () => {
    it("asserts SMSF support only when broker.smsf_support = true", () => {
      const smsf = mkBroker({ smsf_support: true });
      const noSmsf = mkBroker({ smsf_support: false });
      expect(
        getBrokerMatchReasons({ answers: ["super"], goal: "super" }, smsf)
          .some(r => r.toLowerCase().includes("smsf")),
      ).toBe(true);
      expect(
        getBrokerMatchReasons({ answers: ["super"], goal: "super" }, noSmsf)
          .some(r => r.toLowerCase().includes("smsf")),
      ).toBe(false);
    });
  });

  describe("max and dedup", () => {
    it("never returns more than max reasons (default 4)", () => {
      const broker = mkBroker({
        platform_type: "share_broker",
        chess_sponsored: true,
        smsf_support: true,
        rating: 4.8,
        asx_fee_value: 500,
        asx_fee: "$5",
      });
      const reasons = getBrokerMatchReasons(
        { answers: ["fees", "safety", "super", "grow", "large"], priority: "fees", goal: "grow", experience: "pro" },
        broker,
      );
      expect(reasons.length).toBeLessThanOrEqual(4);
    });

    it("never returns duplicate reasons", () => {
      const broker = mkBroker({ rating: 4.9 });
      const reasons = getBrokerMatchReasons({ answers: [] }, broker);
      const lc = reasons.map(r => r.toLowerCase());
      expect(new Set(lc).size).toBe(lc.length);
    });
  });

  describe("fallback", () => {
    it("returns at least one reason even for an empty context broker", () => {
      const broker = mkBroker({});
      const reasons = getBrokerMatchReasons({ answers: [] }, broker);
      expect(reasons.length).toBeGreaterThan(0);
    });
  });
});
