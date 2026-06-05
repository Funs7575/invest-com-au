import { describe, it, expect } from "vitest";
import { BEST_FOR_COMBOS, getBestForCombo } from "@/lib/invest-best-for";
import { listingMatchesCombo } from "@/lib/invest-best-for-data";
import { getInvestCategoryBySlug } from "@/lib/invest-categories";
import type { InvestmentListing, InvestListingVertical } from "@/lib/types";

function listing(
  vertical: string,
  sub_category?: string,
): Pick<InvestmentListing, "vertical" | "sub_category"> {
  return { vertical: vertical as InvestListingVertical, sub_category };
}

describe("BEST_FOR_COMBOS integrity", () => {
  it("has unique slugs", () => {
    const slugs = BEST_FOR_COMBOS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every combo carries the required authored fields", () => {
    for (const c of BEST_FOR_COMBOS) {
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.intro.length).toBeGreaterThan(40);
      expect(c.why.length).toBeGreaterThanOrEqual(3);
      expect(c.filterQuery.length).toBeGreaterThan(0);
      expect(c.verticalLabel.length).toBeGreaterThan(0);
      expect(c.profileLabel.length).toBeGreaterThan(0);
    }
  });

  it("every combo's display category resolves to a real /invest category", () => {
    for (const c of BEST_FOR_COMBOS) {
      expect(getInvestCategoryBySlug(c.categorySlug), c.slug).toBeDefined();
    }
  });

  it("deep-link filterQuery never points at a non-existent category=sda-housing dead-end", () => {
    // SDA listings resolve to the commercial-property bucket on the client,
    // so the deep-link must use the sub filter, not category=sda-housing.
    const sda = getBestForCombo("sda-housing-for-smsf");
    expect(sda?.filterQuery).toContain("sub=sda_housing");
    expect(sda?.filterQuery).not.toContain("category=sda-housing");
  });

  it("getBestForCombo returns the combo or undefined", () => {
    expect(getBestForCombo("bullion-for-smsf")?.slug).toBe("bullion-for-smsf");
    expect(getBestForCombo("does-not-exist")).toBeUndefined();
  });
});

describe("listingMatchesCombo", () => {
  const commercialSmsf = getBestForCombo("commercial-property-for-smsf")!;
  const sdaSmsf = getBestForCombo("sda-housing-for-smsf")!;
  const fundsRetirees = getBestForCombo("funds-for-retirees")!;
  const renewables = getBestForCombo("renewable-energy-for-impact-investors")!;

  it("matches a plain commercial-property listing to the commercial combo", () => {
    expect(listingMatchesCombo(listing("commercial_property", "office"), commercialSmsf)).toBe(true);
  });

  it("matches drifted vertical strings (renewable-energy → energy)", () => {
    expect(listingMatchesCombo(listing("renewable-energy", "solar"), renewables)).toBe(true);
  });

  it("matches SDA listings to the SDA combo via matchCategory + subCategory", () => {
    expect(listingMatchesCombo(listing("commercial_property", "sda_housing"), sdaSmsf)).toBe(true);
  });

  it("does not match non-SDA commercial property to the SDA combo", () => {
    expect(listingMatchesCombo(listing("commercial_property", "office"), sdaSmsf)).toBe(false);
  });

  it("includes SDA listings under the broader commercial combo (no sub filter)", () => {
    expect(listingMatchesCombo(listing("commercial_property", "sda_housing"), commercialSmsf)).toBe(true);
  });

  it("excludes guide-vertical sector-hub listings from the funds combo", () => {
    // oil-gas / uranium listings fall back to the 'funds' bucket via
    // categoryForListing, but are not canonical verticals and must not
    // pollute the income-funds combo.
    expect(listingMatchesCombo(listing("oil-gas", "Refining & Retail"), fundsRetirees)).toBe(false);
    expect(listingMatchesCombo(listing("uranium", "Uranium Producer"), fundsRetirees)).toBe(false);
  });

  it("matches genuine fund listings to the funds combo", () => {
    expect(listingMatchesCombo(listing("fund", "managed_fund"), fundsRetirees)).toBe(true);
    // drifted 'funds' vertical also resolves to the funds bucket
    expect(listingMatchesCombo(listing("funds", "managed_fund"), fundsRetirees)).toBe(true);
  });
});
