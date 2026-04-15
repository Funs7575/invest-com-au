import { describe, it, expect } from "vitest";
import {
  TIERS,
  getTier,
  prorateUpgradeCents,
  isUpgrade,
} from "@/lib/advisor-tiers";

describe("TIERS catalogue", () => {
  it("has 4 tiers in ascending price order", () => {
    expect(TIERS).toHaveLength(4);
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].monthlyPriceCents).toBeGreaterThanOrEqual(
        TIERS[i - 1].monthlyPriceCents,
      );
    }
  });

  it("every tier has a label + leadFeeMultiplier in [0.5, 1.0]", () => {
    for (const t of TIERS) {
      expect(t.label).toBeTruthy();
      expect(t.leadFeeMultiplier).toBeGreaterThanOrEqual(0.5);
      expect(t.leadFeeMultiplier).toBeLessThanOrEqual(1.0);
    }
  });

  it("annual price is cheaper than 12×monthly (real discount)", () => {
    for (const t of TIERS) {
      if (t.monthlyPriceCents === 0) continue;
      expect(t.annualPriceCents).toBeLessThan(t.monthlyPriceCents * 12);
    }
  });
});

describe("getTier", () => {
  it("finds each tier by id", () => {
    for (const t of TIERS) {
      expect(getTier(t.id)?.id).toBe(t.id);
    }
  });

  it("returns null for unknown", () => {
    expect(getTier("platinum-plus")).toBeNull();
  });
});

describe("isUpgrade", () => {
  it("free → growth is an upgrade", () => {
    expect(isUpgrade("free", "growth")).toBe(true);
  });

  it("pro → free is not an upgrade", () => {
    expect(isUpgrade("pro", "free")).toBe(false);
  });

  it("same tier is not an upgrade", () => {
    expect(isUpgrade("pro", "pro")).toBe(false);
  });
});

describe("prorateUpgradeCents", () => {
  it("zero days remaining means zero proration", () => {
    expect(prorateUpgradeCents("free", "pro", 0)).toBe(0);
  });

  it("full cycle charges the full difference", () => {
    const pro = getTier("pro")!;
    const free = getTier("free")!;
    const result = prorateUpgradeCents("free", "pro", 30, 30);
    expect(result).toBe(pro.monthlyPriceCents - free.monthlyPriceCents);
  });

  it("half cycle charges half the difference", () => {
    const pro = getTier("pro")!;
    const result = prorateUpgradeCents("free", "pro", 15, 30);
    expect(result).toBe(Math.round(pro.monthlyPriceCents / 2));
  });

  it("downgrade (pro → growth) returns a negative (credit owed)", () => {
    const result = prorateUpgradeCents("pro", "growth", 15, 30);
    expect(result).toBeLessThan(0);
  });

  it("annual billing uses annual prices", () => {
    const growthAnnual = getTier("growth")!.annualPriceCents;
    const result = prorateUpgradeCents("free", "growth", 365, 365, "annual");
    expect(result).toBe(growthAnnual);
  });
});
