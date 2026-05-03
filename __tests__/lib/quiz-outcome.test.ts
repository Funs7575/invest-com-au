import { describe, it, expect } from "vitest";
import { resolveBestOutcome } from "@/lib/quiz-outcome";

describe("resolveBestOutcome", () => {
  describe("post-job outcome", () => {
    it("routes complex situations with unsure advisor type to post-job", () => {
      const outcome = resolveBestOutcome({
        location: "australia",
        mode: "help",
        complexity: "complex",
        advisor_type: "not-sure",
      });
      expect(outcome.kind).toBe("post-job");
      expect(outcome.ctaHref).toContain("/quotes/post");
      expect(outcome.ctaHref).toContain("context=quiz");
    });

    it("routes international business setup to post-job with country/visa params", () => {
      const outcome = resolveBestOutcome({
        location: "international",
        investor_country: "uk",
        visa_status: "non_resident",
        investor_goal_intl: "business",
      });
      expect(outcome.kind).toBe("post-job");
      expect(outcome.ctaHref).toContain("country=uk");
      expect(outcome.ctaHref).toContain("visa=non_resident");
      expect(outcome.suppressBrokerResults).toBe(true);
    });
  });

  describe("bundle-stack outcome", () => {
    it("routes whale + complex to bundle-stack", () => {
      const outcome = resolveBestOutcome({
        location: "australia",
        amount: "whale",
        complexity: "complex",
        goal: "grow",
      });
      expect(outcome.kind).toBe("bundle-stack");
      expect(outcome.ctaHref).toContain("/advisors/financial-planners");
      expect(outcome.secondaryActions.some(s => s.href.includes("tax-agent"))).toBe(true);
    });
  });

  describe("conversion-first outcomes (was calculator-first, redesigned 2026-05-03)", () => {
    it("routes super goal to SMSF accountant — primary CTA is the conversion path, calc moves to secondary", () => {
      const outcome = resolveBestOutcome({
        location: "australia",
        goal: "super",
        mode: "diy",
        amount: "medium",
      });
      expect(outcome.kind).toBe("advisor-match");
      expect(outcome.ctaHref).toContain("/advisors/smsf-accountants");
      expect(outcome.secondaryActions.some(s => s.href.includes("/retirement-calculator"))).toBe(true);
      expect(outcome.secondaryActions.some(s => s.href.includes("/compare?filter=super"))).toBe(true);
    });

    it("routes property-physical to mortgage broker — calc is secondary, broker leaderboard suppressed", () => {
      const outcome = resolveBestOutcome({
        location: "australia",
        goal: "property",
        property_sub: "physical",
      });
      expect(outcome.kind).toBe("advisor-match");
      expect(outcome.ctaHref).toContain("/advisors/mortgage-brokers");
      expect(outcome.secondaryActions.some(s => s.href.includes("/property-yield-calculator"))).toBe(true);
      expect(outcome.suppressBrokerResults).toBe(true);
    });

    it("routes home-loan goal to mortgage broker — calc is secondary", () => {
      const outcome = resolveBestOutcome({
        location: "australia",
        goal: "home",
        amount: "large",
      });
      expect(outcome.kind).toBe("advisor-match");
      expect(outcome.ctaHref).toContain("/advisors/mortgage-brokers");
      expect(outcome.secondaryActions.some(s => s.href.includes("/mortgage-calculator"))).toBe(true);
    });
  });

  describe("listings-browse outcomes (wave 2 — alt-assets / royalties / pre-IPO, shipped 2026-05-03)", () => {
    it("routes alt-assets goal to /invest/alternatives + luxury-asset advisor + returns calc", () => {
      const outcome = resolveBestOutcome({
        location: "australia",
        goal: "alt-assets",
        mode: "diy",
      });
      expect(outcome.kind).toBe("listings-browse");
      expect(outcome.ctaHref).toBe("/invest/alternatives");
      expect(outcome.suppressBrokerResults).toBe(true);
      expect(outcome.secondaryActions.some(s => s.href.includes("/advisors/luxury-asset-brokers"))).toBe(true);
      expect(outcome.secondaryActions.some(s => s.href.includes("/tools/alternative-returns"))).toBe(true);
    });

    it("routes royalties goal to /invest/royalties + royalty-broker advisor + income-assets cross-sell", () => {
      const outcome = resolveBestOutcome({
        location: "australia",
        goal: "royalties",
      });
      expect(outcome.kind).toBe("listings-browse");
      expect(outcome.ctaHref).toBe("/invest/royalties");
      expect(outcome.secondaryActions.some(s => s.href.includes("/advisors/royalty-brokers"))).toBe(true);
      expect(outcome.secondaryActions.some(s => s.href.includes("/invest/income-assets"))).toBe(true);
    });

    it("routes pre-ipo goal to /invest/pre-ipo + IPO calendar + post-job for criteria", () => {
      const outcome = resolveBestOutcome({
        location: "australia",
        goal: "pre-ipo",
      });
      expect(outcome.kind).toBe("listings-browse");
      expect(outcome.ctaHref).toBe("/invest/pre-ipo");
      expect(outcome.secondaryActions.some(s => s.href.includes("/invest/ipo-calendar"))).toBe(true);
      expect(outcome.secondaryActions.some(s => s.href.includes("/quotes/post"))).toBe(true);
    });
  });

  describe("'other' goal — graceful capture for unrepresented niches", () => {
    it("routes 'other' goal to post-job with quiz context", () => {
      const outcome = resolveBestOutcome({
        location: "australia",
        goal: "other",
      });
      expect(outcome.kind).toBe("post-job");
      expect(outcome.ctaHref).toContain("/quotes/post");
      expect(outcome.ctaHref).toContain("goal=other");
      expect(outcome.suppressBrokerResults).toBe(true);
    });
  });

  describe("education-first outcome", () => {
    it("routes unsure beginners to education-first", () => {
      const outcome = resolveBestOutcome({
        location: "australia",
        mode: "unsure",
        experience: "beginner",
      });
      expect(outcome.kind).toBe("education-first");
      expect(outcome.ctaHref).toBe("/learn");
    });

    it("does not over-fire — intermediate-experience unsure user still gets diy-broker default", () => {
      const outcome = resolveBestOutcome({
        location: "australia",
        mode: "unsure",
        experience: "intermediate",
        goal: "grow",
      });
      expect(outcome.kind).toBe("diy-broker");
    });
  });

  describe("advisor-browse outcome", () => {
    it("routes large-amount help-mode unsure-type to advisor-browse", () => {
      const outcome = resolveBestOutcome({
        location: "australia",
        mode: "help",
        amount: "large",
        advisor_type: "not-sure",
        complexity: "moderate",
      });
      expect(outcome.kind).toBe("advisor-browse");
      expect(outcome.ctaHref).toContain("/find-advisor");
    });
  });

  describe("advisor-match outcome", () => {
    it("routes help-mode with known advisor type to advisor-match", () => {
      const outcome = resolveBestOutcome({
        location: "australia",
        mode: "help",
        advisor_type: "tax-agent",
      });
      expect(outcome.kind).toBe("advisor-match");
    });

    it("routes international users (non-business) to advisor-match", () => {
      const outcome = resolveBestOutcome({
        location: "international",
        investor_country: "singapore",
        investor_goal_intl: "shares",
      });
      expect(outcome.kind).toBe("advisor-match");
    });
  });

  describe("diy-broker default", () => {
    it("falls through for clear DIY goals", () => {
      const outcome = resolveBestOutcome({
        location: "australia",
        goal: "grow",
        mode: "diy",
        experience: "intermediate",
        amount: "medium",
      });
      expect(outcome.kind).toBe("diy-broker");
    });

    it("crypto + DIY also falls through to diy-broker", () => {
      const outcome = resolveBestOutcome({
        location: "australia",
        goal: "crypto",
        mode: "diy",
        experience: "intermediate",
      });
      expect(outcome.kind).toBe("diy-broker");
    });
  });

  describe("URL prefill params", () => {
    it("attaches goal/amount/complexity to post-job URL", () => {
      const outcome = resolveBestOutcome({
        location: "australia",
        mode: "help",
        complexity: "complex",
        advisor_type: "not-sure",
        goal: "super",
        amount: "large",
      });
      expect(outcome.ctaHref).toContain("goal=super");
      expect(outcome.ctaHref).toContain("amount=large");
      expect(outcome.ctaHref).toContain("complexity=complex");
    });

    it("compare URL in diy-broker secondary carries quiz signals", () => {
      const outcome = resolveBestOutcome({
        location: "australia",
        goal: "grow",
        mode: "diy",
        amount: "medium",
        priority: "fees",
        experience: "beginner",
      });
      const compareLink = outcome.secondaryActions.find(s => s.href.startsWith("/compare"));
      expect(compareLink).toBeDefined();
      expect(compareLink?.href).toContain("quiz_amount=medium");
      expect(compareLink?.href).toContain("quiz_priority=fees");
      expect(compareLink?.href).toContain("quiz_experience=beginner");
    });
  });
});
