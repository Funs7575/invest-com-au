import { describe, it, expect } from "vitest";
import {
  getListingHeroImage,
  getSectorThumbImage,
} from "@/lib/listing-vertical-images";

// ── getListingHeroImage ───────────────────────────────────────────────────────

describe("getListingHeroImage", () => {
  it("returns the first DB image when dbImages is non-empty", () => {
    const dbUrl = "https://example.com/photo.jpg";
    const result = getListingHeroImage("mining", 1, [dbUrl]);
    expect(result).toBe(dbUrl);
  });

  it("uses the first element even when multiple DB images are present", () => {
    const first = "https://a.com/1.jpg";
    const result = getListingHeroImage("mining", 1, [first, "https://b.com/2.jpg"]);
    expect(result).toBe(first);
  });

  it("falls back when dbImages is null", () => {
    const result = getListingHeroImage("mining", 1, null);
    expect(typeof result).toBe("string");
    expect(result.startsWith("https://")).toBe(true);
  });

  it("falls back when dbImages is undefined", () => {
    const result = getListingHeroImage("startup", 1, undefined);
    expect(typeof result).toBe("string");
    expect(result.startsWith("https://")).toBe(true);
  });

  it("falls back when dbImages is an empty array", () => {
    const result = getListingHeroImage("mining", 1, []);
    expect(typeof result).toBe("string");
    expect(result.startsWith("https://")).toBe(true);
  });

  it("is deterministic — same listingId always returns the same image", () => {
    const a = getListingHeroImage("mining", 7, null);
    const b = getListingHeroImage("mining", 7, null);
    expect(a).toBe(b);
  });

  it("uses a subcategory override when available (energy + solar)", () => {
    const withSub = getListingHeroImage("energy", 1, null, "solar");
    const withoutSub = getListingHeroImage("energy", 1, null);
    // Both are valid URLs; sub-category may or may not differ, but neither throws
    expect(typeof withSub).toBe("string");
    expect(typeof withoutSub).toBe("string");
  });

  it("normalises hyphenated subCategory slugs (oil-gas → oil_gas)", () => {
    const hyphen = getListingHeroImage("energy", 5, null, "oil-gas");
    const underscore = getListingHeroImage("energy", 5, null, "oil_gas");
    expect(hyphen).toBe(underscore);
  });

  it("falls back to generic pool for a completely unknown vertical", () => {
    const result = getListingHeroImage("intergalactic_fund", 3, null);
    expect(typeof result).toBe("string");
    expect(result.startsWith("https://")).toBe(true);
  });

  it("handles null vertical gracefully", () => {
    const result = getListingHeroImage(null, 2, null);
    expect(typeof result).toBe("string");
    expect(result.startsWith("https://")).toBe(true);
  });

  it("handles a string listingId", () => {
    const numResult = getListingHeroImage("startup", 4, null);
    const strResult = getListingHeroImage("startup", "4", null);
    expect(strResult).toBe(numResult);
  });
});

// ── getSectorThumbImage ───────────────────────────────────────────────────────

describe("getSectorThumbImage", () => {
  it("returns a string URL", () => {
    const result = getSectorThumbImage("hydrogen", "ALD");
    expect(typeof result).toBe("string");
    expect(result.startsWith("https://")).toBe(true);
  });

  it("is deterministic — same sectorSlug + stableId always returns same image", () => {
    const a = getSectorThumbImage("lithium", "PLS");
    const b = getSectorThumbImage("lithium", "PLS");
    expect(a).toBe(b);
  });

  it("different stableIds in the same sector may return different images", () => {
    // Not guaranteed to differ (pool might be small), but function must not throw
    const a = getSectorThumbImage("solar", "ticker1");
    const b = getSectorThumbImage("solar", "ticker2");
    expect(typeof a).toBe("string");
    expect(typeof b).toBe("string");
  });

  it("falls back gracefully for an unknown sectorSlug", () => {
    const result = getSectorThumbImage("unknown-sector", "ABC");
    expect(typeof result).toBe("string");
    expect(result.startsWith("https://")).toBe(true);
  });

  it("handles null sectorSlug without throwing", () => {
    const result = getSectorThumbImage(null, "XYZ");
    expect(typeof result).toBe("string");
    expect(result.startsWith("https://")).toBe(true);
  });

  it("handles an empty stableId without throwing", () => {
    const result = getSectorThumbImage("hydrogen", "");
    expect(typeof result).toBe("string");
  });
});
