import { describe, it, expect } from "vitest";
import { getInvestGuide, genericGuide, INVEST_GUIDE_CONTENT } from "@/lib/invest-guides";
import { getOpportunityCategories } from "@/lib/invest-categories";

describe("invest-guides content", () => {
  const cats = getOpportunityCategories();

  it("every opportunity vertical resolves to non-empty guide content", () => {
    for (const c of cats) {
      const g = getInvestGuide(c.slug, c.label);
      expect(g.howTo.length).toBeGreaterThanOrEqual(3);
      expect(g.minimum.length).toBeGreaterThan(20);
      expect(g.tax.length).toBeGreaterThan(20);
      expect(g.risks.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("hand-authored content exists for the core verticals", () => {
    for (const slug of ["buy-business", "commercial-property", "mining", "funds", "bullion", "water-rights", "carbon-credits", "sda-housing"]) {
      expect(INVEST_GUIDE_CONTENT[slug]).toBeDefined();
    }
  });

  it("genericGuide is tailored with the label and never empty", () => {
    const g = genericGuide("Widgets");
    expect(g.howTo[0]).toContain("widgets");
    expect(g.tax).toMatch(/CGT|tax/i);
    expect(g.risks.length).toBeGreaterThanOrEqual(3);
  });

  it("tax sections reference real AU tax concepts", () => {
    // Spot-check that authored entries aren't boilerplate.
    expect(INVEST_GUIDE_CONTENT["startups"]!.tax).toMatch(/ESIC|ESVCLP/);
    expect(INVEST_GUIDE_CONTENT["bullion"]!.tax).toMatch(/GST|CGT/);
    expect(INVEST_GUIDE_CONTENT["funds"]!.tax).toMatch(/franking|MIT/i);
    expect(INVEST_GUIDE_CONTENT["sda-housing"]!.tax).toMatch(/depreciation|Division/i);
  });
});
