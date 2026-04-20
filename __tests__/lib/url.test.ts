import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getSiteUrl } from "@/lib/url";

describe("getSiteUrl", () => {
  const ORIG = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });
  afterEach(() => {
    if (ORIG === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = ORIG;
  });

  it("returns NEXT_PUBLIC_SITE_URL when set to a production URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.invest.com.au";
    expect(getSiteUrl()).toBe("https://staging.invest.com.au");
  });

  it("ignores a localhost NEXT_PUBLIC_SITE_URL even if set", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    expect(getSiteUrl()).toBe("https://invest.com.au");
  });

  it("falls back to request host over NEXT_PUBLIC_SITE_URL when env is localhost", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    expect(getSiteUrl("preview.invest.com.au")).toBe(
      "https://preview.invest.com.au",
    );
  });

  it("ignores a localhost request host", () => {
    expect(getSiteUrl("localhost:3000")).toBe("https://invest.com.au");
  });

  it("falls back to invest.com.au when no env and no host", () => {
    expect(getSiteUrl()).toBe("https://invest.com.au");
  });

  it("accepts null request host", () => {
    expect(getSiteUrl(null)).toBe("https://invest.com.au");
  });
});
