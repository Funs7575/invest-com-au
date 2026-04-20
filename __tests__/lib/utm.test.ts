import { describe, it, expect } from "vitest";
import { extractUtm, utmForInsert } from "@/lib/utm";

describe("extractUtm", () => {
  it("prefers body values over URL query params", () => {
    const url = new URL(
      "https://invest.com.au/?utm_source=google&utm_medium=cpc",
    );
    const r = extractUtm({ utm_source: "email", utm_medium: "newsletter" }, url);
    expect(r.utm_source).toBe("email");
    expect(r.utm_medium).toBe("newsletter");
  });

  it("falls back to URL query params when body values are missing", () => {
    const url = new URL(
      "https://invest.com.au/?utm_source=google&utm_medium=cpc&utm_campaign=launch",
    );
    const r = extractUtm({}, url);
    expect(r.utm_source).toBe("google");
    expect(r.utm_medium).toBe("cpc");
    expect(r.utm_campaign).toBe("launch");
  });

  it("returns all-null when neither body nor URL have any UTM values", () => {
    const r = extractUtm({}, new URL("https://invest.com.au/"));
    expect(r).toEqual({
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      referral_url: null,
    });
  });

  it("handles undefined body and url parameters", () => {
    expect(extractUtm()).toEqual({
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      referral_url: null,
    });
  });

  it("reads referral_url directly, falling through to 'referrer' alias", () => {
    expect(extractUtm({ referrer: "https://news.com" }).referral_url).toBe(
      "https://news.com",
    );
    expect(
      extractUtm({ referral_url: "https://direct.com" }).referral_url,
    ).toBe("https://direct.com");
  });

  it("prefers referral_url over referrer when both are set", () => {
    expect(
      extractUtm({
        referral_url: "https://canonical.com",
        referrer: "https://alias.com",
      }).referral_url,
    ).toBe("https://canonical.com");
  });
});

describe("utmForInsert", () => {
  it("drops null fields and keeps populated ones", () => {
    expect(
      utmForInsert({
        utm_source: "google",
        utm_medium: null,
        utm_campaign: "spring_launch",
        referral_url: null,
      }),
    ).toEqual({ utm_source: "google", utm_campaign: "spring_launch" });
  });

  it("truncates utm_source/utm_medium to 100 chars", () => {
    const long = "x".repeat(200);
    const out = utmForInsert({
      utm_source: long,
      utm_medium: long,
      utm_campaign: null,
      referral_url: null,
    });
    expect(out.utm_source?.length).toBe(100);
    expect(out.utm_medium?.length).toBe(100);
  });

  it("truncates utm_campaign to 200 chars", () => {
    const long = "x".repeat(500);
    const out = utmForInsert({
      utm_source: null,
      utm_medium: null,
      utm_campaign: long,
      referral_url: null,
    });
    expect(out.utm_campaign?.length).toBe(200);
  });

  it("truncates referral_url to 500 chars", () => {
    const long = "x".repeat(1000);
    const out = utmForInsert({
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      referral_url: long,
    });
    expect(out.referral_url?.length).toBe(500);
  });

  it("returns an empty object when every field is null", () => {
    expect(
      utmForInsert({
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        referral_url: null,
      }),
    ).toEqual({});
  });
});
