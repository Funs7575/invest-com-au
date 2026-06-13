import { describe, it, expect } from "vitest";
import { dueDiligenceForCategory } from "@/lib/listings/due-diligence";

describe("dueDiligenceForCategory", () => {
  const CATEGORIES = [
    "farmland",
    "commercial-property",
    "buy-business",
    "franchise",
    "mining",
    "water-rights",
    "renewable-energy",
  ];

  it("every covered category gets specific items ahead of the base set", () => {
    for (const slug of CATEGORIES) {
      const { items } = dueDiligenceForCategory(slug);
      expect(items.length, slug).toBeGreaterThan(4);
      // Base items close the list.
      expect(items[items.length - 1]?.id).toBe("funds_path");
    }
  });

  it("unknown categories still get the universal base checklist", () => {
    const { items, note } = dueDiligenceForCategory("royalties");
    expect(items.map((i) => i.id)).toEqual([
      "identity",
      "contract_review",
      "independent_valuation",
      "funds_path",
    ]);
    expect(note).toMatch(/not legal, tax or financial advice/);
  });

  it("ids are unique within every category's list", () => {
    for (const slug of [...CATEGORIES, "royalties"]) {
      const { items } = dueDiligenceForCategory(slug);
      expect(new Set(items.map((i) => i.id)).size, slug).toBe(items.length);
    }
  });

  it("settlement-scam wording is always present", () => {
    const { items } = dueDiligenceForCategory("farmland");
    expect(items.find((i) => i.id === "funds_path")?.detail).toMatch(/redirection scams/);
  });
});
