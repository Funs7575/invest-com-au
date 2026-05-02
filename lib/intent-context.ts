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
}

const KNOWN: Record<IntentCountryCode, IntentCountryMeta> = {
  uk: { slug: "united-kingdom",       label: "UK investors",         flag: "🇬🇧", currency: "GBP", hasDta: true },
  us: { slug: "united-states",        label: "US investors",         flag: "🇺🇸", currency: "USD", hasDta: true },
  cn: { slug: "china",                label: "Chinese investors",    flag: "🇨🇳", currency: "CNY", hasDta: true },
  in: { slug: "india",                label: "Indian investors",     flag: "🇮🇳", currency: "INR", hasDta: true },
  jp: { slug: "japan",                label: "Japanese investors",   flag: "🇯🇵", currency: "JPY", hasDta: true },
  sg: { slug: "singapore",            label: "Singapore investors",  flag: "🇸🇬", currency: "SGD", hasDta: true },
  hk: { slug: "hong-kong",            label: "HK investors",         flag: "🇭🇰", currency: "HKD", hasDta: false },
  kr: { slug: "south-korea",          label: "Korean investors",     flag: "🇰🇷", currency: "KRW", hasDta: true },
  my: { slug: "malaysia",             label: "Malaysian investors",  flag: "🇲🇾", currency: "MYR", hasDta: true },
  nz: { slug: "new-zealand",          label: "NZ investors",         flag: "🇳🇿", currency: "NZD", hasDta: true },
  ae: { slug: "united-arab-emirates", label: "UAE investors",        flag: "🇦🇪", currency: "AED", hasDta: true },
  sa: { slug: "saudi-arabia",         label: "Saudi investors",      flag: "🇸🇦", currency: "SAR", hasDta: false },
};

const CODE_BY_SLUG: Record<string, IntentCountryCode> = Object.fromEntries(
  (Object.entries(KNOWN) as [IntentCountryCode, IntentCountryMeta][]).map(
    ([code, meta]) => [meta.slug, code],
  ),
);

export function isKnownIntentCountry(value: string): value is IntentCountryCode {
  return value in KNOWN;
}

export function intentCountryFromSlug(
  slug: string | null | undefined,
): IntentCountryCode | null {
  if (!slug) return null;
  return CODE_BY_SLUG[slug] ?? null;
}

export function intentCountryMeta(code: IntentCountryCode): IntentCountryMeta {
  return KNOWN[code];
}

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
