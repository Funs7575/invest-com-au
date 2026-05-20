/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getStoredUtm } from "@/components/UtmCapture";

/**
 * getStoredUtm() reads the UTM + referral context captured by the
 * UtmCapture component (rendered once in the root layout) and
 * surfaces it for inclusion in form submissions. Lead quality
 * scoring + attribution depend on this — a regression silently
 * drops attribution for every lead.
 */
describe("getStoredUtm", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("returns an empty object when no UTM params are stored", () => {
    expect(getStoredUtm()).toEqual({});
  });

  it("returns just utm_source when only that key is stored", () => {
    sessionStorage.setItem("utm_source", "google");
    expect(getStoredUtm()).toEqual({ utm_source: "google" });
  });

  it("returns all four keys when all are stored", () => {
    sessionStorage.setItem("utm_source", "google");
    sessionStorage.setItem("utm_medium", "cpc");
    sessionStorage.setItem("utm_campaign", "broker-promo-2026");
    sessionStorage.setItem("referral_url", "https://example.com/page");
    expect(getStoredUtm()).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "broker-promo-2026",
      referral_url: "https://example.com/page",
    });
  });

  it("omits keys whose value is empty string (falsy)", () => {
    sessionStorage.setItem("utm_source", "google");
    sessionStorage.setItem("utm_medium", "");
    expect(getStoredUtm()).toEqual({ utm_source: "google" });
  });

  it("returns referral_url alone when only referral_url is stored", () => {
    sessionStorage.setItem("referral_url", "https://foo.bar/");
    expect(getStoredUtm()).toEqual({ referral_url: "https://foo.bar/" });
  });

  it("doesn't include keys for other random sessionStorage entries", () => {
    sessionStorage.setItem("utm_source", "google");
    sessionStorage.setItem("some_other_key", "x");
    const result = getStoredUtm();
    expect(result).toEqual({ utm_source: "google" });
    expect(Object.keys(result)).not.toContain("some_other_key");
  });
});
