import { describe, it, expect } from "vitest";
import {
  LISTING_IMAGES,
  TYPE_FALLBACK_IMAGES,
  getListingImages,
} from "@/lib/property-images";

describe("property-images", () => {
  it("has per-listing image arrays with plausible URLs", () => {
    for (const [slug, imgs] of Object.entries(LISTING_IMAGES)) {
      expect(imgs.length, slug).toBeGreaterThan(0);
      for (const url of imgs) {
        expect(url, slug).toMatch(/^https:\/\//);
      }
    }
  });

  it("has type-fallback image arrays for core property types", () => {
    expect(TYPE_FALLBACK_IMAGES.apartment.length).toBeGreaterThan(0);
    expect(TYPE_FALLBACK_IMAGES.townhouse.length).toBeGreaterThan(0);
    expect(TYPE_FALLBACK_IMAGES.house_land.length).toBeGreaterThan(0);
  });
});

describe("getListingImages fallback chain", () => {
  it("returns DB images when present (never falls through)", () => {
    const db = ["https://example.com/a.jpg", "https://example.com/b.jpg"];
    const res = getListingImages("elara-marsden-park", db, "apartment");
    expect(res).toEqual(db);
  });

  it("ignores empty DB array (falls through)", () => {
    const res = getListingImages("elara-marsden-park", [], "apartment");
    expect(res).toEqual(LISTING_IMAGES["elara-marsden-park"]);
  });

  it("ignores null DB (falls through to slug lookup)", () => {
    const res = getListingImages("elara-marsden-park", null, "apartment");
    expect(res).toEqual(LISTING_IMAGES["elara-marsden-park"]);
  });

  it("falls back to type map when slug is unknown", () => {
    const res = getListingImages("unknown-slug", null, "townhouse");
    expect(res).toEqual(TYPE_FALLBACK_IMAGES.townhouse);
  });

  it("falls back to 'apartment' when slug + propertyType both unknown", () => {
    expect(getListingImages("unknown-slug", null, "mansion")).toEqual(
      TYPE_FALLBACK_IMAGES.apartment,
    );
  });

  it("falls back to 'apartment' when propertyType is missing", () => {
    expect(getListingImages("unknown-slug", null)).toEqual(
      TYPE_FALLBACK_IMAGES.apartment,
    );
  });

  it("falls back to 'apartment' when DB is undefined", () => {
    expect(getListingImages("unknown-slug", undefined)).toEqual(
      TYPE_FALLBACK_IMAGES.apartment,
    );
  });
});
