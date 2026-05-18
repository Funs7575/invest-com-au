import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  getSharesightConfig,
  isSharesightConfigured,
} from "@/lib/sharesight/config";

describe("sharesight config", () => {
  beforeEach(() => {
    delete process.env.SHARESIGHT_CLIENT_ID;
    delete process.env.SHARESIGHT_CLIENT_SECRET;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });
  afterEach(() => {
    delete process.env.SHARESIGHT_CLIENT_ID;
    delete process.env.SHARESIGHT_CLIENT_SECRET;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("isSharesightConfigured returns false when env is missing", () => {
    expect(isSharesightConfigured()).toBe(false);
  });

  it("isSharesightConfigured returns true once both client vars are set", () => {
    process.env.SHARESIGHT_CLIENT_ID = "cid";
    process.env.SHARESIGHT_CLIENT_SECRET = "csec";
    expect(isSharesightConfigured()).toBe(true);
  });

  it("getSharesightConfig throws sharesight_not_configured when client vars missing", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.test";
    expect(() => getSharesightConfig()).toThrow("sharesight_not_configured");
  });

  it("getSharesightConfig throws sharesight_redirect_uri_unresolved when site URL missing", () => {
    process.env.SHARESIGHT_CLIENT_ID = "cid";
    process.env.SHARESIGHT_CLIENT_SECRET = "csec";
    expect(() => getSharesightConfig()).toThrow(/redirect_uri_unresolved/);
  });

  it("produces a redirect URI derived from NEXT_PUBLIC_SITE_URL", () => {
    process.env.SHARESIGHT_CLIENT_ID = "cid";
    process.env.SHARESIGHT_CLIENT_SECRET = "csec";
    process.env.NEXT_PUBLIC_SITE_URL = "https://invest.com.au";
    const c = getSharesightConfig();
    expect(c.redirectUri).toBe(
      "https://invest.com.au/api/account/holdings/sharesight/callback",
    );
    expect(c.clientId).toBe("cid");
    expect(c.clientSecret).toBe("csec");
    expect(c.scope).toBe("read_portfolios");
  });

  it("strips a trailing slash from NEXT_PUBLIC_SITE_URL", () => {
    process.env.SHARESIGHT_CLIENT_ID = "cid";
    process.env.SHARESIGHT_CLIENT_SECRET = "csec";
    process.env.NEXT_PUBLIC_SITE_URL = "https://invest.com.au/";
    expect(getSharesightConfig().redirectUri).toBe(
      "https://invest.com.au/api/account/holdings/sharesight/callback",
    );
  });
});
