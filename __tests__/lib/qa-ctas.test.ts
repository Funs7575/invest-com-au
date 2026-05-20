import { describe, it, expect } from "vitest";
import { QA_CATEGORY_CTAS, ctaForCategory } from "@/lib/qa-ctas";

describe("ctaForCategory", () => {
  it("returns the mapped CTA for a known platform-type category", () => {
    expect(ctaForCategory("share_broker")).toEqual({
      label: "Compare share brokers",
      href: "/share-trading",
    });
    expect(ctaForCategory("crypto_exchange")).toEqual({
      label: "Compare crypto exchanges",
      href: "/crypto",
    });
  });

  it("resolves cross-border specialty categories to a pre-filled advisor URL", () => {
    expect(ctaForCategory("cross_border:uk").href).toBe(
      "/find-advisor?specialty=UK+Pension+Transfer",
    );
    expect(ctaForCategory("cross_border:firb").href).toContain("/find-advisor?specialty=");
  });

  it("falls back to /find-advisor for an unmapped category", () => {
    expect(ctaForCategory("totally_unknown")).toEqual({
      label: "Find a licensed financial advisor",
      href: "/find-advisor",
    });
  });

  it("falls back to /find-advisor for null / undefined / empty", () => {
    const expected = { label: "Find a licensed financial advisor", href: "/find-advisor" };
    expect(ctaForCategory(null)).toEqual(expected);
    expect(ctaForCategory(undefined)).toEqual(expected);
    expect(ctaForCategory("")).toEqual(expected);
  });

  it("is case-sensitive (uppercase variants fall back)", () => {
    expect(ctaForCategory("SHARE_BROKER").href).toBe("/find-advisor");
  });
});

describe("QA_CATEGORY_CTAS data integrity", () => {
  it("every CTA has a non-empty label and a relative href", () => {
    for (const [, cta] of Object.entries(QA_CATEGORY_CTAS)) {
      expect(cta.label.length).toBeGreaterThan(0);
      expect(cta.href.startsWith("/")).toBe(true);
    }
  });
});
