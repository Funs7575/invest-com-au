/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getCookiePreferences } from "@/components/CookieBanner";

/**
 * getCookiePreferences() is the read path the rest of the app uses
 * to decide whether to load analytics scripts and affiliate redirect
 * cookies. The behaviour matters:
 *
 *   1. Default to deny-by-default (essential only) when nothing is
 *      stored — privacy-first default.
 *   2. Honour the modern `cookie-preferences` JSON blob when present.
 *   3. Fall back to the legacy `cookie-consent: accepted|declined`
 *      flag for users who set their preferences before the granular
 *      UI shipped.
 *   4. Survive corrupt localStorage without throwing.
 */
describe("getCookiePreferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns deny-by-default when localStorage is empty", () => {
    expect(getCookiePreferences()).toEqual({
      essential: true,
      analytics: false,
      affiliate: false,
    });
  });

  it("parses the modern cookie-preferences JSON blob", () => {
    localStorage.setItem(
      "cookie-preferences",
      JSON.stringify({ essential: true, analytics: true, affiliate: false }),
    );
    expect(getCookiePreferences()).toEqual({
      essential: true,
      analytics: true,
      affiliate: false,
    });
  });

  it("falls back to legacy 'accepted' = all on, when only the legacy flag exists", () => {
    localStorage.setItem("cookie-consent", "accepted");
    expect(getCookiePreferences()).toEqual({
      essential: true,
      analytics: true,
      affiliate: true,
    });
  });

  it("falls back to legacy 'declined' = deny-by-default, when only the legacy flag exists", () => {
    localStorage.setItem("cookie-consent", "declined");
    expect(getCookiePreferences()).toEqual({
      essential: true,
      analytics: false,
      affiliate: false,
    });
  });

  it("prefers the modern blob over the legacy flag when both are present", () => {
    localStorage.setItem("cookie-consent", "accepted");
    localStorage.setItem(
      "cookie-preferences",
      JSON.stringify({ essential: true, analytics: false, affiliate: true }),
    );
    expect(getCookiePreferences()).toEqual({
      essential: true,
      analytics: false,
      affiliate: true,
    });
  });

  it("returns the deny-by-default state when the stored blob is corrupt JSON", () => {
    localStorage.setItem("cookie-preferences", "{not-json");
    expect(getCookiePreferences()).toEqual({
      essential: true,
      analytics: false,
      affiliate: false,
    });
  });

  it("returns the deny-by-default state when localStorage throws (Safari private mode etc)", () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("simulated SecurityError");
    };
    try {
      expect(getCookiePreferences()).toEqual({
        essential: true,
        analytics: false,
        affiliate: false,
      });
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});
