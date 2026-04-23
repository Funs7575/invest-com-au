import { describe, it, expect } from "vitest";
import {
  LISTING_VERTICALS,
  LISTING_VERTICAL_SLUGS,
  getListingVertical,
  getListingVerticalLabel,
} from "@/lib/listing-verticals";

describe("listing-verticals registry", () => {
  it("has multiple verticals", () => {
    expect(LISTING_VERTICALS.length).toBeGreaterThan(5);
  });

  it("every vertical has the required fields", () => {
    for (const v of LISTING_VERTICALS) {
      expect(v.slug).toBeTruthy();
      expect(v.label).toBeTruthy();
      expect(v.description).toBeTruthy();
      expect(v.icon).toBeTruthy();
      expect(["marketplace", "commodity", "fund", "capital-markets"]).toContain(
        v.kind,
      );
      expect(typeof v.order).toBe("number");
    }
  });

  it("slugs are url-safe", () => {
    for (const v of LISTING_VERTICALS) {
      expect(v.slug).toMatch(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
    }
  });

  it("slugs are globally unique", () => {
    const slugs = LISTING_VERTICALS.map((v) => v.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("order values are globally unique (so sort is deterministic)", () => {
    const orders = LISTING_VERTICALS.map((v) => v.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("LISTING_VERTICAL_SLUGS mirrors the registry", () => {
    expect([...LISTING_VERTICAL_SLUGS]).toEqual(
      LISTING_VERTICALS.map((v) => v.slug),
    );
  });
});

describe("getListingVertical", () => {
  it("returns undefined for unknown slug", () => {
    expect(getListingVertical("not-a-vertical")).toBeUndefined();
  });

  it("returns the full record for a known slug", () => {
    const v = getListingVertical("mining");
    expect(v?.label).toBe("Mining & Resources");
    expect(v?.kind).toBe("commodity");
  });
});

describe("getListingVerticalLabel", () => {
  it("falls back to the raw slug if unknown", () => {
    expect(getListingVerticalLabel("unknown-slug")).toBe("unknown-slug");
  });

  it("returns the human label for known slugs", () => {
    expect(getListingVerticalLabel("gold")).toBe("Gold & Precious Metals");
    expect(getListingVerticalLabel("buy-business")).toBe("Buy a Business");
  });
});
