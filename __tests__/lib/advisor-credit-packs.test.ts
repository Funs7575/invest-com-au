import { describe, it, expect } from "vitest";
import {
  LEAD_CREDIT_PACKS,
  MARKETPLACE_CREDIT_PACKS,
  ADDON_PACKS,
  getPack,
} from "@/lib/advisor-credit-packs";

// ─── getPack ──────────────────────────────────────────────────────────────────

describe("getPack", () => {
  it('returns the starter pack with correct priceCents, leads, and isCredit', () => {
    const pack = getPack("starter");
    expect(pack).not.toBeNull();
    expect(pack!.slug).toBe("starter");
    expect(pack!.priceCents).toBe(19900);
    expect(pack!.leads).toBe(5);
    expect(pack!.isCredit).toBe(true);
  });

  it('returns the growth pack with "Most Popular" badge', () => {
    const pack = getPack("growth");
    expect(pack).not.toBeNull();
    expect(pack!.slug).toBe("growth");
    expect(pack!.badge).toBe("Most Popular");
  });

  it('returns the scale pack with "Best Value" badge', () => {
    const pack = getPack("scale");
    expect(pack).not.toBeNull();
    expect(pack!.slug).toBe("scale");
    expect(pack!.badge).toBe("Best Value");
  });

  it('returns the marketplace_50 pack with correct perLeadCents', () => {
    const pack = getPack("marketplace_50");
    expect(pack).not.toBeNull();
    expect(pack!.slug).toBe("marketplace_50");
    expect(pack!.perLeadCents).toBe(898);
    expect(pack!.leads).toBe(50);
    expect(pack!.priceCents).toBe(44900);
  });

  it('returns featured_monthly with isCredit = false', () => {
    const pack = getPack("featured_monthly");
    expect(pack).not.toBeNull();
    expect(pack!.isCredit).toBe(false);
  });

  it('returns expert_article with isCredit = false', () => {
    const pack = getPack("expert_article");
    expect(pack).not.toBeNull();
    expect(pack!.isCredit).toBe(false);
  });

  it('returns null for null input', () => {
    expect(getPack(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(getPack(undefined)).toBeNull();
  });

  it('returns null for a nonexistent slug', () => {
    expect(getPack("nonexistent")).toBeNull();
    expect(getPack("premium_pack")).toBeNull();
    expect(getPack("")).toBeNull();
  });
});

// ─── LEAD_CREDIT_PACKS ────────────────────────────────────────────────────────

describe("LEAD_CREDIT_PACKS", () => {
  it("all LEAD_CREDIT_PACKS have isCredit = true", () => {
    for (const pack of LEAD_CREDIT_PACKS) {
      expect(pack.isCredit).toBe(true);
    }
  });

  it("contains exactly starter, growth, and scale", () => {
    const slugs = LEAD_CREDIT_PACKS.map((p) => p.slug);
    expect(slugs).toContain("starter");
    expect(slugs).toContain("growth");
    expect(slugs).toContain("scale");
    expect(slugs).toHaveLength(3);
  });

  it("starter pack has correct values", () => {
    const starter = LEAD_CREDIT_PACKS.find((p) => p.slug === "starter");
    expect(starter).toBeDefined();
    expect(starter!.priceCents).toBe(19900);
    expect(starter!.leads).toBe(5);
    expect(starter!.perLeadCents).toBe(3980);
  });

  it("growth pack has correct values and Most Popular badge", () => {
    const growth = LEAD_CREDIT_PACKS.find((p) => p.slug === "growth");
    expect(growth).toBeDefined();
    expect(growth!.priceCents).toBe(44900);
    expect(growth!.leads).toBe(12);
    expect(growth!.perLeadCents).toBe(3742);
    expect(growth!.badge).toBe("Most Popular");
  });

  it("scale pack has correct values and Best Value badge", () => {
    const scale = LEAD_CREDIT_PACKS.find((p) => p.slug === "scale");
    expect(scale).toBeDefined();
    expect(scale!.priceCents).toBe(79900);
    expect(scale!.leads).toBe(25);
    expect(scale!.perLeadCents).toBe(3196);
    expect(scale!.badge).toBe("Best Value");
  });

  it("scale is the cheapest per-lead among LEAD_CREDIT_PACKS", () => {
    const sorted = [...LEAD_CREDIT_PACKS].sort((a, b) => a.perLeadCents - b.perLeadCents);
    expect(sorted[0]!.slug).toBe("scale");
  });

  it("per-lead cost is consistent with priceCents / leads (within 1 cent rounding)", () => {
    for (const pack of LEAD_CREDIT_PACKS) {
      const computed = pack.priceCents / pack.leads;
      expect(Math.abs(pack.perLeadCents - computed)).toBeLessThanOrEqual(1);
    }
  });
});

// ─── MARKETPLACE_CREDIT_PACKS ─────────────────────────────────────────────────

describe("MARKETPLACE_CREDIT_PACKS", () => {
  it("all MARKETPLACE_CREDIT_PACKS have isCredit = true", () => {
    for (const pack of MARKETPLACE_CREDIT_PACKS) {
      expect(pack.isCredit).toBe(true);
    }
  });

  it("contains marketplace_10, marketplace_50, and marketplace_200", () => {
    const slugs = MARKETPLACE_CREDIT_PACKS.map((p) => p.slug);
    expect(slugs).toContain("marketplace_10");
    expect(slugs).toContain("marketplace_50");
    expect(slugs).toContain("marketplace_200");
    expect(slugs).toHaveLength(3);
  });

  it("marketplace_50 has correct values and Most Popular badge", () => {
    const pack = MARKETPLACE_CREDIT_PACKS.find((p) => p.slug === "marketplace_50");
    expect(pack).toBeDefined();
    expect(pack!.priceCents).toBe(44900);
    expect(pack!.leads).toBe(50);
    expect(pack!.perLeadCents).toBe(898);
    expect(pack!.badge).toBe("Most Popular");
  });

  it("marketplace_200 has Best Value badge", () => {
    const pack = MARKETPLACE_CREDIT_PACKS.find((p) => p.slug === "marketplace_200");
    expect(pack).toBeDefined();
    expect(pack!.badge).toBe("Best Value");
  });

  it("per-lead cost is consistent with priceCents / leads (within 1 cent rounding)", () => {
    for (const pack of MARKETPLACE_CREDIT_PACKS) {
      const computed = pack.priceCents / pack.leads;
      expect(Math.abs(pack.perLeadCents - computed)).toBeLessThanOrEqual(1);
    }
  });
});

// ─── ADDON_PACKS ──────────────────────────────────────────────────────────────

describe("ADDON_PACKS", () => {
  it("all ADDON_PACKS have isCredit = false", () => {
    for (const pack of ADDON_PACKS) {
      expect(pack.isCredit).toBe(false);
    }
  });

  it("contains featured_monthly and expert_article", () => {
    const slugs = ADDON_PACKS.map((p) => p.slug);
    expect(slugs).toContain("featured_monthly");
    expect(slugs).toContain("expert_article");
    expect(slugs).toHaveLength(2);
  });

  it("featured_monthly has correct values", () => {
    const pack = ADDON_PACKS.find((p) => p.slug === "featured_monthly");
    expect(pack).toBeDefined();
    expect(pack!.priceCents).toBe(14900);
    expect(pack!.leads).toBe(0);
    expect(pack!.perLeadCents).toBe(0);
  });

  it("expert_article has correct values", () => {
    const pack = ADDON_PACKS.find((p) => p.slug === "expert_article");
    expect(pack).toBeDefined();
    expect(pack!.priceCents).toBe(29900);
    expect(pack!.leads).toBe(0);
    expect(pack!.perLeadCents).toBe(0);
  });

  it("addon packs have no badge field", () => {
    for (const pack of ADDON_PACKS) {
      expect(pack.badge).toBeUndefined();
    }
  });
});

// ─── Cross-pack integrity ─────────────────────────────────────────────────────

describe("cross-pack integrity", () => {
  const allPacks = [...LEAD_CREDIT_PACKS, ...MARKETPLACE_CREDIT_PACKS, ...ADDON_PACKS];

  it("no two packs share the same slug", () => {
    const slugs = allPacks.map((p) => p.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it("getPack resolves every defined pack slug", () => {
    for (const pack of allPacks) {
      const resolved = getPack(pack.slug);
      expect(resolved).not.toBeNull();
      expect(resolved!.slug).toBe(pack.slug);
    }
  });

  it("badge field is present only on growth and scale (lead packs) and marketplace_50 and marketplace_200", () => {
    const badgedSlugs = allPacks
      .filter((p) => p.badge !== undefined)
      .map((p) => p.slug)
      .sort();
    expect(badgedSlugs).toEqual(
      ["growth", "marketplace_200", "marketplace_50", "scale"].sort(),
    );
  });

  it("starter pack has no badge", () => {
    const starter = getPack("starter");
    expect(starter!.badge).toBeUndefined();
  });

  it("marketplace_10 pack has no badge", () => {
    const pack = getPack("marketplace_10");
    expect(pack!.badge).toBeUndefined();
  });

  it("all packs have positive priceCents", () => {
    for (const pack of allPacks) {
      expect(pack.priceCents).toBeGreaterThan(0);
    }
  });
});
