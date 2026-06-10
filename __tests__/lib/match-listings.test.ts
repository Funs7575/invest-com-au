import { describe, it, expect } from "vitest";
import {
  matchListings,
  listingContextFromAnswers,
  type MatchableListing,
} from "@/lib/listings/match-listings";

const days = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const listing = (over: Partial<MatchableListing> = {}): MatchableListing => ({
  id: 1,
  slug: "l1",
  title: "Listing",
  vertical: "commercial_property",
  location_state: "NSW",
  asking_price_cents: 250_000_00,
  listing_type: "standard",
  status: "active",
  images: ["a.jpg"],
  created_at: days(10),
  ...over,
});

describe("listingContextFromAnswers", () => {
  it("derives verticals from intent + sub-answers, budget midpoint, state, residency", () => {
    const ctx = listingContextFromAnswers({
      intent: "property",
      budget_band: "100k_500k",
      location_state: "QLD",
      starting_point: "australia",
    });
    expect(ctx.preferredVerticals).toContain("commercial_property");
    expect(ctx.budgetMidpointCents).toBe(300_000_00);
    expect(ctx.userState).toBe("QLD");
    expect(ctx.isNonResident).toBe(false);
  });

  it("'any' state means no location signal; overseas means the FIRB gate", () => {
    const ctx = listingContextFromAnswers({ starting_point: "overseas", location_state: "any" });
    expect(ctx.userState).toBeUndefined();
    expect(ctx.isNonResident).toBe(true);
  });
});

describe("matchListings — hard gates (compliance redlines)", () => {
  it("excludes equity_raise listings entirely (CSF — no s708 gate yet)", () => {
    const out = matchListings(
      [listing({ id: 1, listing_kind: "equity_raise" }), listing({ id: 2 })],
      {},
    );
    expect(out.map((l) => l.id)).toEqual([2]);
  });

  it("non-residents only see explicitly FIRB-eligible listings", () => {
    const out = matchListings(
      [
        listing({ id: 1, firb_eligible: true }),
        listing({ id: 2, firb_eligible: false }),
        listing({ id: 3 }), // null — unknown is excluded too
      ],
      { isNonResident: true },
    );
    expect(out.map((l) => l.id)).toEqual([1]);
    expect(out[0]!.matchReasons).toContain("Open to overseas buyers (FIRB-eligible)");
  });

  it("only active listings are matchable", () => {
    const out = matchListings([listing({ status: "sold" }), listing({ id: 2 })], {});
    expect(out.map((l) => l.id)).toEqual([2]);
  });
});

describe("matchListings — ranking", () => {
  it("vertical + budget + state matches outrank mismatches", () => {
    const ctx = listingContextFromAnswers({
      intent: "property",
      budget_band: "100k_500k",
      location_state: "NSW",
    });
    const out = matchListings(
      [
        listing({ id: 1, vertical: "mining", location_state: "WA", asking_price_cents: 5_000_000_00 }),
        listing({ id: 2 }), // commercial_property, NSW, $250k — fits everything
      ],
      ctx,
    );
    expect(out[0]!.id).toBe(2);
    expect(out[0]!.matchScore).toBeGreaterThan(out[1]!.matchScore);
    // Reasons are factual criteria matches, never endorsements.
    expect(out[0]!.matchReasons).toEqual([
      "In a category you chose (commercial property)",
      "Within your stated budget (A$100k–A$500k)",
      "Located in NSW",
    ]);
  });

  it("premium tier + freshness break ties; ties fall to newer", () => {
    const out = matchListings(
      [
        listing({ id: 1, listing_type: "standard", created_at: days(200) }),
        listing({ id: 2, listing_type: "premium", created_at: days(5) }),
      ],
      {},
    );
    expect(out[0]!.id).toBe(2);
  });

  it("respects the limit and never throws on sparse rows", () => {
    const sparse: MatchableListing = { id: 9, slug: "s", title: "Sparse", vertical: "fund" };
    const many = Array.from({ length: 10 }, (_, i) => listing({ id: i + 10 }));
    const out = matchListings([sparse, ...many], {}, 4);
    expect(out).toHaveLength(4);
  });
});
