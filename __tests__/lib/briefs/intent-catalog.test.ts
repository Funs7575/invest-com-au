import { describe, it, expect } from "vitest";

import {
  INTENT_CATALOG,
  INTENT_GROUPS,
  getIntentById,
  intentForTemplate,
  popularIntents,
  intentsForGroup,
  searchIntents,
} from "@/lib/briefs/intent-catalog";
import { BRIEF_TEMPLATES } from "@/lib/briefs/templates";

describe("intent catalog — integrity", () => {
  it("every intent maps to a real brief_template", () => {
    for (const intent of INTENT_CATALOG) {
      expect(BRIEF_TEMPLATES).toContain(intent.template);
    }
  });

  it("covers all 14 brief templates at least once", () => {
    const covered = new Set(INTENT_CATALOG.map((i) => i.template));
    for (const t of BRIEF_TEMPLATES) {
      expect(covered.has(t)).toBe(true);
    }
  });

  it("has unique intent ids", () => {
    const ids = INTENT_CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every intent belongs to a declared group", () => {
    const groupIds = new Set(INTENT_GROUPS.map((g) => g.id));
    for (const intent of INTENT_CATALOG) {
      expect(groupIds.has(intent.group)).toBe(true);
    }
  });

  it("every intent has at least one keyword and one example", () => {
    for (const intent of INTENT_CATALOG) {
      expect(intent.keywords.length).toBeGreaterThan(0);
      expect(intent.examples.length).toBeGreaterThan(0);
    }
  });
});

describe("intent catalog — lookups", () => {
  it("getIntentById resolves a known id and returns undefined otherwise", () => {
    expect(getIntentById("mortgage")?.template).toBe("mortgage");
    expect(getIntentById("does-not-exist")).toBeUndefined();
    expect(getIntentById(null)).toBeUndefined();
  });

  it("intentForTemplate returns a canonical intent for each template", () => {
    expect(intentForTemplate("financial_adviser")?.id).toBeDefined();
    expect(intentForTemplate(null)).toBeUndefined();
  });

  it("popularIntents returns only popular entries", () => {
    const pop = popularIntents();
    expect(pop.length).toBeGreaterThan(0);
    expect(pop.every((i) => i.popular)).toBe(true);
  });

  it("intentsForGroup filters by group", () => {
    const advice = intentsForGroup("advice");
    expect(advice.every((i) => i.group === "advice")).toBe(true);
    expect(advice.length).toBeGreaterThan(0);
  });
});

describe("intent catalog — search", () => {
  it("returns the full catalog for an empty query", () => {
    expect(searchIntents("").length).toBe(INTENT_CATALOG.length);
    expect(searchIntents("   ").length).toBe(INTENT_CATALOG.length);
  });

  it("matches quiz-style vocabulary to the right template", () => {
    expect(searchIntents("refinance")[0]?.template).toBe("mortgage");
    expect(searchIntents("FIRB")[0]?.template).toBe("foreign_investor");
    expect(searchIntents("CGT")[0]?.template).toBe("tax");
    expect(searchIntents("sell my business")[0]?.template).toBe("listing");
    expect(searchIntents("second opinion")[0]?.template).toBe("second_opinion");
  });

  it("ranks a label match above a loose keyword match", () => {
    const results = searchIntents("tax");
    expect(results[0]?.template).toBe("tax");
  });

  it("is case-insensitive", () => {
    expect(searchIntents("MORTGAGE")[0]?.template).toBe("mortgage");
  });

  it("returns an empty array when nothing matches", () => {
    expect(searchIntents("zzzqqxnomatch")).toEqual([]);
  });
});
