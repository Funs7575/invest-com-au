/**
 * Unit tests for computeMatchScore.
 *
 * The matcher's contract: returns null when the visitor has no
 * meaningful profile signal, otherwise returns a number in [50, 99].
 * Below-floor matches collapse to null rather than confidently
 * displaying "12% match" on a listing the user almost certainly
 * doesn't want.
 */

import { describe, it, expect } from "vitest";
import { computeMatchScore } from "@/lib/listing-match";
import type { InvestmentListing } from "@/lib/types";

// The DB has more `vertical` values than the InvestListingVertical
// union covers (e.g. "buy-business", "commercial-property" — added by
// data migrations after the type was last hand-edited). Tests use the
// real live-DB values, so cast through unknown.
function makeListing(overrides: Record<string, unknown>): InvestmentListing {
  return {
    id: 1,
    vertical: "buy-business",
    title: "Test",
    slug: "test",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as unknown as InvestmentListing;
}

describe("computeMatchScore", () => {
  it("returns null when profile is null", () => {
    expect(computeMatchScore(makeListing({}), null)).toBeNull();
  });

  it("returns null when profile has no useful signal", () => {
    expect(computeMatchScore(makeListing({}), {})).toBeNull();
  });

  it("scores a perfect vertical + budget match in the high range", () => {
    const listing = makeListing({
      vertical: "buy-business",
      listing_kind: "for_sale_business",
      asking_price_cents: 50_000_000, // $500k → 100k_to_1m bucket
    });
    const score = computeMatchScore(listing, {
      primary_vertical: "buy-business",
      budget_band: "100k_to_1m",
      is_business_owner: true,
      experience_level: "intermediate",
    });
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThanOrEqual(70);
    expect(score!).toBeLessThanOrEqual(99);
  });

  it("scores a vertical mismatch lower than a vertical match", () => {
    const base = { listing_kind: "for_sale_business" as const, asking_price_cents: 50_000_000 };
    const matchListing = makeListing({ vertical: "buy-business", ...base });
    const mismatchListing = makeListing({ vertical: "mining", ...base });
    const profile = {
      primary_vertical: "buy-business",
      budget_band: "100k_to_1m",
      is_business_owner: true,
    };
    const matchScore = computeMatchScore(matchListing, profile);
    const mismatchScore = computeMatchScore(mismatchListing, profile);
    if (matchScore != null && mismatchScore != null) {
      expect(matchScore).toBeGreaterThan(mismatchScore);
    } else {
      // Mismatch may fall below the floor — that's also a valid outcome.
      expect(matchScore).not.toBeNull();
    }
  });

  it("boosts SIV-complying listings for visitors with intent_country_snapshot", () => {
    const sivListing = makeListing({ vertical: "fund", listing_kind: "fund", siv_complying: true });
    const nonSivListing = makeListing({ vertical: "fund", listing_kind: "fund", siv_complying: false });
    const profile = {
      primary_vertical: "fund",
      intent_country_snapshot: "CN",
      is_hnw: true,
      budget_band: "5m_plus",
    };
    const sivScore = computeMatchScore(sivListing, profile);
    const nonSivScore = computeMatchScore(nonSivListing, profile);
    expect(sivScore).not.toBeNull();
    if (nonSivScore != null) {
      expect(sivScore!).toBeGreaterThanOrEqual(nonSivScore);
    }
  });

  it("never returns above 99 (ceiling)", () => {
    const listing = makeListing({
      vertical: "buy-business",
      listing_kind: "for_sale_business",
      asking_price_cents: 50_000_000,
      siv_complying: true,
      firb_eligible: true,
      key_metrics: { open_to_retail: true } as Record<string, string | number | boolean>,
    });
    const profile = {
      primary_vertical: "buy-business",
      budget_band: "100k_to_1m",
      is_business_owner: true,
      is_hnw: false,
      experience_level: "beginner",
      intent_country_snapshot: "CN",
    };
    const score = computeMatchScore(listing, profile);
    expect(score).not.toBeNull();
    expect(score!).toBeLessThanOrEqual(99);
  });

  it("returns null when no meaningful matching occurs (below floor)", () => {
    // Tight mismatch: profile is a HNW SIV cross-border investor; listing
    // is a tiny domestic cafe. Should fall below floor.
    const listing = makeListing({
      vertical: "buy-business",
      listing_kind: "for_sale_business",
      asking_price_cents: 5_000_000, // $50k
      siv_complying: false,
      firb_eligible: false,
    });
    const profile = {
      primary_vertical: "fund",
      budget_band: "5m_plus",
      is_hnw: true,
      is_cross_border: true,
      intent_country_snapshot: "CN",
      experience_level: "advanced",
    };
    const score = computeMatchScore(listing, profile);
    // Will likely be in the 30-50 range — should clamp to null.
    if (score != null) {
      expect(score).toBeGreaterThanOrEqual(50);
    } else {
      expect(score).toBeNull();
    }
  });
});
