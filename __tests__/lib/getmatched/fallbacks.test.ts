import { describe, it, expect } from "vitest";

import {
  getFallbackTemplate,
  FALLBACK_TEMPLATES,
  FALLBACK_INTENTS,
  FALLBACK_QUESTIONS,
} from "@/lib/getmatched/fallbacks";
import type { ResultTemplate, RouteType } from "@/lib/getmatched/types";

/** Every href referenced by a result template (checklist + CTAs + cross-sells). */
function templateHrefs(template: ResultTemplate): string[] {
  return [
    ...template.checklist.map((item) => item.href),
    template.primary_cta.href,
    ...template.secondary_ctas.map((cta) => cta.href),
    ...template.cross_sells.map((sell) => sell.href),
  ].filter((href): href is string => typeof href === "string");
}

const ROUTES: RouteType[] = [
  "compare",
  "browse",
  "individual",
  "firm",
  "expert_team",
  "investor_brief",
  "listing_brief",
  "second_opinion",
  "guide",
];

describe("getFallbackTemplate", () => {
  it.each(ROUTES)("returns a defined template for route %s", (route) => {
    const template = getFallbackTemplate(route);
    expect(template).toBeDefined();
    expect(template.route).toBe(route);
  });

  it("falls back to the guide template for an unknown route", () => {
    expect(getFallbackTemplate("nonsense" as RouteType)).toBe(FALLBACK_TEMPLATES.guide);
  });
});

describe("FALLBACK_TEMPLATES integrity", () => {
  it("includes a guide template", () => {
    expect(FALLBACK_TEMPLATES.guide).toBeDefined();
  });

  it("every template carries a defined route", () => {
    for (const template of Object.values(FALLBACK_TEMPLATES)) {
      expect(template.route).toBeDefined();
    }
  });

  it("never links to the non-existent /calculators/fee-impact route", () => {
    for (const template of Object.values(FALLBACK_TEMPLATES)) {
      for (const href of templateHrefs(template)) {
        expect(href).not.toContain("/calculators/fee-impact");
      }
    }
  });

  it("points compare's fee-calculator links at the real /fee-impact route", () => {
    const feeLinks = [
      ...FALLBACK_TEMPLATES.compare.checklist,
      ...FALLBACK_TEMPLATES.compare.secondary_ctas,
    ].filter((item) => /fee calculator/i.test(item.label));

    expect(feeLinks.length).toBeGreaterThan(0);
    for (const link of feeLinks) {
      expect(link.href).toBe("/fee-impact");
    }
  });
});

describe("FALLBACK_INTENTS / FALLBACK_QUESTIONS integrity", () => {
  it("ships non-empty intents and questions", () => {
    expect(FALLBACK_INTENTS.length).toBeGreaterThan(0);
    expect(FALLBACK_QUESTIONS.length).toBeGreaterThan(0);
  });

  it("has unique question ids", () => {
    const ids = FALLBACK_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique question slugs", () => {
    const slugs = FALLBACK_QUESTIONS.map((q) => q.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
