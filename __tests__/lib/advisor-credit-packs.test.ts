import { describe, it, expect } from "vitest";
import {
  LEAD_CREDIT_PACKS,
  MARKETPLACE_CREDIT_PACKS,
  ADDON_PACKS,
  getPack,
} from "@/lib/advisor-credit-packs";

describe("getPack", () => {
  it("resolves a lead-credit pack by slug", () => {
    const pack = getPack("growth");
    expect(pack?.slug).toBe("growth");
    expect(pack?.isCredit).toBe(true);
    expect(pack?.badge).toBe("Most Popular");
  });

  it("resolves a marketplace pack by slug", () => {
    expect(getPack("marketplace_50")?.name).toBe("50 Credits");
  });

  it("resolves an add-on (non-credit) pack by slug", () => {
    const pack = getPack("featured_monthly");
    expect(pack?.isCredit).toBe(false);
    expect(pack?.leads).toBe(0);
  });

  it("returns null for unknown / null / undefined slugs", () => {
    expect(getPack("nope")).toBeNull();
    expect(getPack(null)).toBeNull();
    expect(getPack(undefined)).toBeNull();
    expect(getPack("")).toBeNull();
  });
});

describe("credit-pack catalogue integrity", () => {
  const allPacks = [...LEAD_CREDIT_PACKS, ...MARKETPLACE_CREDIT_PACKS, ...ADDON_PACKS];

  it("has globally-unique slugs across all three groups", () => {
    const slugs = allPacks.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("credit packs bundle leads; add-on packs do not", () => {
    for (const p of [...LEAD_CREDIT_PACKS, ...MARKETPLACE_CREDIT_PACKS]) {
      expect(p.isCredit).toBe(true);
      expect(p.leads).toBeGreaterThan(0);
    }
    for (const p of ADDON_PACKS) {
      expect(p.isCredit).toBe(false);
    }
  });

  it("per-lead cents is within rounding distance of priceCents / leads", () => {
    // Editorial sometimes rounds the headline per-lead figure down to a
    // tidy number, so allow a 1c slack rather than asserting exact Math.round.
    for (const p of [...LEAD_CREDIT_PACKS, ...MARKETPLACE_CREDIT_PACKS]) {
      const exact = p.priceCents / p.leads;
      expect(Math.abs(p.perLeadCents - exact)).toBeLessThanOrEqual(1);
    }
  });

  it("every pack has a positive price and a label", () => {
    for (const p of allPacks) {
      expect(p.priceCents).toBeGreaterThan(0);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
    }
  });
});
