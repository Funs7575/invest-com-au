import { describe, it, expect } from "vitest";
import { resolveCountryFromContext } from "@/lib/country-mode";

describe("resolveCountryFromContext", () => {
  describe("priority chain", () => {
    it("URL param wins over cookie wins over geo", () => {
      expect(
        resolveCountryFromContext({
          urlParam: "hong-kong",
          cookie: "uk",
          geoIso: "US",
        }),
      ).toEqual({ code: "hk", source: "url" });

      expect(
        resolveCountryFromContext({
          urlParam: null,
          cookie: "uk",
          geoIso: "US",
        }),
      ).toEqual({ code: "uk", source: "cookie" });

      expect(
        resolveCountryFromContext({
          urlParam: null,
          cookie: null,
          geoIso: "US",
        }),
      ).toEqual({ code: "us", source: "geo" });

      expect(
        resolveCountryFromContext({
          urlParam: null,
          cookie: null,
          geoIso: null,
        }),
      ).toEqual({ code: null, source: null });
    });

    it("falls through invalid URL slug to cookie", () => {
      expect(
        resolveCountryFromContext({
          urlParam: "narnia",
          cookie: "uk",
          geoIso: "US",
        }),
      ).toEqual({ code: "uk", source: "cookie" });
    });

    it("falls through invalid cookie value to geo", () => {
      expect(
        resolveCountryFromContext({
          urlParam: null,
          cookie: "definitely-not-a-country",
          geoIso: "GB",
        }),
      ).toEqual({ code: "uk", source: "geo" });
    });

    it("falls through unsupported geo ISO to null", () => {
      expect(
        resolveCountryFromContext({
          urlParam: null,
          cookie: null,
          geoIso: "DE", // Germany not in supported set
        }),
      ).toEqual({ code: null, source: null });
    });

    it("empty / undefined / null inputs all fall through cleanly", () => {
      expect(resolveCountryFromContext({})).toEqual({ code: null, source: null });
      expect(
        resolveCountryFromContext({ urlParam: "", cookie: "", geoIso: "" }),
      ).toEqual({ code: null, source: null });
      expect(
        resolveCountryFromContext({
          urlParam: undefined,
          cookie: undefined,
          geoIso: undefined,
        }),
      ).toEqual({ code: null, source: null });
    });
  });

  describe("URL param accepts only slugs", () => {
    it("rejects intent codes (e.g. 'hk')", () => {
      // Intent codes aren't slugs — rejection is by design, see resolve-country.ts JSDoc.
      expect(
        resolveCountryFromContext({ urlParam: "hk", cookie: null, geoIso: null }),
      ).toEqual({ code: null, source: null });
    });

    it("rejects ISO codes (e.g. 'GB')", () => {
      expect(
        resolveCountryFromContext({ urlParam: "GB", cookie: null, geoIso: null }),
      ).toEqual({ code: null, source: null });
    });

    it("accepts long slugs", () => {
      expect(
        resolveCountryFromContext({
          urlParam: "united-kingdom",
          cookie: null,
          geoIso: null,
        }),
      ).toEqual({ code: "uk", source: "url" });

      expect(
        resolveCountryFromContext({
          urlParam: "united-arab-emirates",
          cookie: null,
          geoIso: null,
        }),
      ).toEqual({ code: "ae", source: "url" });

      expect(
        resolveCountryFromContext({
          urlParam: "saudi-arabia",
          cookie: null,
          geoIso: null,
        }),
      ).toEqual({ code: "sa", source: "url" });
    });
  });

  describe("cookie validation is case-sensitive (matches existing getIntentCountry)", () => {
    it("accepts lowercase intent codes", () => {
      expect(
        resolveCountryFromContext({ urlParam: null, cookie: "hk", geoIso: null }),
      ).toEqual({ code: "hk", source: "cookie" });
    });

    it("rejects uppercase variants — would otherwise re-introduce a normalisation surface", () => {
      expect(
        resolveCountryFromContext({ urlParam: null, cookie: "HK", geoIso: null }),
      ).toEqual({ code: null, source: null });
    });
  });

  describe("geo ISO is case-insensitive (Vercel returns uppercase but accept either)", () => {
    it("accepts uppercase", () => {
      expect(
        resolveCountryFromContext({ urlParam: null, cookie: null, geoIso: "GB" }),
      ).toEqual({ code: "uk", source: "geo" });
    });

    it("accepts lowercase", () => {
      expect(
        resolveCountryFromContext({ urlParam: null, cookie: null, geoIso: "gb" }),
      ).toEqual({ code: "uk", source: "geo" });
    });

    it("accepts mixed case", () => {
      expect(
        resolveCountryFromContext({ urlParam: null, cookie: null, geoIso: "Gb" }),
      ).toEqual({ code: "uk", source: "geo" });
    });
  });
});
