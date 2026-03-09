import { describe, it, expect } from "vitest";
import { CITIES, getCityBySlug, getAllCitySlugs } from "@/lib/cities";

describe("CITIES config", () => {
  it("has exactly 8 cities", () => {
    expect(CITIES).toHaveLength(8);
  });

  it.each(CITIES)("$slug has all required fields", (c) => {
    expect(c.slug).toBeTruthy();
    expect(c.name).toBeTruthy();
    expect(c.state).toBeTruthy();
    expect(c.stateShort).toBeTruthy();
    expect(c.population).toBeTruthy();
    expect(c.metaTitle).toBeTruthy();
    expect(c.metaDescription).toBeTruthy();
    expect(c.h1).toBeTruthy();
    expect(c.intro).toBeTruthy();
    expect(c.localContext).toBeTruthy();
  });

  it.each(CITIES)("$slug has at least 3 FAQs", (c) => {
    expect(c.faqs.length).toBeGreaterThanOrEqual(3);
  });

  it.each(CITIES)("$slug has relatedCities", (c) => {
    expect(c.relatedCities.length).toBeGreaterThanOrEqual(3);
  });

  it.each(CITIES)("$slug FAQs have question and answer", (c) => {
    c.faqs.forEach((faq) => {
      expect(faq.question).toBeTruthy();
      expect(faq.answer).toBeTruthy();
    });
  });
});

describe("getCityBySlug", () => {
  it("returns correct city for valid slug", () => {
    const city = getCityBySlug("sydney");
    expect(city).toBeDefined();
    expect(city!.name).toBe("Sydney");
    expect(city!.stateShort).toBe("NSW");
  });

  it("returns gold-coast with hyphenated slug", () => {
    const city = getCityBySlug("gold-coast");
    expect(city).toBeDefined();
    expect(city!.name).toBe("Gold Coast");
  });

  it("returns undefined for invalid slug", () => {
    expect(getCityBySlug("darwin")).toBeUndefined();
    expect(getCityBySlug("")).toBeUndefined();
  });
});

describe("getAllCitySlugs", () => {
  it("returns 8 slugs", () => {
    const slugs = getAllCitySlugs();
    expect(slugs).toHaveLength(8);
  });

  it("includes expected cities", () => {
    const slugs = getAllCitySlugs();
    expect(slugs).toContain("sydney");
    expect(slugs).toContain("melbourne");
    expect(slugs).toContain("brisbane");
    expect(slugs).toContain("perth");
    expect(slugs).toContain("adelaide");
    expect(slugs).toContain("canberra");
    expect(slugs).toContain("hobart");
    expect(slugs).toContain("gold-coast");
  });
});
