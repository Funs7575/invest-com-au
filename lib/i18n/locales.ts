/**
 * Locale registry.
 *
 * Kept deliberately small — the cost of a poorly translated page is
 * higher than the cost of not translating it. Add a locale here only
 * when there's real content for it in every dictionary key below.
 *
 * Our two launch locales target the two largest non-English foreign
 * investor audiences hitting /foreign-investment/*:
 *
 *   zh — Mandarin Chinese, Simplified (zh-CN). Dominates FIRB search.
 *   ko — Korean (ko-KR). Active SIV / property search cohort.
 *
 * Do NOT add "zh-TW" or regional variants until we have native editors
 * confirming the Simplified/Traditional split matters for the audience.
 */
export const LOCALES = ["en", "zh", "ko"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Tag used on <html lang=…> and in hreflang link rels. */
export const BCP47_TAG: Record<Locale, string> = {
  en: "en-AU",
  zh: "zh-CN",
  ko: "ko-KR",
};

/** Human label rendered in the language switcher UI. */
export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  ko: "한국어",
};

export function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x);
}

/**
 * Strip a leading /zh or /ko prefix so we can look up the canonical
 * English path for hreflang + canonical URLs.
 */
export function stripLocalePrefix(pathname: string): {
  locale: Locale;
  path: string;
} {
  const match = pathname.match(/^\/(zh|ko)(\/.*)?$/);
  if (match) {
    const locale = match[1] as Locale;
    const path = match[2] || "/";
    return { locale, path };
  }
  return { locale: DEFAULT_LOCALE, path: pathname };
}

/**
 * Build the opposite: take an English canonical path and a target
 * locale, return the localised URL.
 */
export function localePath(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return path;
  return `/${locale}${path === "/" ? "" : path}`;
}
