import { describe, it, expect } from "vitest";
import {
  getPack,
  LEAD_CREDIT_PACKS,
  MARKETPLACE_CREDIT_PACKS,
  ADDON_PACKS,
} from "@/lib/advisor-credit-packs";

// ── getPack ───────────────────────────────────────────────────────────────────

describe("getPack", () => {
  it("returns null for null", () => {
    expect(getPack(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(getPack(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getPack("")).toBeNull();
  });

  it("returns null for an unrecognised slug", () => {
    expect(getPack("enterprise")).toBeNull();
  });

  it("returns the starter pack for 'starter'", () => {
    const pack = getPack("starter");
    expect(pack).not.toBeNull();
    expect(pack!.slug).toBe("starter");
    expect(pack!.leads).toBe(5);
    expect(pack!.priceCents).toBe(19900);
  });

  it("returns the growth pack for 'growth'", () => {
    const pack = getPack("growth");
    expect(pack!.slug).toBe("growth");
    expect(pack!.leads).toBe(12);
  });

  it("returns the scale pack for 'scale'", () => {
    const pack = getPack("scale");
    expect(pack!.slug).toBe("scale");
    expect(pack!.leads).toBe(25);
  });

  it("returns the featured_monthly addon pack", () => {
    const pack = getPack("featured_monthly");
    expect(pack!.slug).toBe("featured_monthly");
    expect(pack!.isCredit).toBe(false);
    expect(pack!.leads).toBe(0);
  });

  it("returns the expert_article addon pack", () => {
    const pack = getPack("expert_article");
    expect(pack!.isCredit).toBe(false);
  });

  it("returns marketplace_10 pack", () => {
    const pack = getPack("marketplace_10");
    expect(pack!.slug).toBe("marketplace_10");
    expect(pack!.leads).toBe(10);
  });

  it("returns marketplace_50 pack", () => {
    const pack = getPack("marketplace_50");
    expect(pack!.leads).toBe(50);
  });

  it("returns marketplace_200 pack", () => {
    const pack = getPack("marketplace_200");
    expect(pack!.leads).toBe(200);
  });
});

// ── LEAD_CREDIT_PACKS ─────────────────────────────────────────────────────────

describe("LEAD_CREDIT_PACKS", () => {
  it("contains exactly 3 packs", () => {
    expect(LEAD_CREDIT_PACKS).toHaveLength(3);
  });

  it("all packs are isCredit=true", () => {
    for (const pack of LEAD_CREDIT_PACKS) {
      expect(pack.isCredit).toBe(true);
    }
  });

  it("all packs have leads > 0", () => {
    for (const pack of LEAD_CREDIT_PACKS) {
      expect(pack.leads).toBeGreaterThan(0);
    }
  });

  it("all packs have priceCents > 0", () => {
    for (const pack of LEAD_CREDIT_PACKS) {
      expect(pack.priceCents).toBeGreaterThan(0);
    }
  });

  it("perLeadCents is consistent with priceCents / leads (within 2%)", () => {
    for (const pack of LEAD_CREDIT_PACKS) {
      const implied = pack.priceCents / pack.leads;
      expect(pack.perLeadCents).toBeCloseTo(implied, -1);
    }
  });

  it("slugs are starter, growth, scale in order", () => {
    expect(LEAD_CREDIT_PACKS.map((p) => p.slug)).toEqual(["starter", "growth", "scale"]);
  });

  it("packs are ordered by price ascending", () => {
    for (let i = 1; i < LEAD_CREDIT_PACKS.length; i++) {
      expect(LEAD_CREDIT_PACKS[i]!.priceCents).toBeGreaterThan(LEAD_CREDIT_PACKS[i - 1]!.priceCents);
    }
  });

  it("scale has the lowest perLeadCents (best value)", () => {
    const perLead = LEAD_CREDIT_PACKS.map((p) => p.perLeadCents);
    const minPerLead = Math.min(...perLead);
    expect(getPack("scale")!.perLeadCents).toBe(minPerLead);
  });

  it("badge values are 'Most Popular' or 'Best Value' when present", () => {
    const validBadges = new Set(["Most Popular", "Best Value"]);
    for (const pack of LEAD_CREDIT_PACKS) {
      if (pack.badge !== undefined) {
        expect(validBadges.has(pack.badge)).toBe(true);
      }
    }
  });
});

// ── MARKETPLACE_CREDIT_PACKS ──────────────────────────────────────────────────

describe("MARKETPLACE_CREDIT_PACKS", () => {
  it("contains exactly 3 packs", () => {
    expect(MARKETPLACE_CREDIT_PACKS).toHaveLength(3);
  });

  it("all packs are isCredit=true", () => {
    for (const pack of MARKETPLACE_CREDIT_PACKS) {
      expect(pack.isCredit).toBe(true);
    }
  });

  it("slugs are marketplace_10, marketplace_50, marketplace_200", () => {
    expect(MARKETPLACE_CREDIT_PACKS.map((p) => p.slug)).toEqual([
      "marketplace_10",
      "marketplace_50",
      "marketplace_200",
    ]);
  });

  it("leads counts match slug suffix", () => {
    expect(getPack("marketplace_10")!.leads).toBe(10);
    expect(getPack("marketplace_50")!.leads).toBe(50);
    expect(getPack("marketplace_200")!.leads).toBe(200);
  });
});

// ── ADDON_PACKS ───────────────────────────────────────────────────────────────

describe("ADDON_PACKS", () => {
  it("contains exactly 2 packs", () => {
    expect(ADDON_PACKS).toHaveLength(2);
  });

  it("all packs are isCredit=false", () => {
    for (const pack of ADDON_PACKS) {
      expect(pack.isCredit).toBe(false);
    }
  });

  it("all packs have leads=0 and perLeadCents=0", () => {
    for (const pack of ADDON_PACKS) {
      expect(pack.leads).toBe(0);
      expect(pack.perLeadCents).toBe(0);
    }
  });
});

// ── cross-pack invariants ─────────────────────────────────────────────────────

describe("cross-pack invariants", () => {
  const allPacks = [...LEAD_CREDIT_PACKS, ...MARKETPLACE_CREDIT_PACKS, ...ADDON_PACKS];

  it("no duplicate slugs across all packs", () => {
    const slugs = allPacks.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every pack slug is retrievable via getPack", () => {
    for (const pack of allPacks) {
      expect(getPack(pack.slug)).toEqual(pack);
    }
  });

  it("all packs have a non-empty name and description", () => {
    for (const pack of allPacks) {
      expect(pack.name.length).toBeGreaterThan(0);
      expect(pack.description.length).toBeGreaterThan(0);
    }
  });
});
