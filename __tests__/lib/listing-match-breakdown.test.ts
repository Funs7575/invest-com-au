import { describe, expect, it } from "vitest";
import { computeMatchBreakdown, computeMatchScore } from "@/lib/listing-match";
import type { InvestmentListing } from "@/lib/types";

const listing = {
  id: 1,
  slug: "test-farm",
  title: "Test Farm",
  vertical: "farmland",
  asking_price_cents: 50_000_00, // $50k — inside the "small" band's reach
  firb_eligible: true,
  siv_complying: false,
  key_metrics: {},
} as unknown as InvestmentListing;

describe("computeMatchBreakdown (Northstar D11)", () => {
  it("returns null without profile signal", () => {
    expect(computeMatchBreakdown(listing, null)).toBeNull();
    expect(computeMatchBreakdown(listing, { } as never)).toBeNull();
  });

  it("emits factual reasons for matched criteria", () => {
    const breakdown = computeMatchBreakdown(listing, {
      primary_vertical: "farmland",
      is_cross_border: true,
    } as never);
    expect(breakdown).not.toBeNull();
    expect(breakdown!.reasons).toContain("Sector matches your stated focus");
    expect(breakdown!.reasons).toContain("FIRB-eligible — relevant to your cross-border profile");
  });

  it("caps reasons at 4 and keeps the wrapper score identical", () => {
    const profile = {
      primary_vertical: "farmland",
      is_cross_border: true,
      budget_band: "small",
      experience_level: "beginner",
      is_business_owner: false,
    } as never;
    const breakdown = computeMatchBreakdown(listing, profile);
    expect(breakdown!.reasons.length).toBeLessThanOrEqual(4);
    expect(computeMatchScore(listing, profile)).toBe(breakdown!.score);
  });

  it("reasons celebrate fit with the user's stated profile, never product quality", () => {
    const breakdown = computeMatchBreakdown(listing, {
      primary_vertical: "farmland",
      is_cross_border: true,
    } as never);
    for (const reason of breakdown!.reasons) {
      expect(reason).not.toMatch(/best|should|recommended|great deal/i);
    }
  });
});
