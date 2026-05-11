/**
 * Consent helpers — single source of truth for checking analytics consent.
 *
 * Two consent pathways coexist:
 *   1. Cookie banner (simple) → localStorage["cookie-consent"] = "accepted"
 *   2. Granular preferences → localStorage["cookie-preferences"] = JSON with
 *      { analytics: boolean, ... }
 *
 * Both are checked so users who set granular preferences don't inadvertently
 * lose their choice if analytics scripts only read the simple key.
 */

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const granular = localStorage.getItem("cookie-preferences");
    if (granular) {
      const prefs = JSON.parse(granular) as Record<string, unknown>;
      return prefs["analytics"] === true;
    }
    return localStorage.getItem("cookie-consent") === "accepted";
  } catch {
    return false;
  }
}
