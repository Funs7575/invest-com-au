import { describe, it, expect } from "vitest";
import { categoryForListing, listingUrl } from "@/lib/listing-url";
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
