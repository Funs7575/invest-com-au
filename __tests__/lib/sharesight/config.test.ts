import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getSharesightConfig, isSharesightConfigured } from "@/lib/sharesight/config";

describe("sharesight config", () => {
  beforeEach(() => {
    vi.stubEnv("SHARESIGHT_CLIENT_ID", "");
    vi.stubEnv("SHARESIGHT_CLIENT_SECRET", "");
    vi.stubEnv("SHARESIGHT_OAUTH_STATE_SECRET", "");
    vi.stubEnv("SHARESIGHT_API_BASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when client id is missing", () => {
    vi.stubEnv("SHARESIGHT_CLIENT_SECRET", "secret");
    vi.stubEnv("SHARESIGHT_OAUTH_STATE_SECRET", "state");
    expect(getSharesightConfig()).toBeNull();
    expect(isSharesightConfigured()).toBe(false);
  });

  it("returns null when state secret is missing", () => {
    vi.stubEnv("SHARESIGHT_CLIENT_ID", "client");
    vi.stubEnv("SHARESIGHT_CLIENT_SECRET", "secret");
    expect(getSharesightConfig()).toBeNull();
  });

  it("resolves a complete config and trims trailing slash on api base", () => {
    vi.stubEnv("SHARESIGHT_CLIENT_ID", "client123");
    vi.stubEnv("SHARESIGHT_CLIENT_SECRET", "secret456");
    vi.stubEnv("SHARESIGHT_OAUTH_STATE_SECRET", "stateSecret");
    vi.stubEnv("SHARESIGHT_API_BASE_URL", "https://api.sharesight.com.au/");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://invest.com.au/");

    const cfg = getSharesightConfig();
    expect(cfg).not.toBeNull();
    if (!cfg) return;
    expect(cfg.clientId).toBe("client123");
    expect(cfg.clientSecret).toBe("secret456");
    expect(cfg.apiBaseUrl).toBe("https://api.sharesight.com.au");
    expect(cfg.redirectUri).toBe("https://invest.com.au/api/account/sharesight/callback");
  });

  it("defaults to the .com.au regional base when SHARESIGHT_API_BASE_URL is unset", () => {
    vi.stubEnv("SHARESIGHT_CLIENT_ID", "client");
    vi.stubEnv("SHARESIGHT_CLIENT_SECRET", "secret");
    vi.stubEnv("SHARESIGHT_OAUTH_STATE_SECRET", "state");
    const cfg = getSharesightConfig();
    expect(cfg?.apiBaseUrl).toBe("https://api.sharesight.com.au");
  });
});
