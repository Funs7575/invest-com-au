/**
 * Intent context — "I am a UK investor" sticks for the session.
 *
 * When a user lands on a /foreign-investment/<country> page we set
 * `iv_intent_country` (90-day TTL). Other public pages that have a
 * country dimension (/compare/non-residents, /advisors, /invest) read
 * the cookie to default their filter; the user can always clear it
 * via the badge that surfaces on those pages.
 *
 * Why a cookie and not a query param: a query param is per-link; the
 * cookie persists across navigation, so when the UK user clicks
 * Compare → Advisors → Invest, the filter follows them without each
 * page having to forward the param. The badge keeps it visible and
 * the clear action is one click away — discoverable, not magic.
 */

import { cookies } from "next/headers";

export const INTENT_COUNTRY_COOKIE = "iv_intent_country";
const TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

/**
 * Canonical 2-letter codes for countries with a foreign-investment hub.
 * Keep in sync with the routes under app/foreign-investment/<country>/.
 */
export type IntentCountryCode =
  | "uk"
  | "us"
  | "cn"
  | "in"
  | "jp"
  | "sg"
  | "hk"
  | "kr"
  | "my"
  | "nz"
  | "ae"
  | "sa";

interface IntentCountryMeta {
  /** Folder name under app/foreign-investment/ */
  slug: string;
  /** UI label, e.g. "UK investors" */
  label: string;
  /** Emoji flag for badges */
  flag: string;
  /** ISO 4217 currency the user is most likely sending from */
  currency: string;
  /** ATO non-resident DTA status — quick UX hint, not legal advice */
  hasDta: boolean;
  /**
   * Answer key the `investor_country` quiz question stores for this country.
   * Mirrors the `key` values in `UNIFIED_QUESTIONS.investor_country.options`
   * in app/quiz/page.tsx — they're snake_case, not the 2-letter intent code.
   *
   * Some quiz keys aren't yet rendered as options (jp, kr, sa) — Step 12 adds
   * those options. The map is the single source of truth so the option list
   * and the link prefill agree.
   */
  quizKey: string;
  /**
   * ISO 3166-1 alpha-2 code, uppercase. Matches the `country` field that
   * `/api/geo` returns from `x-vercel-ip-country`. Note `uk` → "GB" — UK is
   * not an official ISO alpha-2 (it's an exceptionally-reserved alias),
   * Vercel returns "GB".
   */
  iso: string;
}

const KNOWN: Record<IntentCountryCode, IntentCountryMeta> = {
  uk: { slug: "united-kingdom",       label: "UK investors",         flag: "🇬🇧", currency: "GBP", hasDta: true,  quizKey: "uk",            iso: "GB" },
  us: { slug: "united-states",        label: "US investors",         flag: "🇺🇸", currency: "USD", hasDta: true,  quizKey: "usa",           iso: "US" },
  cn: { slug: "china",                label: "Chinese investors",    flag: "🇨🇳", currency: "CNY", hasDta: true,  quizKey: "china",         iso: "CN" },
  in: { slug: "india",                label: "Indian investors",     flag: "🇮🇳", currency: "INR", hasDta: true,  quizKey: "india",         iso: "IN" },
  jp: { slug: "japan",                label: "Japanese investors",   flag: "🇯🇵", currency: "JPY", hasDta: true,  quizKey: "japan",         iso: "JP" },
  sg: { slug: "singapore",            label: "Singapore investors",  flag: "🇸🇬", currency: "SGD", hasDta: true,  quizKey: "singapore",     iso: "SG" },
  hk: { slug: "hong-kong",            label: "HK investors",         flag: "🇭🇰", currency: "HKD", hasDta: false, quizKey: "hong_kong",     iso: "HK" },
  kr: { slug: "south-korea",          label: "Korean investors",     flag: "🇰🇷", currency: "KRW", hasDta: true,  quizKey: "south_korea",   iso: "KR" },
  my: { slug: "malaysia",             label: "Malaysian investors",  flag: "🇲🇾", currency: "MYR", hasDta: true,  quizKey: "malaysia",      iso: "MY" },
  nz: { slug: "new-zealand",          label: "NZ investors",         flag: "🇳🇿", currency: "NZD", hasDta: true,  quizKey: "new_zealand",   iso: "NZ" },
  ae: { slug: "united-arab-emirates", label: "UAE investors",        flag: "🇦🇪", currency: "AED", hasDta: true,  quizKey: "uae",           iso: "AE" },
  sa: { slug: "saudi-arabia",         label: "Saudi investors",      flag: "🇸🇦", currency: "SAR", hasDta: false, quizKey: "saudi_arabia",  iso: "SA" },
};

const CODE_BY_SLUG: Record<string, IntentCountryCode> = Object.fromEntries(
  (Object.entries(KNOWN) as [IntentCountryCode, IntentCountryMeta][]).map(
    ([code, meta]) => [meta.slug, code],
  ),
);

const CODE_BY_QUIZ_KEY: Record<string, IntentCountryCode> = Object.fromEntries(
  (Object.entries(KNOWN) as [IntentCountryCode, IntentCountryMeta][]).map(
    ([code, meta]) => [meta.quizKey, code],
  ),
);

const CODE_BY_ISO: Record<string, IntentCountryCode> = Object.fromEntries(
  (Object.entries(KNOWN) as [IntentCountryCode, IntentCountryMeta][]).map(
    ([code, meta]) => [meta.iso, code],
  ),
);

export function isKnownIntentCountry(value: string): value is IntentCountryCode {
  // Use hasOwnProperty rather than `in` so prototype-chain keys
  // ("__proto__", "toString", "constructor") don't slip past the type
  // guard and reach setIntentCountryAction or intentCountryMeta — which
  // would either crash or write a garbage cookie.
  return Object.prototype.hasOwnProperty.call(KNOWN, value);
}

export function intentCountryFromSlug(
  slug: string | null | undefined,
): IntentCountryCode | null {
  if (!slug) return null;
  return CODE_BY_SLUG[slug] ?? null;
}

/**
 * Resolve a quiz `investor_country` answer key (e.g. "hong_kong", "uae")
 * back to its `IntentCountryCode`. Returns null for unknown keys including
 * the "other" option, which has no canonical country.
 */
export function intentCountryFromQuizKey(
  key: string | null | undefined,
): IntentCountryCode | null {
  if (!key) return null;
  return CODE_BY_QUIZ_KEY[key] ?? null;
}

/**
 * Resolve an ISO 3166-1 alpha-2 code (case-insensitive) to an
 * `IntentCountryCode`. Used by the GeoIP soft-prompt path: `/api/geo`
 * returns the raw header value, which is uppercase but we accept either.
 * Returns null for any country not in the supported set.
 */
export function intentCountryFromIso(
  iso: string | null | undefined,
): IntentCountryCode | null {
  if (!iso) return null;
  return CODE_BY_ISO[iso.toUpperCase()] ?? null;
}

export function intentCountryMeta(code: IntentCountryCode): IntentCountryMeta {
  return KNOWN[code];
}

/** Convenience: quiz answer key for an `IntentCountryCode`. */
export function quizKeyForIntentCode(code: IntentCountryCode): string {
  return KNOWN[code].quizKey;
}

/** Convenience: ISO 3166-1 alpha-2 (uppercase) for an `IntentCountryCode`. */
export function isoForIntentCode(code: IntentCountryCode): string {
  return KNOWN[code].iso;
}

/** All supported `IntentCountryCode` values, in insertion order. */
export const INTENT_COUNTRY_CODES = Object.keys(KNOWN) as readonly IntentCountryCode[];

/**
 * Read the user's intent country from the cookie. Returns null if
 * the cookie isn't set or if the value isn't a known country code.
 *
 * Server-side only — uses next/headers cookies().
 */
export async function getIntentCountry(): Promise<IntentCountryCode | null> {
  const c = await cookies();
  const raw = c.get(INTENT_COUNTRY_COOKIE)?.value;
  if (!raw) return null;
  return isKnownIntentCountry(raw) ? raw : null;
}

/**
 * Cookie max-age, exposed for callers that need to pass it through to
 * a Set-Cookie header (e.g. server actions, route handlers).
 */
export const INTENT_COUNTRY_TTL_SECONDS = TTL_SECONDS;
