/**
 * Currency + number formatting.
 *
 * Pure helpers for:
 *   - Converting AUD cents to a target currency using the latest
 *     rate from `i18n_currency_rates`
 *   - Formatting numbers with the user's locale preference
 *   - Abbreviating large numbers ($1,234 → $1.2k, $1M → $1.2M)
 *
 * The foreign investor currency switcher reads a cookie/local
 * storage preference and calls these helpers to display AUD
 * prices in USD/GBP/EUR/NZD/SGD/HKD.
 */

export const SUPPORTED_CURRENCIES = [
  "AUD",
  "USD",
  "GBP",
  "EUR",
  "NZD",
  "SGD",
  "HKD",
  "JPY",
  "CNY",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export interface CurrencyRate {
  target: SupportedCurrency;
  rate: number;
  effectiveDate: string;
}

/**
 * Convert AUD cents → target currency (still in cents).
 * Pure. Returns null when the target rate is missing so the UI can
 * fall back to the AUD display.
 */
export function convertAudCents(
  audCents: number,
  target: SupportedCurrency,
  rates: CurrencyRate[],
): number | null {
  if (target === "AUD") return audCents;
  const match = rates.find((r) => r.target === target);
  if (!match || match.rate <= 0) return null;
  return Math.round(audCents * match.rate);
}

const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  AUD: "A$",
  USD: "US$",
  GBP: "£",
  EUR: "€",
  NZD: "NZ$",
  SGD: "S$",
  HKD: "HK$",
  JPY: "¥",
  CNY: "¥",
};

/**
 * Format a cents value as a currency string. Zero-decimal
 * currencies (JPY, KRW etc) render without cents.
 */
export function formatCurrency(
  cents: number,
  currency: SupportedCurrency,
  locale = "en-AU",
): string {
  const zeroDecimal = currency === "JPY" || currency === "CNY";
  const value = zeroDecimal ? Math.round(cents / 100) : cents / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: zeroDecimal ? 0 : 2,
    }).format(value);
  } catch {
    // Fallback for weird locales
    return `${CURRENCY_SYMBOLS[currency] || currency}${value.toLocaleString(locale)}`;
  }
}

/**
 * Abbreviate large currency amounts — useful for tight mobile UIs.
 *
 *   $1,234      → $1.2k
 *   $12,345     → $12.3k
 *   $1,234,567  → $1.2M
 */
export function abbreviateCurrency(
  cents: number,
  currency: SupportedCurrency,
): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const abs = Math.abs(cents);
  const sign = cents < 0 ? "-" : "";
  // Thresholds expressed in cents. $1,000 = 100_000 cents.
  if (abs < 100_000) {
    return `${sign}${symbol}${(abs / 100).toFixed(2)}`;
  }
  if (abs < 100_000_000) {
    return `${sign}${symbol}${(abs / 100_000).toFixed(1)}k`;
  }
  if (abs < 100_000_000_000) {
    return `${sign}${symbol}${(abs / 100_000_000).toFixed(1)}M`;
  }
  return `${sign}${symbol}${(abs / 100_000_000_000).toFixed(1)}B`;
}

/**
 * Normalise the currency preference string pulled from cookie /
 * URL query. Falls back to AUD for unknown values.
 */
export function resolveCurrencyPreference(raw: string | null | undefined): SupportedCurrency {
  const upper = (raw || "").toUpperCase() as SupportedCurrency;
  if (SUPPORTED_CURRENCIES.includes(upper)) return upper;
  return "AUD";
}
