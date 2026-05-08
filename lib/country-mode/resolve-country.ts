/**
 * Country Mode resolution — picks a single IntentCountryCode from the
 * five-level priority chain.
 *
 * 1. Explicit URL param (`?country=hong-kong`)
 * 2. User-selected country (persisted in the iv_intent_country cookie)
 * 3. Stored cookie / preference  ← collapses with (2), since user
 *    selection is what writes the cookie
 * 4. GeoIP detection (ISO 3166-1 alpha-2 from /api/geo)
 * 5. AU / Global fallback (returned as { code: null, source: null })
 *
 * The function is intentionally pure: callers pass raw values they read
 * from `searchParams` / `cookies()` / `headers()`, and get back a
 * resolved tuple. No I/O — trivial to unit-test.
 *
 * GeoIP suggests, never forces. Callers SHOULD only fall through to
 * the geo signal when neither url nor cookie has a value, AND should
 * prefer surfacing a soft-prompt UX (rather than silently switching
 * mode) when the resolved source is "geo". The data layer can't
 * enforce that — see components/country-mode/GeoSoftPrompt for the UX.
 */

import {
  intentCountryFromIso,
  intentCountryFromSlug,
  isKnownIntentCountry,
  type IntentCountryCode,
} from "../intent-context";

export type ResolvedCountrySource = "url" | "cookie" | "geo" | null;

export interface ResolvedCountry {
  code: IntentCountryCode | null;
  source: ResolvedCountrySource;
}

export interface ResolveCountryInputs {
  /**
   * Raw `?country=` URL param value. Expected as a country slug
   * ("hong-kong", "united-kingdom"). Intent codes ("hk") and ISO
   * codes ("HK") are intentionally NOT accepted — country-mode CTAs
   * always link with slugs, and accepting all three forms creates
   * ambiguity (e.g. "us" could be a malformed iso or an intent code).
   */
  urlParam?: string | null;
  /**
   * Raw `iv_intent_country` cookie value. Validated against the
   * supported set; arbitrary values fall through.
   */
  cookie?: string | null;
  /**
   * Raw ISO 3166-1 alpha-2 from /api/geo (case-insensitive). Returns
   * null when the country isn't in the supported set.
   */
  geoIso?: string | null;
}

export function resolveCountryFromContext(
  inputs: ResolveCountryInputs,
): ResolvedCountry {
  const fromUrl = intentCountryFromSlug(inputs.urlParam);
  if (fromUrl) return { code: fromUrl, source: "url" };

  if (inputs.cookie && isKnownIntentCountry(inputs.cookie)) {
    return { code: inputs.cookie, source: "cookie" };
  }

  const fromGeo = intentCountryFromIso(inputs.geoIso);
  if (fromGeo) return { code: fromGeo, source: "geo" };

  return { code: null, source: null };
}
