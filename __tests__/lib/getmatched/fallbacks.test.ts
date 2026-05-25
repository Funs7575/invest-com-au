import { describe, it, expect } from "vitest";
import {
  FALLBACK_INTENTS,
  FALLBACK_QUESTIONS,
  FALLBACK_TEMPLATES,
  getFallbackTemplate,
} from "@/lib/getmatched/fallbacks";
import type { RouteType } from "@/lib/getmatched/types";

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
  it("returns the matching template for each route", () => {
    for (const route of ROUTES) {
      const tpl = getFallbackTemplate(route);
      expect(tpl.route).toBe(route);
    }
  });

  it("falls back to the guide template for an unknown route", () => {
    // Cast through unknown — the runtime fallback handles routes the
    // compiler would normally reject.
    const tpl = getFallbackTemplate("nonsense" as unknown as RouteType);
    expect(tpl.route).toBe("guide");
  });
});

describe("FALLBACK_TEMPLATES integrity", () => {
  it("provides a template for every RouteType", () => {
    for (const route of ROUTES) {
      expect(FALLBACK_TEMPLATES[route]).toBeDefined();
    }
  });

  it("every template has a headline, why_text and a primary CTA href", () => {
    for (const route of ROUTES) {
      const tpl = FALLBACK_TEMPLATES[route];
      expect(tpl.headline.length).toBeGreaterThan(0);
      expect(tpl.why_text.length).toBeGreaterThan(0);
      expect(tpl.primary_cta.href.startsWith("/")).toBe(true);
      expect(tpl.enabled).toBe(true);
    }
  });
});

describe("FALLBACK_INTENTS integrity", () => {
  it("has unique slugs", () => {
    const slugs = FALLBACK_INTENTS.map((i) => i.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every intent's default_route is a valid RouteType", () => {
    for (const intent of FALLBACK_INTENTS) {
      expect(ROUTES).toContain(intent.default_route);
    }
  });

  it("exposes the 13 retail goal slugs", () => {
    const slugs = new Set<string>(FALLBACK_INTENTS.map((i) => i.slug));
    for (const goal of [
      "grow",
      "income",
      "crypto",
      "trade",
      "automate",
      "super",
      "property",
      "home",
      "alt_assets",
      "royalties",
      "pre_ipo",
      "help",
      "browse",
    ]) {
      expect(slugs.has(goal)).toBe(true);
    }
  });
});

describe("FALLBACK_QUESTIONS integrity", () => {
  it("has unique question slugs", () => {
    const slugs = FALLBACK_QUESTIONS.map((q) => q.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every select question carries at least one option with a value + label", () => {
    for (const q of FALLBACK_QUESTIONS) {
      expect(q.options.length).toBeGreaterThan(0);
      for (const opt of q.options) {
        expect(opt.value.length).toBeGreaterThan(0);
        expect(opt.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("orders questions across steps 1 through 7", () => {
    const steps = new Set(FALLBACK_QUESTIONS.map((q) => q.step));
    for (let s = 1; s <= 7; s++) {
      expect(steps.has(s)).toBe(true);
    }
  });
});
