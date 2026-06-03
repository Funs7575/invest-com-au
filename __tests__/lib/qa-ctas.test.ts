import { describe, it, expect } from "vitest";
import { QA_CATEGORY_CTAS, ctaForCategory } from "@/lib/qa-ctas";

// ── registry integrity ────────────────────────────────────────────────────────

describe("QA_CATEGORY_CTAS registry", () => {
  it("contains at least 10 entries", () => {
    expect(Object.keys(QA_CATEGORY_CTAS).length).toBeGreaterThanOrEqual(10);
  });

  it("every CTA has a non-empty label and relative href", () => {
    for (const [, cta] of Object.entries(QA_CATEGORY_CTAS)) {
      expect(cta.label.length).toBeGreaterThan(0);
      expect(cta.href.length).toBeGreaterThan(0);
      expect(cta.href).toMatch(/^\//);
    }
  });

  it("includes share_broker, crypto_exchange, super_fund, and advisor categories", () => {
    expect("share_broker" in QA_CATEGORY_CTAS).toBe(true);
    expect("crypto_exchange" in QA_CATEGORY_CTAS).toBe(true);
    expect("super_fund" in QA_CATEGORY_CTAS).toBe(true);
    expect("advisor" in QA_CATEGORY_CTAS).toBe(true);
  });

  it("includes cross-border composite categories", () => {
    expect("cross_border:uk" in QA_CATEGORY_CTAS).toBe(true);
    expect("cross_border:us" in QA_CATEGORY_CTAS).toBe(true);
  });
});

// ── ctaForCategory ────────────────────────────────────────────────────────────

describe("ctaForCategory", () => {
  it("returns the default CTA for null", () => {
    const cta = ctaForCategory(null);
    expect(cta.href).toBe("/find-advisor");
  });

  it("returns the default CTA for undefined", () => {
    const cta = ctaForCategory(undefined);
    expect(cta.href).toBe("/find-advisor");
  });

  it("returns the default CTA for an empty string", () => {
    const cta = ctaForCategory("");
    expect(cta.href).toBe("/find-advisor");
  });

  it("returns the default CTA for an unrecognised category", () => {
    const cta = ctaForCategory("unknown_category_xyz");
    expect(cta.href).toBe("/find-advisor");
    expect(cta.label.length).toBeGreaterThan(0);
  });

  it("returns the correct CTA for share_broker", () => {
    const cta = ctaForCategory("share_broker");
    expect(cta.href).toBe("/share-trading");
    expect(cta.label).toContain("broker");
  });

  it("returns the correct CTA for crypto_exchange", () => {
    const cta = ctaForCategory("crypto_exchange");
    expect(cta.href).toBe("/crypto");
  });

  it("returns the correct CTA for super_fund", () => {
    const cta = ctaForCategory("super_fund");
    expect(cta.href).toBe("/super");
  });

  it("returns the correct CTA for advisor", () => {
    const cta = ctaForCategory("advisor");
    expect(cta.href).toBe("/find-advisor");
  });

  it("returns the correct CTA for cross_border:uk", () => {
    const cta = ctaForCategory("cross_border:uk");
    expect(cta.href).toContain("/find-advisor");
    expect(cta.label.length).toBeGreaterThan(0);
  });

  it("round-trips every registered category", () => {
    for (const [category, expected] of Object.entries(QA_CATEGORY_CTAS)) {
      const result = ctaForCategory(category);
      expect(result).toEqual(expected);
    }
  });
});
