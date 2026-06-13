import { describe, it, expect } from "vitest";
import {
  categoryForListing,
  categoryScope,
  listingUrl,
  normaliseVertical,
  rawVerticalVariants,
  isCanonicalVertical,
} from "@/lib/listing-url";
import type { InvestmentListing, InvestListingVertical } from "@/lib/types";

function listing(
  overrides: Partial<Pick<InvestmentListing, "vertical" | "sub_category" | "slug">>,
): Pick<InvestmentListing, "vertical" | "sub_category" | "slug"> {
  return {
    vertical: "startup" as InvestListingVertical,
    sub_category: undefined,
    slug: "acme-corp",
    ...overrides,
  };
}

describe("categoryForListing", () => {
  it.each<[InvestListingVertical, string]>([
    ["business", "buy-business"],
    ["commercial_property", "commercial-property"],
    ["energy", "renewable-energy"],
    ["farmland", "farmland"],
    ["franchise", "franchise"],
    ["fund", "funds"],
    ["mining", "mining"],
    ["pre_ipo", "pre-ipo"],
    ["startup", "startups"],
  ])("maps vertical %s to slug %s", (vertical, slug) => {
    expect(categoryForListing({ vertical, sub_category: undefined })).toBe(slug);
  });

  it("overrides 'fund' vertical to 'alternatives' for art/wine/watches/cars/coins/whisky sub-categories", () => {
    for (const sub of ["art", "wine", "watches", "cars", "coins", "whisky"]) {
      expect(
        categoryForListing({ vertical: "fund", sub_category: sub }),
      ).toBe("alternatives");
    }
  });

  it("overrides 'fund' vertical to 'private-credit' for private_credit sub-category", () => {
    expect(
      categoryForListing({ vertical: "fund", sub_category: "private_credit" }),
    ).toBe("private-credit");
  });

  it("overrides 'fund' vertical to 'infrastructure' for infrastructure sub-category", () => {
    expect(
      categoryForListing({ vertical: "fund", sub_category: "infrastructure" }),
    ).toBe("infrastructure");
  });

  it("falls through to 'funds' for an unknown fund sub-category", () => {
    expect(
      categoryForListing({ vertical: "fund", sub_category: "totally-new-kind" }),
    ).toBe("funds");
  });

  it("ignores sub_category on non-fund verticals", () => {
    // Even if a mining listing carried sub_category='art' it should not
    // be rerouted to alternatives — the override is fund-scoped.
    expect(
      categoryForListing({ vertical: "mining", sub_category: "art" }),
    ).toBe("mining");
  });

  it("routes listed securities to 'listed-securities' by kind, across verticals", () => {
    // ASX-listed securities span many (often unmapped) verticals; the
    // listing_kind takes precedence so they don't fall to the funds fallback.
    for (const vertical of ["uranium", "hydrogen", "oil-gas", "digital-infrastructure"]) {
      expect(
        categoryForListing({
          vertical: vertical as InvestListingVertical,
          sub_category: undefined,
          listing_kind: "listed_security",
        }),
      ).toBe("listed-securities");
    }
  });

  it("only applies the kind override for listed_security (other kinds use vertical)", () => {
    expect(
      categoryForListing({
        vertical: "mining" as InvestListingVertical,
        sub_category: undefined,
        listing_kind: "project_equity",
      }),
    ).toBe("mining");
    // Missing listing_kind keeps the vertical-based behaviour (e.g. state rollups).
    expect(
      categoryForListing({ vertical: "mining" as InvestListingVertical, sub_category: undefined }),
    ).toBe("mining");
  });

  it("normalises drifted vertical strings to the right category", () => {
    // These non-canonical vertical values exist in the DB from earlier
    // seed waves and must not silently fall through to "funds".
    const cases: [string, string][] = [
      ["commercial-property", "commercial-property"],
      ["startups", "startups"],
      ["renewable-energy", "renewable-energy"],
      ["funds", "funds"],
    ];
    for (const [vertical, slug] of cases) {
      expect(
        categoryForListing({
          vertical: vertical as InvestListingVertical,
          sub_category: undefined,
        }),
      ).toBe(slug);
    }
  });

  it("applies fund sub-category overrides to the drifted 'funds' vertical", () => {
    // A 'funds' (drift) listing with a private_credit sub still routes to
    // private-credit, the same as the canonical 'fund' vertical.
    expect(
      categoryForListing({
        vertical: "funds" as InvestListingVertical,
        sub_category: "private_credit",
      }),
    ).toBe("private-credit");
  });
});

describe("vertical normalisation helpers", () => {
  it("normaliseVertical maps drift → canonical and leaves canonical/guide untouched", () => {
    expect(normaliseVertical("commercial-property")).toBe("commercial_property");
    expect(normaliseVertical("funds")).toBe("fund");
    expect(normaliseVertical("startups")).toBe("startup");
    expect(normaliseVertical("renewable-energy")).toBe("energy");
    expect(normaliseVertical("mining")).toBe("mining");
    expect(normaliseVertical("oil-gas")).toBe("oil-gas");
  });

  it("rawVerticalVariants returns canonical + drift variants for querying", () => {
    expect(rawVerticalVariants("commercial_property")).toEqual([
      "commercial_property",
      "commercial-property",
    ]);
    expect(rawVerticalVariants("fund")).toEqual(["fund", "funds"]);
    expect(rawVerticalVariants("mining")).toEqual(["mining"]);
  });

  it("isCanonicalVertical accepts canonical + drift, rejects guide/unknown", () => {
    expect(isCanonicalVertical("commercial_property")).toBe(true);
    expect(isCanonicalVertical("renewable-energy")).toBe(true); // drift → energy
    expect(isCanonicalVertical("fund")).toBe(true);
    expect(isCanonicalVertical("oil-gas")).toBe(false);
    expect(isCanonicalVertical("uranium")).toBe(false);
    expect(isCanonicalVertical("nonsense")).toBe(false);
  });
});

describe("listingUrl", () => {
  it("constructs /invest/{category}/listings/{slug}", () => {
    expect(listingUrl(listing({ vertical: "mining", slug: "big-ore" }))).toBe(
      "/invest/mining/listings/big-ore",
    );
  });

  it("uses the alternatives override for fund+wine listings", () => {
    expect(
      listingUrl(
        listing({
          vertical: "fund",
          sub_category: "wine",
          slug: "premium-wine-fund",
        }),
      ),
    ).toBe("/invest/alternatives/listings/premium-wine-fund");
  });

  it("uses the default 'funds' slug for a plain fund listing", () => {
    expect(
      listingUrl(
        listing({
          vertical: "fund",
          sub_category: undefined,
          slug: "balanced-fund",
        }),
      ),
    ).toBe("/invest/funds/listings/balanced-fund");
  });
});

describe("categoryScope", () => {
  it("maps direct categories to their vertical variants", () => {
    expect(categoryScope("renewable-energy")).toEqual({
      verticals: ["energy", "renewable-energy"],
    });
    expect(categoryScope("mining")).toEqual({ verticals: ["mining"] });
    // private-equity merges two verticals.
    expect(categoryScope("private-equity")?.verticals).toEqual(
      expect.arrayContaining(["hedge-fund", "private-equity"]),
    );
  });

  it("narrows derived fund categories by sub_category", () => {
    const scope = categoryScope("private-credit");
    expect(scope?.verticals).toEqual(expect.arrayContaining(["fund", "funds"]));
    expect(scope?.subCategories).toEqual(["private_credit"]);
    const alts = categoryScope("alternatives");
    expect(alts?.subCategories).toEqual(
      expect.arrayContaining(["art", "wine", "whisky"]),
    );
  });

  it("narrows listed-securities by listing_kind (it spans verticals)", () => {
    expect(categoryScope("listed-securities")).toEqual({
      verticals: [],
      listingKind: "listed_security",
    });
  });

  it("returns null for unknown categories — callers keep unscoped behaviour", () => {
    expect(categoryScope("not-a-category")).toBeNull();
  });

  it("is an over-fetch, never an under-fetch: every scoped row's true category is reachable", () => {
    // A fund/private_credit row must be admitted by the private-credit
    // scope AND classified back to it by categoryForListing.
    const row = { vertical: "fund", sub_category: "private_credit" };
    const scope = categoryScope("private-credit")!;
    expect(scope.verticals).toContain(row.vertical);
    expect(scope.subCategories).toContain(row.sub_category);
    expect(categoryForListing(row)).toBe("private-credit");
  });
});
