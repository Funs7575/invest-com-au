/**
 * Consent helpers — single source of truth for checking analytics consent.
 *
 * Consent is persisted three ways so it can be read in every context:
 *   1. Cookie banner (simple) → localStorage["cookie-consent"] = "accepted"
 *   2. Granular preferences → localStorage["cookie-preferences"] = JSON with
 *      { analytics: boolean, ... }
 *   3. Mirror cookie `iv_consent` (audit §5 #20) — so the SERVER and the very
 *      first client render can read consent synchronously instead of waiting
 *      for a localStorage read in an effect (which let pixels flash on before
 *      the check resolved). Value: "analytics" when analytics is granted,
 *      else "essential".
 *
 * localStorage remains the source of truth for the banner UI; the cookie is a
 * read-mirror for SSR + first-paint gating.
 */

export const CONSENT_COOKIE = "iv_consent";
const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Build the Set-Cookie value the banner writes when consent is saved. */
export function buildConsentCookie(analyticsGranted: boolean): string {
  const value = analyticsGranted ? "analytics" : "essential";
  return `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** True if a raw `iv_consent` cookie value grants analytics. */
export function consentCookieGrantsAnalytics(value: string | undefined | null): boolean {
  return value === "analytics";
}

/** Client-side: read the consent cookie synchronously (no localStorage wait). */
export function readConsentCookieClient(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|; )iv_consent=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const granular = localStorage.getItem("cookie-preferences");
    if (granular) {
      const prefs = JSON.parse(granular) as Record<string, unknown>;
      return prefs["analytics"] === true;
    }
    if (localStorage.getItem("cookie-consent") === "accepted") return true;
    // Fall back to the mirror cookie (covers first paint before localStorage
    // is read, and cross-tab cases).
    return consentCookieGrantsAnalytics(readConsentCookieClient());
  } catch {
    return consentCookieGrantsAnalytics(readConsentCookieClient());
  }
}
