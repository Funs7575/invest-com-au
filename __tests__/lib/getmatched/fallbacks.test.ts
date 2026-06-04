import { describe, it, expect } from "vitest";

import {
  getFallbackTemplate,
  FALLBACK_TEMPLATES,
  FALLBACK_INTENTS,
  FALLBACK_QUESTIONS,
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
