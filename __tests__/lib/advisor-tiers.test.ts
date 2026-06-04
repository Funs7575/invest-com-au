import { describe, it, expect } from "vitest";
import {
  TIERS,
  getTier,
  prorateUpgradeCents,
  isUpgrade,
  type AdvisorTier,
} from "@/lib/advisor-tiers";

const TIER_IDS: AdvisorTier[] = ["free", "growth", "pro", "elite"];

// ── TIERS registry ────────────────────────────────────────────────────────────

describe("TIERS registry", () => {
  it("contains exactly 4 tiers", () => {
    expect(TIERS).toHaveLength(4);
  });

  it("tier ids are free, growth, pro, elite in that order", () => {
    expect(TIERS.map((t) => t.id)).toEqual(TIER_IDS);
  });

  it.each(TIER_IDS)("%s tier has required non-null fields", (id) => {
    const tier = getTier(id)!;
    expect(tier.label.length).toBeGreaterThan(0);
    expect(typeof tier.monthlyPriceCents).toBe("number");
    expect(typeof tier.annualPriceCents).toBe("number");
    expect(tier.leadFeeMultiplier).toBeGreaterThan(0);
    expect(tier.features.length).toBeGreaterThan(0);
    expect(typeof tier.sponsoredBoost).toBe("number");
  });

  it("free tier has 0 monthly price", () => {
    expect(getTier("free")!.monthlyPriceCents).toBe(0);
  });

  it("monthly prices increase with tier rank", () => {
    const prices = TIERS.map((t) => t.monthlyPriceCents);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1]!);
    }
  });

  it("leadFeeMultiplier decreases as tier improves (higher tier = cheaper leads)", () => {
    const multipliers = TIERS.map((t) => t.leadFeeMultiplier);
    for (let i = 1; i < multipliers.length; i++) {
      expect(multipliers[i]).toBeLessThan(multipliers[i - 1]!);
    }
  });

  it("sponsoredBoost increases with tier rank", () => {
    const boosts = TIERS.map((t) => t.sponsoredBoost);
    for (let i = 1; i < boosts.length; i++) {
      expect(boosts[i]).toBeGreaterThan(boosts[i - 1]!);
    }
  });

  it("free and growth have a maxLeadsPerMonth cap; pro and elite are uncapped", () => {
    expect(getTier("free")!.maxLeadsPerMonth).not.toBeNull();
    expect(getTier("growth")!.maxLeadsPerMonth).not.toBeNull();
    expect(getTier("pro")!.maxLeadsPerMonth).toBeNull();
    expect(getTier("elite")!.maxLeadsPerMonth).toBeNull();
  });
});

// ── getTier ───────────────────────────────────────────────────────────────────

describe("getTier", () => {
  it.each(TIER_IDS)("returns the correct tier for '%s'", (id) => {
    expect(getTier(id)!.id).toBe(id);
  });

  it("returns null for an unknown tier", () => {
    expect(getTier("super")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getTier("")).toBeNull();
  });
});

// ── prorateUpgradeCents ───────────────────────────────────────────────────────

describe("prorateUpgradeCents", () => {
  it("returns 0 when cycleDays is 0", () => {
    expect(prorateUpgradeCents("free", "growth", 15, 0)).toBe(0);
  });

  it("returns 0 when daysRemaining is 0", () => {
    expect(prorateUpgradeCents("free", "growth", 0)).toBe(0);
  });

  it("full cycle — returns the difference in monthly prices", () => {
    // All 30 days remaining: toPrice - fromPrice
    const from = 0;       // free monthly = 0
    const to = 4900;      // growth monthly = 4900
    expect(prorateUpgradeCents("free", "growth", 30, 30)).toBe(to - from);
  });

  it("half cycle — prorates correctly", () => {
    // 15/30 days: half of (toPrice - fromPrice)
    const result = prorateUpgradeCents("free", "growth", 15, 30);
    // from credit = round(0 * 15/30) = 0; to charge = round(4900 * 15/30) = 2450
    expect(result).toBe(2450);
  });

  it("downgrade returns negative value (credit owed)", () => {
    const result = prorateUpgradeCents("elite", "free", 15);
    expect(result).toBeLessThan(0);
  });

  it("same tier returns 0", () => {
    expect(prorateUpgradeCents("pro", "pro", 15)).toBe(0);
  });

  it("uses annualPriceCents when billing='annual'", () => {
    const monthly = prorateUpgradeCents("free", "growth", 30, 30, "monthly");
    const annual = prorateUpgradeCents("free", "growth", 30, 30, "annual");
    // Annual is roughly 10× monthly (12 months at ~20% discount)
    expect(annual).toBeGreaterThan(monthly);
  });
});

// ── isUpgrade ─────────────────────────────────────────────────────────────────

describe("isUpgrade", () => {
  it("free → growth is an upgrade", () => {
    expect(isUpgrade("free", "growth")).toBe(true);
  });

  it("growth → pro is an upgrade", () => {
    expect(isUpgrade("growth", "pro")).toBe(true);
  });

  it("pro → elite is an upgrade", () => {
    expect(isUpgrade("pro", "elite")).toBe(true);
  });

  it("free → elite is an upgrade", () => {
    expect(isUpgrade("free", "elite")).toBe(true);
  });

  it("elite → pro is NOT an upgrade (downgrade)", () => {
    expect(isUpgrade("elite", "pro")).toBe(false);
  });

  it("same tier is not an upgrade", () => {
    expect(isUpgrade("pro", "pro")).toBe(false);
    expect(isUpgrade("free", "free")).toBe(false);
  });
});
