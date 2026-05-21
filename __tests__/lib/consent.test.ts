// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  hasAnalyticsConsent,
  buildConsentCookie,
  consentCookieGrantsAnalytics,
  CONSENT_COOKIE,
} from "@/lib/consent";

describe("hasAnalyticsConsent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns false when no consent key is set", () => {
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("returns true when simple cookie-consent key is accepted", () => {
    localStorage.setItem("cookie-consent", "accepted");
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it("returns false when simple cookie-consent key is declined", () => {
    localStorage.setItem("cookie-consent", "declined");
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("returns true when granular preferences have analytics: true", () => {
    localStorage.setItem("cookie-preferences", JSON.stringify({ analytics: true, marketing: false }));
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it("returns false when granular preferences have analytics: false", () => {
    localStorage.setItem("cookie-preferences", JSON.stringify({ analytics: false }));
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("granular preferences take precedence over simple consent key", () => {
    localStorage.setItem("cookie-consent", "accepted");
    localStorage.setItem("cookie-preferences", JSON.stringify({ analytics: false }));
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("returns false when granular preferences JSON is malformed", () => {
    localStorage.setItem("cookie-preferences", "not-json{{{");
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("returns false in SSR context (window undefined)", () => {
    const originalWindow = global.window;
    // @ts-expect-error deliberately removing window to simulate SSR
    delete global.window;
    expect(hasAnalyticsConsent()).toBe(false);
    global.window = originalWindow;
  });
});

describe("SSR-readable consent cookie (§5 #20)", () => {
  beforeEach(() => {
    localStorage.clear();
    // clear any iv_consent cookie between tests
    document.cookie = `${CONSENT_COOKIE}=; Path=/; Max-Age=0`;
  });

  it("buildConsentCookie encodes analytics grant", () => {
    expect(buildConsentCookie(true)).toContain(`${CONSENT_COOKIE}=analytics`);
    expect(buildConsentCookie(true)).toContain("SameSite=Lax");
    expect(buildConsentCookie(false)).toContain(`${CONSENT_COOKIE}=essential`);
  });

  it("consentCookieGrantsAnalytics only true for 'analytics'", () => {
    expect(consentCookieGrantsAnalytics("analytics")).toBe(true);
    expect(consentCookieGrantsAnalytics("essential")).toBe(false);
    expect(consentCookieGrantsAnalytics(undefined)).toBe(false);
  });

  it("hasAnalyticsConsent falls back to the mirror cookie when localStorage is empty", () => {
    document.cookie = `${CONSENT_COOKIE}=analytics; Path=/`;
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it("mirror cookie 'essential' does not grant analytics", () => {
    document.cookie = `${CONSENT_COOKIE}=essential; Path=/`;
    expect(hasAnalyticsConsent()).toBe(false);
  });
});
