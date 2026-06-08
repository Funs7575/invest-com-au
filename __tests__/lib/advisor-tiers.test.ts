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

  // ── clamp: daysRemaining must be bounded to [0, cycleDays] ───────────────────
  // Regression guard for the unclamped-proration finding: an over-cycle
  // daysRemaining (e.g. annual sub's ~365 days against a 30-day cycle) must NOT
  // inflate the multiplier beyond 1.0, and a negative daysRemaining must NOT
  // flip the sign.

  describe("clamp — daysRemaining bounded to [0, cycleDays]", () => {
    it("daysRemaining > cycleDays is clamped to cycleDays (multiplier capped at 1.0)", () => {
      // free→growth monthly: full-cycle credit is the full price difference (4900).
      const fullCycle = prorateUpgradeCents("free", "growth", 30, 30);
      const overCycle = prorateUpgradeCents("free", "growth", 60, 30);
      expect(overCycle).toBe(fullCycle);
      expect(overCycle).toBe(4900); // not 9800 (the pre-fix doubled value)
    });

    it("annual downgrade with ~365 days against a 30-day cycle is capped at one cycle's credit", () => {
      // The exact scenario from the finding: elite→pro deferred downgrade, annual,
      // daysRemaining≈365, cycleDays=30. Pre-fix this returned ≈ -4,087,000
      // (~$40,870 credit). Clamped, it equals the full-cycle (30/30) credit.
      const clamped = prorateUpgradeCents("elite", "pro", 365, 30, "annual");
      const fullCycle = prorateUpgradeCents("elite", "pro", 30, 30, "annual");
      expect(clamped).toBe(fullCycle);
      // Full annual cycle credit = pro annual (143000) - elite annual (479000) = -336000.
      expect(clamped).toBe(143000 - 479000);
      // Credit owed must never exceed the highest annual plan price the advisor
      // could have paid (elite annual = 479000).
      expect(Math.abs(clamped)).toBeLessThanOrEqual(479000);
    });

    it("downgrade credit ratio can never exceed 1.0 of the full price difference", () => {
      const fullDiff = prorateUpgradeCents("elite", "free", 30, 30); // most negative possible
      const overCycle = prorateUpgradeCents("elite", "free", 999, 30);
      expect(overCycle).toBe(fullDiff);
      expect(overCycle).toBeGreaterThanOrEqual(fullDiff); // not more negative than a full cycle
    });

    it("negative daysRemaining is clamped to 0 (returns 0, never sign-flipped)", () => {
      expect(prorateUpgradeCents("free", "growth", -5, 30)).toBe(0);
      // A downgrade with negative days must not become a positive charge.
      expect(prorateUpgradeCents("elite", "free", -100, 30)).toBe(0);
    });

    it("daysRemaining exactly equal to cycleDays is unaffected (boundary)", () => {
      expect(prorateUpgradeCents("free", "growth", 30, 30)).toBe(4900);
    });

    it("over-cycle never over-credits for any downgrade pair (annual + monthly)", () => {
      const pairs: [AdvisorTier, AdvisorTier][] = [
        ["elite", "pro"],
        ["elite", "growth"],
        ["elite", "free"],
        ["pro", "growth"],
        ["growth", "free"],
      ];
      for (const billing of ["monthly", "annual"] as const) {
        for (const [from, to] of pairs) {
          const fullCycle = prorateUpgradeCents(from, to, 30, 30, billing);
          const overCycle = prorateUpgradeCents(from, to, 400, 30, billing);
          // Clamped over-cycle equals the full-cycle figure exactly.
          expect(overCycle).toBe(fullCycle);
          // And the credit magnitude never exceeds the from-tier's full price.
          const fromPrice =
            billing === "annual"
              ? getTier(from)!.annualPriceCents
              : getTier(from)!.monthlyPriceCents;
          expect(Math.abs(overCycle)).toBeLessThanOrEqual(fromPrice);
        }
      }
    });
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
